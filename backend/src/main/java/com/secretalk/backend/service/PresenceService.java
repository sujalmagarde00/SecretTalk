package com.secretalk.backend.service;
import com.secretalk.backend.entity.User;
import com.secretalk.backend.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
@Service
public class PresenceService {
 private final Set<String> online = ConcurrentHashMap.newKeySet(); private final UserRepository users;
 public PresenceService(UserRepository users){this.users=users;}
 public void connected(String username){online.add(username.toLowerCase());}
 @Transactional public void disconnected(String username){online.remove(username.toLowerCase()); users.findByUsernameIgnoreCase(username).ifPresent(u->{u.setLastSeenAt(LocalDateTime.now());users.save(u);});}
 public boolean isOnline(String username){return online.contains(username.toLowerCase());}
 public LocalDateTime now(){return LocalDateTime.now();}
}
