// Set VITE_API_URL in the hosting dashboard to the deployed backend URL, without a trailing slash.
const configuredApi = (import.meta.env.VITE_API_URL || "http://localhost:8080").trim().replace(/\/$/, "");
export const API_BASE = configuredApi;
export const WS_URL = `${configuredApi.replace(/^https:/, "wss:").replace(/^http:/, "ws:")}/ws`;
