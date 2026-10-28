package com.secretalk.backend.controller;

import com.secretalk.backend.service.AuthService;
import com.secretalk.backend.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@Validated
public class AuthController {
    private final AuthService authService;
    private final SecurityContextRepository securityContextRepository;
    private final UserRepository userRepository;
    public AuthController(AuthService authService, SecurityContextRepository securityContextRepository, UserRepository userRepository) {
        this.authService = authService; this.securityContextRepository = securityContextRepository; this.userRepository = userRepository;
    }
    public record RegisterRequest(@NotBlank @Size(min=3,max=50) String username,
                                  @NotBlank @Email @Size(max=100) String email,
                                  @NotBlank @Size(min=8,max=72) String password) {}
    public record LoginRequest(@NotBlank String username, @NotBlank String password) {}

    @PostMapping("/register")
    public ResponseEntity<Map<String,Object>> register(@RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request.username(), request.email(), request.password()));
    }
    @PostMapping("/login")
    public ResponseEntity<Map<String,Object>> login(@RequestBody LoginRequest request, HttpServletRequest httpRequest, HttpServletResponse response) {
        Map<String,Object> result = authService.login(request.username(), request.password());
        String canonicalUsername = ((Map<?,?>) result.get("user")).get("username").toString();
        var authentication = new UsernamePasswordAuthenticationToken(canonicalUsername, null, List.of(new SimpleGrantedAuthority("ROLE_USER")));
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        httpRequest.getSession(true);
        securityContextRepository.saveContext(context, httpRequest, response);
        return ResponseEntity.ok(result);
    }
    @PostMapping("/logout")
    public ResponseEntity<Map<String,String>> logout(HttpServletRequest request) {
        SecurityContextHolder.clearContext();
        HttpSession session = request.getSession(false);
        if (session != null) session.invalidate();
        return ResponseEntity.ok(Map.of("message", "Logged out"));
    }
    @GetMapping("/me")
    public ResponseEntity<Map<String,Object>> me(java.security.Principal principal) {
        var user = userRepository.findByUsernameIgnoreCase(principal.getName()).orElseThrow();
        return ResponseEntity.ok(Map.of("id", user.getId(), "username", user.getUsername(), "email", user.getEmail()));
    }
}
