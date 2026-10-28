package com.secretalk.backend.dto;
import java.time.LocalDateTime;
public record ConversationDTO(Long userId, String username, String lastMessage, LocalDateTime lastMessageAt, Long lastMessageId) {}
