package com.secretalk.backend.repository;
import com.secretalk.backend.entity.ChatClear;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface ChatClearRepository extends JpaRepository<ChatClear,Long> { Optional<ChatClear> findByUser_IdAndOtherUser_Id(Long userId, Long otherUserId); }
