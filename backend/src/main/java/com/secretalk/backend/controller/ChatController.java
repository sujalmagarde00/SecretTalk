package com.secretalk.backend.controller;

import com.secretalk.backend.dto.ChatMessageDTO;
import com.secretalk.backend.dto.ConversationDTO;
import com.secretalk.backend.service.ChatService;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.nio.file.Path;
import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
public class ChatController {
    private final ChatService chatService;
    public ChatController(ChatService chatService) { this.chatService = chatService; }

    @GetMapping("/conversations")
    public List<ConversationDTO> conversations(Principal principal) { return chatService.conversations(principal.getName()); }

    @DeleteMapping("/conversations/{userId}")
    public ResponseEntity<Void> clearConversation(@PathVariable Long userId, Principal principal) {
        chatService.clearConversation(principal.getName(), userId); return ResponseEntity.noContent().build();
    }

    @GetMapping("/{userId}/messages")
    public List<ChatMessageDTO> history(@PathVariable Long userId, Principal principal) { return chatService.history(principal.getName(), userId); }

    @PostMapping(value = "/{userId}/attachments", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ChatMessageDTO upload(@PathVariable Long userId, @RequestParam("file") MultipartFile file,
                                 @RequestParam(defaultValue = "NEVER") String expiryMode,
                                 @RequestParam(required = false) Long customSeconds, Principal principal) {
        return chatService.saveAttachment(principal.getName(), userId, file, expiryMode, customSeconds);
    }

    @PostMapping("/messages/seen")
    public Map<String, Object> seen(@RequestBody SeenRequest request, Principal principal) {
        return Map.of("deletedIds", chatService.markSeen(principal.getName(), request.messageIds()));
    }
    public record SeenRequest(List<Long> messageIds) {}

    @DeleteMapping("/messages/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, Principal principal) {
        chatService.deleteMessage(principal.getName(), id); return ResponseEntity.noContent().build();
    }

    @GetMapping("/attachments/{id}")
    public ResponseEntity<Resource> download(@PathVariable Long id, Principal principal) {
        Path path = chatService.attachmentPath(principal.getName(), id);
        ChatMessageDTO message = chatService.getAccessibleMessage(principal.getName(), id);
        String filename = message.attachmentName() == null ? "attachment" : message.attachmentName().replace("\"", "");
        MediaType type;
        try { type = MediaType.parseMediaType(message.attachmentType()); } catch (Exception ex) { type = MediaType.APPLICATION_OCTET_STREAM; }
        return ResponseEntity.ok().contentType(type).header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"").body(new FileSystemResource(path));
    }
}
