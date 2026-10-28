package com.secretalk.backend.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "chat_messages", indexes = {
        @Index(name = "idx_chat_sender_recipient", columnList = "sender_id,recipient_id,created_at"),
        @Index(name = "idx_chat_recipient_sender", columnList = "recipient_id,sender_id,created_at"),
        @Index(name = "idx_chat_expiry", columnList = "expires_at")
})
public class ChatMessage {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "sender_id", nullable = false)
    private User sender;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "recipient_id", nullable = false)
    private User recipient;
    @Column(nullable = false, length = 4000)
    private String content = "";
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
    @Column(name = "expiry_mode", nullable = false, length = 20)
    private String expiryMode = "NEVER";
    @Column(name = "expires_at")
    private LocalDateTime expiresAt;
    @Column(name = "seen_at")
    private LocalDateTime seenAt;
    @Column(name = "attachment_name", length = 255)
    private String attachmentName;
    @Column(name = "attachment_type", length = 150)
    private String attachmentType;
    @Column(name = "attachment_size")
    private Long attachmentSize;
    @Column(name = "attachment_path", length = 1000)
    private String attachmentPath;

    @PrePersist void beforeSave() { if (createdAt == null) createdAt = LocalDateTime.now(); }
    public Long getId() { return id; }
    public User getSender() { return sender; }
    public void setSender(User sender) { this.sender = sender; }
    public User getRecipient() { return recipient; }
    public void setRecipient(User recipient) { this.recipient = recipient; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public String getExpiryMode() { return expiryMode; }
    public void setExpiryMode(String expiryMode) { this.expiryMode = expiryMode; }
    public LocalDateTime getExpiresAt() { return expiresAt; }
    public void setExpiresAt(LocalDateTime expiresAt) { this.expiresAt = expiresAt; }
    public LocalDateTime getSeenAt() { return seenAt; }
    public void setSeenAt(LocalDateTime seenAt) { this.seenAt = seenAt; }
    public String getAttachmentName() { return attachmentName; }
    public void setAttachmentName(String attachmentName) { this.attachmentName = attachmentName; }
    public String getAttachmentType() { return attachmentType; }
    public void setAttachmentType(String attachmentType) { this.attachmentType = attachmentType; }
    public Long getAttachmentSize() { return attachmentSize; }
    public void setAttachmentSize(Long attachmentSize) { this.attachmentSize = attachmentSize; }
    public String getAttachmentPath() { return attachmentPath; }
    public void setAttachmentPath(String attachmentPath) { this.attachmentPath = attachmentPath; }
}
