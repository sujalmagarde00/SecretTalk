package com.secretalk.backend.dto;

import com.secretalk.backend.entity.ChatMessage;
import java.time.LocalDateTime;

public record ChatMessageDTO(Long id, Long senderId, String senderUsername, Long recipientId,
                             String content, LocalDateTime createdAt, String expiryMode,
                             LocalDateTime expiresAt, LocalDateTime seenAt,
                             String attachmentName, String attachmentType, Long attachmentSize) {
    public static ChatMessageDTO from(ChatMessage m) {
        return new ChatMessageDTO(m.getId(), m.getSender().getId(), m.getSender().getUsername(),
                m.getRecipient().getId(), m.getContent(), m.getCreatedAt(), m.getExpiryMode(),
                m.getExpiresAt(), m.getSeenAt(), m.getAttachmentName(), m.getAttachmentType(), m.getAttachmentSize());
    }
}
