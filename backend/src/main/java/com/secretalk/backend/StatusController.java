package com.secretalk.backend;

import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class StatusController {
    @GetMapping("/")
    public Map<String, String> home() {
        return Map.of(
                "app", "SecretTalk",
                "status", "Running",
                "message", "Backend is working successfully!"
        );
    }

    @GetMapping("/api/health")
    public Map<String, String> health() {
        return Map.of(
                "status", "UP",
                "service", "SecretTalk Backend"
        );
    }

}
