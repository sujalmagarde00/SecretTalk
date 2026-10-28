package com.secretalk.backend.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.secretalk.backend.dto.ChatMessageDTO;
import com.secretalk.backend.entity.User;
import com.secretalk.backend.service.ChatService;
import com.secretalk.backend.service.PresenceService;
import com.secretalk.backend.service.CallHistoryService;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import java.security.Principal;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class ChatWebSocketHandler extends TextWebSocketHandler {
    private final ObjectMapper mapper;
    private final ChatService chatService;
    private final PresenceService presenceService;
    private final CallHistoryService callHistoryService;
    private final ConcurrentHashMap<String, Set<WebSocketSession>> sessionsByUser = new ConcurrentHashMap<>();
    public ChatWebSocketHandler(ChatService chatService, ObjectMapper mapper, PresenceService presenceService, CallHistoryService callHistoryService) { this.chatService = chatService; this.mapper = mapper; this.presenceService = presenceService; this.callHistoryService = callHistoryService; }

    @Override public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        Principal principal = session.getPrincipal();
        if (principal == null) { session.close(CloseStatus.NOT_ACCEPTABLE.withReason("Login required")); return; }
        sessionsByUser.computeIfAbsent(principal.getName(), key -> ConcurrentHashMap.newKeySet()).add(session);
        presenceService.connected(principal.getName());
        User current = chatService.findUser(principal.getName());
        ObjectNode presence = mapper.createObjectNode(); presence.put("type", "presence"); presence.put("userId", current.getId()); presence.put("username", current.getUsername()); presence.put("online", true);
        for (String other : sessionsByUser.keySet()) { sendToUser(other, presence); }
        ObjectNode connected = mapper.createObjectNode(); connected.put("type", "connected");
        send(session, connected);
    }

    @Override protected void handleTextMessage(WebSocketSession session, TextMessage textMessage) throws Exception {
        Principal principal = session.getPrincipal();
        if (principal == null) { session.close(CloseStatus.NOT_ACCEPTABLE); return; }
        JsonNode input;
        try { input = mapper.readTree(textMessage.getPayload()); }
        catch (Exception ex) { sendError(session, "Invalid message format"); return; }
        String type = input.path("type").asText("");
        User sender = chatService.findUser(principal.getName());
        if ("seen".equals(type)) {
            JsonNode idsNode = input.path("messageIds");
            java.util.List<Long> ids = new java.util.ArrayList<>();
            if (idsNode.isArray()) idsNode.forEach(n -> { if (n.canConvertToLong()) ids.add(n.asLong()); });
            java.util.List<com.secretalk.backend.dto.ChatMessageDTO> before = new java.util.ArrayList<>();
            for (Long id : ids) try { before.add(chatService.getAccessibleMessage(principal.getName(), id)); } catch (Exception ignored) {}
            java.util.List<Long> deleted = chatService.markSeen(principal.getName(), ids);
            for (var m : before) {
                ObjectNode seenEvent = mapper.createObjectNode(); seenEvent.put("type", "message-seen"); seenEvent.put("messageId", m.id()); seenEvent.put("seenAt", java.time.LocalDateTime.now().toString());
                try { sendToUser(m.senderUsername(), seenEvent); } catch (Exception ignored) {}
            }
            for (var m : before) if (deleted.contains(m.id())) {
                ObjectNode gone = mapper.createObjectNode(); gone.put("type", "message-deleted"); gone.put("messageId", m.id());
                sendToUser(m.senderUsername(), gone);
                try { sendToUser(chatService.findUserById(m.recipientId()).getUsername(), gone); } catch (Exception ignored) {}
            }
            return;
        }
        if ("delete-message".equals(type)) {
            long messageId = input.path("messageId").asLong(-1);
            try {
                var message = chatService.getAccessibleMessage(principal.getName(), messageId);
                if (!message.senderId().equals(sender.getId())) { sendError(session, "Only the sender can delete this message"); return; }
                chatService.deleteMessage(principal.getName(), messageId);
                ObjectNode gone = mapper.createObjectNode(); gone.put("type", "message-deleted"); gone.put("messageId", messageId);
                sendToUser(message.senderUsername(), gone);
                try { sendToUser(chatService.findUserById(message.recipientId()).getUsername(), gone); } catch (Exception ignored) {}
            } catch (Exception ex) { sendError(session, "Message could not be deleted"); }
            return;
        }
        if ("attachment-notify".equals(type)) {
            long messageId = input.path("messageId").asLong(-1);
            try {
                var message = chatService.getAccessibleMessage(principal.getName(), messageId);
                if (!message.senderId().equals(sender.getId())) { sendError(session, "You cannot notify another user's attachment"); return; }
                User recipient = chatService.findUserById(message.recipientId());
                ObjectNode event = mapper.createObjectNode(); event.put("type", "chat"); event.put("senderId", sender.getId()); event.put("senderUsername", sender.getUsername()); event.put("recipientId", recipient.getId()); event.set("message", mapper.valueToTree(message));
                sendToUser(recipient.getUsername(), event); send(session, event);
            } catch (Exception ex) { sendError(session, "Attachment notification failed"); }
            return;
        }
        long recipientId = input.path("recipientId").asLong(-1);
        if (recipientId <= 0) { sendError(session, "Recipient is required"); return; }
        User recipient;
        try { recipient = chatService.findUserById(recipientId); }
        catch (Exception ex) { sendError(session, "Recipient not found"); return; }
        if (sender.getId().equals(recipient.getId())) { sendError(session, "Invalid recipient"); return; }

        ObjectNode outgoing = mapper.createObjectNode();
        outgoing.put("type", type);
        outgoing.put("senderId", sender.getId());
        outgoing.put("senderUsername", sender.getUsername());
        outgoing.put("recipientId", recipient.getId());

        if ("chat".equals(type)) {
            String content = input.path("content").asText("");
            try {
                String expiryMode = input.path("expiryMode").asText("NEVER");
                long customSeconds = input.path("customSeconds").asLong(-1);
                ChatMessageDTO saved = chatService.save(principal.getName(), recipientId, content, expiryMode, customSeconds > 0 ? customSeconds : null);
                outgoing.put("type", "chat");
                outgoing.set("message", mapper.valueToTree(saved));
                outgoing.put("expiryMode", saved.expiryMode());
                outgoing.put("content", saved.content());
                outgoing.put("id", saved.id());
                outgoing.put("createdAt", saved.createdAt().toString());
            } catch (Exception ex) { sendError(session, ex.getMessage() == null ? "Message could not be saved" : ex.getMessage()); return; }
        } else if (type.startsWith("call-") && ("call-offer".equals(type) || "call-answer".equals(type) || "call-ice".equals(type) || "call-end".equals(type) || "call-reject".equals(type))) {
            if (input.has("payload")) outgoing.set("payload", input.get("payload"));
            if (input.has("mode")) outgoing.set("mode", input.get("mode"));
            try { if ("call-offer".equals(type)) callHistoryService.started(principal.getName(), recipientId, input.path("mode").asText("audio")); if ("call-answer".equals(type)) callHistoryService.ended(principal.getName(), recipientId, "ANSWERED"); if ("call-end".equals(type)) callHistoryService.ended(principal.getName(), recipientId, "COMPLETED"); if ("call-reject".equals(type)) callHistoryService.ended(principal.getName(), recipientId, "DECLINED"); } catch (Exception ignored) {}
        } else { sendError(session, "Unsupported event"); return; }

        sendToUser(recipient.getUsername(), outgoing);
        if ("chat".equals(type)) send(session, outgoing);
    }

    @Override public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        Principal principal = session.getPrincipal();
        if (principal == null) return;
        Set<WebSocketSession> sessions = sessionsByUser.get(principal.getName());
        if (sessions != null) { sessions.remove(session); if (sessions.isEmpty()) { sessionsByUser.remove(principal.getName(), sessions); presenceService.disconnected(principal.getName()); try { User u=chatService.findUser(principal.getName()); ObjectNode gone=mapper.createObjectNode();gone.put("type","presence");gone.put("userId",u.getId());gone.put("username",u.getUsername());gone.put("online",false);gone.put("lastSeenAt",java.time.LocalDateTime.now().toString());for(String other:sessionsByUser.keySet())sendToUser(other,gone);}catch(Exception ignored){} } }
    }

    private void sendToUser(String username, JsonNode message) {
        Set<WebSocketSession> sessions = sessionsByUser.get(username);
        if (sessions != null) for (WebSocketSession target : sessions) send(target, message);
    }
    private void send(WebSocketSession session, JsonNode message) {
        if (session.isOpen()) try { synchronized (session) { session.sendMessage(new TextMessage(mapper.writeValueAsString(message))); } }
        catch (Exception ignored) { }
    }
    private void sendError(WebSocketSession session, String message) {
        ObjectNode error = mapper.createObjectNode(); error.put("type", "error"); error.put("message", message); send(session, error);
    }
}
