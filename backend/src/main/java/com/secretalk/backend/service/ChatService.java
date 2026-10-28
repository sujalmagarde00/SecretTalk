package com.secretalk.backend.service;

import com.secretalk.backend.dto.ChatMessageDTO;
import com.secretalk.backend.dto.ConversationDTO;
import com.secretalk.backend.entity.ChatMessage;
import com.secretalk.backend.entity.ChatClear;
import com.secretalk.backend.entity.User;
import com.secretalk.backend.repository.ChatMessageRepository;
import com.secretalk.backend.repository.ChatClearRepository;
import com.secretalk.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class ChatService {
    private final ChatMessageRepository messages;
    private final UserRepository users;
    private final ChatClearRepository clears;
    private final Path uploadRoot;

    public ChatService(ChatMessageRepository messages, UserRepository users, ChatClearRepository clears,
                       @Value("${secretalk.upload-dir:uploads}") String uploadDir) {
        this.messages = messages; this.users = users; this.clears = clears; this.uploadRoot = Paths.get(uploadDir).toAbsolutePath().normalize();
    }

    @Transactional(readOnly = true)
    public List<ChatMessageDTO> history(String username, Long otherUserId) {
        User me = findUser(username);
        User other = users.findById(otherUserId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        LocalDateTime clearedAt = clears.findByUser_IdAndOtherUser_Id(me.getId(), other.getId()).map(ChatClear::getClearedAt).orElse(null);
        return messages.findConversation(me.getId(), other.getId(), LocalDateTime.now()).stream()
                .filter(m -> clearedAt == null || m.getCreatedAt().isAfter(clearedAt))
                .map(ChatMessageDTO::from).toList();
    }

    @Transactional(readOnly = true)
    public List<ConversationDTO> conversations(String username) {
        User me = findUser(username);
        Map<Long, ConversationDTO> latest = new LinkedHashMap<>();
        for (ChatMessage m : messages.findRecentForUser(me.getId())) {
            if (m.getExpiresAt() != null && m.getExpiresAt().isBefore(LocalDateTime.now())) continue;
            User other = m.getSender().getId().equals(me.getId()) ? m.getRecipient() : m.getSender();
            LocalDateTime clearedAt = clears.findByUser_IdAndOtherUser_Id(me.getId(), other.getId()).map(ChatClear::getClearedAt).orElse(null);
            if (clearedAt != null && !m.getCreatedAt().isAfter(clearedAt)) continue;
            latest.putIfAbsent(other.getId(), new ConversationDTO(other.getId(), other.getUsername(),
                    m.getAttachmentName() != null ? "📎 " + m.getAttachmentName() : m.getContent(), m.getCreatedAt(), m.getId()));
        }
        return new ArrayList<>(latest.values());
    }


    @Transactional
    public void clearConversation(String username, Long otherUserId) {
        User me = findUser(username);
        User other = users.findById(otherUserId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        if (me.getId().equals(other.getId())) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid conversation");
        ChatClear clear = clears.findByUser_IdAndOtherUser_Id(me.getId(), other.getId()).orElseGet(ChatClear::new);
        clear.setUser(me); clear.setOtherUser(other); clear.setClearedAt(LocalDateTime.now()); clears.save(clear);
    }

    @Transactional
    public ChatMessageDTO save(String senderUsername, Long recipientId, String content, String expiryMode, Long customSeconds) {
        if (content == null || content.isBlank() || content.length() > 4000)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Message must be 1 to 4000 characters");
        ChatMessage message = baseMessage(senderUsername, recipientId, expiryMode, customSeconds);
        message.setContent(content.trim());
        return ChatMessageDTO.from(messages.save(message));
    }

    @Transactional
    public ChatMessageDTO saveAttachment(String senderUsername, Long recipientId, MultipartFile file, String expiryMode, Long customSeconds) {
        if (file == null || file.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a file first");
        if (file.getSize() > 10L * 1024 * 1024) throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Attachment limit is 10 MB");
        String original = Optional.ofNullable(file.getOriginalFilename()).orElse("attachment").replaceAll("[\\\\/\\r\\n\\t]", "_");
        String mime = Optional.ofNullable(file.getContentType()).orElse("application/octet-stream");
        if (!(mime.startsWith("image/") || mime.startsWith("video/") || mime.startsWith("audio/") || mime.equals("application/pdf") || mime.startsWith("text/") || mime.equals("application/zip") || mime.equals("application/octet-stream") || mime.contains("word") || mime.contains("spreadsheet")))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This file type is not supported");
        ChatMessage message = baseMessage(senderUsername, recipientId, expiryMode, customSeconds);
        try {
            Files.createDirectories(uploadRoot);
            String storedName = UUID.randomUUID() + "-" + original;
            Path destination = uploadRoot.resolve(storedName).normalize();
            if (!destination.startsWith(uploadRoot)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid file name");
            file.transferTo(destination);
            message.setContent(""); message.setAttachmentName(original); message.setAttachmentType(mime);
            message.setAttachmentSize(file.getSize()); message.setAttachmentPath(destination.toString());
            return ChatMessageDTO.from(messages.save(message));
        } catch (IOException e) { throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not save attachment"); }
    }

    private ChatMessage baseMessage(String senderUsername, Long recipientId, String expiryMode, Long customSeconds) {
        User sender = findUser(senderUsername);
        User recipient = users.findById(recipientId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Recipient not found"));
        if (sender.getId().equals(recipient.getId())) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You cannot message yourself");
        ChatMessage m = new ChatMessage(); m.setSender(sender); m.setRecipient(recipient);
        String mode = expiryMode == null ? "NEVER" : expiryMode.toUpperCase(Locale.ROOT);
        switch (mode) {
            case "NEVER" -> { m.setExpiryMode("NEVER"); m.setExpiresAt(null); }
            case "AFTER_SEEN" -> { m.setExpiryMode("AFTER_SEEN"); m.setExpiresAt(null); }
            case "SECONDS_30" -> { m.setExpiryMode("SECONDS_30"); m.setExpiresAt(LocalDateTime.now().plusSeconds(30)); }
            case "CUSTOM" -> {
                if (customSeconds == null || customSeconds < 10 || customSeconds > 2_592_000)
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Custom expiry must be between 10 seconds and 30 days");
                m.setExpiryMode("CUSTOM"); m.setExpiresAt(LocalDateTime.now().plusSeconds(customSeconds));
            }
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid message expiry mode");
        }
        return m;
    }

    @Transactional
    public List<Long> markSeen(String username, List<Long> ids) {
        if (ids == null || ids.isEmpty()) return List.of();
        User me = findUser(username); List<Long> deleted = new ArrayList<>();
        for (ChatMessage m : messages.findIncomingByIds(ids, me.getId())) {
            m.setSeenAt(LocalDateTime.now());
            if ("AFTER_SEEN".equals(m.getExpiryMode())) { deleted.add(m.getId()); messages.delete(m); }
        }
        return deleted;
    }

    @Transactional
    public void deleteMessage(String username, Long id) {
        User me = findUser(username);
        ChatMessage m = messages.findAccessible(id, me.getId()).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Message not found"));
        if (!m.getSender().getId().equals(me.getId())) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the sender can delete this message");
        if (m.getAttachmentPath() != null) try { Files.deleteIfExists(Paths.get(m.getAttachmentPath())); } catch (IOException ignored) {}
        messages.delete(m);
    }

    @Transactional(readOnly = true)
    public Path attachmentPath(String username, Long id) {
        User me = findUser(username);
        ChatMessage m = messages.findAccessible(id, me.getId()).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Attachment not found"));
        if (m.getAttachmentPath() == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Attachment not found");
        Path path = Paths.get(m.getAttachmentPath()).toAbsolutePath().normalize();
        if (!path.startsWith(uploadRoot) || !Files.exists(path)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Attachment file not found");
        return path;
    }

    @Transactional
    @Scheduled(fixedDelay = 5000)
    public void deleteExpiredMessages() {
        for (ChatMessage m : messages.findByExpiresAtBefore(LocalDateTime.now())) {
            if (m.getAttachmentPath() != null) try { Files.deleteIfExists(Paths.get(m.getAttachmentPath())); } catch (IOException ignored) {}
            messages.delete(m);
        }
    }

    public User findUser(String username) {
        return users.findByUsernameIgnoreCase(username).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User session is invalid"));
    }
    public User findUserById(Long id) {
        return users.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }
    @Transactional(readOnly = true)
    public ChatMessageDTO getAccessibleMessage(String username, Long id) {
        User me = findUser(username);
        return ChatMessageDTO.from(messages.findAccessible(id, me.getId()).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Message not found")));
    }
}
