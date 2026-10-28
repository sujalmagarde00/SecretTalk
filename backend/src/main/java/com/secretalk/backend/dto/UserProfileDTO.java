package com.secretalk.backend.dto;
import com.secretalk.backend.entity.User;
import java.time.LocalDateTime;
public record UserProfileDTO(Long id, String username, String displayName, String bio, String statusMessage, LocalDateTime lastSeenAt, boolean online, int callHistoryRetentionDays) {
    public static UserProfileDTO from(User u, boolean online) { return new UserProfileDTO(u.getId(), u.getUsername(), u.getDisplayName(), u.getBio(), u.getStatusMessage(), u.getLastSeenAt(), online, u.getCallHistoryRetentionDays()); }
}
