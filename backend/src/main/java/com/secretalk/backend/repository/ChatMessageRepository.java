package com.secretalk.backend.repository;

import com.secretalk.backend.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    @Query("select m from ChatMessage m where ((m.sender.id = :me and m.recipient.id = :other) or (m.sender.id = :other and m.recipient.id = :me)) and (m.expiresAt is null or m.expiresAt > :now) order by m.createdAt asc")
    List<ChatMessage> findConversation(@Param("me") Long me, @Param("other") Long other, @Param("now") LocalDateTime now);
    @Query("select m from ChatMessage m where m.sender.id = :me or m.recipient.id = :me order by m.createdAt desc")
    List<ChatMessage> findRecentForUser(@Param("me") Long me);
    @Query("select m from ChatMessage m where m.id = :id and (m.sender.id = :me or m.recipient.id = :me)")
    Optional<ChatMessage> findAccessible(@Param("id") Long id, @Param("me") Long me);
    @Query("select m from ChatMessage m where m.id in :ids and m.recipient.id = :me")
    List<ChatMessage> findIncomingByIds(@Param("ids") List<Long> ids, @Param("me") Long me);
    List<ChatMessage> findByExpiresAtBefore(LocalDateTime time);
}
