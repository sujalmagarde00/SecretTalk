package com.secretalk.backend.entity;
import jakarta.persistence.*; import java.time.LocalDateTime;
@Entity @Table(name="call_history") public class CallHistory {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="caller_id") private User caller;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="callee_id") private User callee;
 @Column(nullable=false,length=10) private String mode;
 @Column(nullable=false,length=20) private String outcome="MISSED";
 @Column(name="started_at",nullable=false) private LocalDateTime startedAt;
 @Column(name="ended_at") private LocalDateTime endedAt;
 @Column(name="expires_at") private LocalDateTime expiresAt;
 public Long getId(){return id;} public User getCaller(){return caller;} public void setCaller(User u){caller=u;} public User getCallee(){return callee;} public void setCallee(User u){callee=u;} public String getMode(){return mode;} public void setMode(String v){mode=v;} public String getOutcome(){return outcome;} public void setOutcome(String v){outcome=v;} public LocalDateTime getStartedAt(){return startedAt;} public void setStartedAt(LocalDateTime v){startedAt=v;} public LocalDateTime getEndedAt(){return endedAt;} public void setEndedAt(LocalDateTime v){endedAt=v;} public LocalDateTime getExpiresAt(){return expiresAt;} public void setExpiresAt(LocalDateTime v){expiresAt=v;}
}
