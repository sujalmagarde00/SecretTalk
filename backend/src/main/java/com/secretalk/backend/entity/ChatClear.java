package com.secretalk.backend.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "chat_clears", uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "other_user_id"}))
public class ChatClear {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @ManyToOne(fetch=FetchType.LAZY, optional=false) @JoinColumn(name="user_id") private User user;
 @ManyToOne(fetch=FetchType.LAZY, optional=false) @JoinColumn(name="other_user_id") private User otherUser;
 @Column(name="cleared_at", nullable=false) private LocalDateTime clearedAt;
 public Long getId(){return id;} public User getUser(){return user;} public void setUser(User v){user=v;} public User getOtherUser(){return otherUser;} public void setOtherUser(User v){otherUser=v;} public LocalDateTime getClearedAt(){return clearedAt;} public void setClearedAt(LocalDateTime v){clearedAt=v;}
}
