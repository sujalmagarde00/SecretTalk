package com.secretalk.backend.service;

import com.secretalk.backend.entity.User;
import com.secretalk.backend.repository.UserRepository;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;
import java.util.Map;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public Map<String, Object> register(
            String username,
            String email,
            String password) {

        username = username.trim();
        email = email.trim().toLowerCase(Locale.ROOT);

        if (username.length() < 3 || username.length() > 50) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Username must be 3 to 50 characters"
            );
        }

        if (!username.matches("[A-Za-z0-9_]+")) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Username can contain letters, numbers and underscores only"
            );
        }

        if (!email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Enter a valid email address"
            );
        }

        if (password.length() < 8 || password.length() > 72) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Password must be 8 to 72 characters"
            );
        }

        if (userRepository.existsByUsernameIgnoreCase(username)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Username already exists"
            );
        }

        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Email already registered"
            );
        }

        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(password));

        User savedUser = userRepository.save(user);

        return Map.of(
                "message", "Registration successful",
                "user", Map.of(
                        "id", savedUser.getId(),
                        "username", savedUser.getUsername(),
                        "email", savedUser.getEmail()
                )
        );
    }

    @Transactional(readOnly = true)
    public Map<String, Object> login(
            String username,
            String password) {

        User user = userRepository
                .findByUsernameIgnoreCase(username.trim())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Invalid username or password"
                ));

        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Invalid username or password"
            );
        }

        return Map.of(
                "message", "Login successful",
                "user", Map.of(
                        "id", user.getId(),
                        "username", user.getUsername(),
                        "email", user.getEmail()
                )
        );
    }
}

