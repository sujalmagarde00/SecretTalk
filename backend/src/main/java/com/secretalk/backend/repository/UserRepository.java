package com.secretalk.backend.repository;

import com.secretalk.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    // Check whether username already exists
    boolean existsByUsername(String username);

    boolean existsByUsernameIgnoreCase(String username);

    // Check whether email already exists
    boolean existsByEmail(String email);

    boolean existsByEmailIgnoreCase(String email);

    // Find user by username
    Optional<User> findByUsername(String username);

    Optional<User> findByUsernameIgnoreCase(String username);

    // Search users by partial username
    List<User> findByUsernameContainingIgnoreCase(String username);
}
