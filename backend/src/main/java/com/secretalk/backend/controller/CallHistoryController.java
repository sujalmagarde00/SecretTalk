package com.secretalk.backend.controller;
import com.secretalk.backend.service.CallHistoryService; import org.springframework.web.bind.annotation.*; import java.security.Principal; import java.util.*;
@RestController @RequestMapping("/api/call-history") public class CallHistoryController {
 private final CallHistoryService service; public CallHistoryController(CallHistoryService s){service=s;}
 @GetMapping public List<Map<String,Object>> history(Principal p){return service.history(p.getName());}
 @GetMapping("/settings") public Map<String,Integer> settings(Principal p){return Map.of("retentionDays",service.retentionDays(p.getName()));}
 @PutMapping("/settings") public Map<String,Integer> update(@RequestBody RetentionRequest req,Principal p){return Map.of("retentionDays",service.updateRetentionDays(p.getName(),req.retentionDays()));}
 public record RetentionRequest(int retentionDays) {}
}
