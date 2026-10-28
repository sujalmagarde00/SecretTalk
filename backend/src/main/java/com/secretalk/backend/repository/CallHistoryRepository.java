package com.secretalk.backend.repository;
import com.secretalk.backend.entity.CallHistory; import org.springframework.data.jpa.repository.JpaRepository; import java.time.LocalDateTime; import java.util.List;
public interface CallHistoryRepository extends JpaRepository<CallHistory,Long>{ List<CallHistory> findByCaller_IdOrCallee_IdOrderByStartedAtDesc(Long callerId,Long calleeId); List<CallHistory> findByExpiresAtBefore(LocalDateTime now); }
