package com.secretalk.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.cors.CorsConfiguration;
import java.util.List;

@Configuration
public class SecurityConfig {
    @Bean public PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(); }
    @Bean public SecurityContextRepository securityContextRepository() { return new HttpSessionSecurityContextRepository(); }
    @Bean public SecurityFilterChain securityFilterChain(org.springframework.security.config.annotation.web.builders.HttpSecurity http) throws Exception {
        http.cors(cors -> cors.configurationSource(request -> {
                    CorsConfiguration config = new CorsConfiguration();
                    String configuredOrigins = System.getenv().getOrDefault("APP_CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173");
                    config.setAllowedOrigins(java.util.Arrays.stream(configuredOrigins.split(",")).map(String::trim).filter(v -> !v.isEmpty()).toList());
                    config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
                    config.setAllowedHeaders(List.of("Content-Type", "X-Requested-With"));
                    config.setAllowCredentials(true);
                    return config;
                }))
                .csrf(csrf -> csrf.disable())
                .securityContext(context -> context.securityContextRepository(securityContextRepository()))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/register", "/api/auth/login", "/api/auth/logout").permitAll()
                        .requestMatchers("/api/users/me", "/api/call-history/**").authenticated()
                        .requestMatchers(HttpMethod.GET, "/", "/api/health", "/api/users/search", "/api/users/*").permitAll()
                        .requestMatchers("/ws").authenticated()
                        .anyRequest().authenticated())
                .httpBasic(basic -> basic.disable())
                .formLogin(form -> form.disable());
        return http.build();
    }
}
