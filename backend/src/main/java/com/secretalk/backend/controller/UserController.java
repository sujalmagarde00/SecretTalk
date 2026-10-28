package com.secretalk.backend.controller;
import com.secretalk.backend.dto.UserProfileDTO; import com.secretalk.backend.entity.User; import com.secretalk.backend.repository.UserRepository; import com.secretalk.backend.service.PresenceService;
import org.springframework.http.HttpStatus; import org.springframework.web.bind.annotation.*; import org.springframework.web.server.ResponseStatusException; import java.security.Principal; import java.util.List;
@RestController @RequestMapping("/api/users") @CrossOrigin(origins="http://localhost:5173")
public class UserController {
 private final UserRepository users; private final PresenceService presence;
 public UserController(UserRepository users, PresenceService presence){this.users=users;this.presence=presence;}
 @GetMapping("/search") public List<UserProfileDTO> searchUsers(@RequestParam String username){if(username==null||username.isBlank())return List.of();return users.findByUsernameContainingIgnoreCase(username.trim()).stream().map(u->UserProfileDTO.from(u,presence.isOnline(u.getUsername()))).toList();}
 @GetMapping("/me") public UserProfileDTO me(Principal p){return UserProfileDTO.from(find(p.getName()),presence.isOnline(p.getName()));}
 @PutMapping("/me") public UserProfileDTO updateMe(@RequestBody ProfileUpdate req, Principal p){User u=find(p.getName()); if(req.displayName()!=null){String v=req.displayName().trim();if(v.length()>80)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Display name max 80 characters");u.setDisplayName(v.isBlank()?null:v);} if(req.bio()!=null){if(req.bio().length()>300)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Bio max 300 characters");u.setBio(req.bio().trim());} if(req.statusMessage()!=null){if(req.statusMessage().length()>120)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Status max 120 characters");u.setStatusMessage(req.statusMessage().trim());} if(req.callHistoryRetentionDays()!=null){int d=req.callHistoryRetentionDays();if(d!=1&&d!=7&&d!=30&&d!=90&&d!=0)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Retention must be 1, 7, 30, 90 or 0 (never)");u.setCallHistoryRetentionDays(d);} return UserProfileDTO.from(users.save(u),presence.isOnline(u.getUsername()));}
 @GetMapping("/{id}") public UserProfileDTO getUserProfile(@PathVariable Long id){User u=users.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"User not found"));return UserProfileDTO.from(u,presence.isOnline(u.getUsername()));}
 private User find(String name){return users.findByUsernameIgnoreCase(name).orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED,"User not found"));}
 public record ProfileUpdate(String displayName,String bio,String statusMessage,Integer callHistoryRetentionDays){}
}
