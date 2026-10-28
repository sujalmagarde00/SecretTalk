package com.secretalk.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {
    private final ChatWebSocketHandler handler;
    public WebSocketConfig(ChatWebSocketHandler handler) { this.handler = handler; }
    @Override public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        String configuredOrigins = System.getenv().getOrDefault("APP_CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173");
        String[] origins = java.util.Arrays.stream(configuredOrigins.split(",")).map(String::trim).filter(v -> !v.isEmpty()).toArray(String[]::new);
        registry.addHandler(handler, "/ws").setAllowedOrigins(origins);
    }
}
