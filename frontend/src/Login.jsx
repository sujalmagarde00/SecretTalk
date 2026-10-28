import { useState } from "react";
import { API_BASE } from "./config";
import { Link, useNavigate, useLocation } from "react-router-dom";

const styles = `
.login-page {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 24px;
  box-sizing: border-box;
  background: radial-gradient(circle at top left,#29245b,transparent 40%),
              radial-gradient(circle at bottom right,#43215d,transparent 35%),
              #101321;
  color: #f8fafc;
  font-family: Arial, sans-serif;
}
.login-card {
  width: 100%;
  max-width: 420px;
  padding: 36px;
  box-sizing: border-box;
  border: 1px solid #35344f;
  border-radius: 24px;
  background: #191c2ff5;
  box-shadow: 0 25px 70px #0005;
}
.login-logo {
  width: 58px;
  height: 58px;
  display: grid;
  place-items: center;
  margin: 0 auto 18px;
  border-radius: 18px;
  background: linear-gradient(135deg,#a855f7,#536dfe);
  font-size: 30px;
  font-weight: 800;
}
.login-brand {
  text-align: center;
  color: #b9a2ff;
  letter-spacing: 4px;
  font-size: 11px;
  font-weight: bold;
}
.login-card h1 {
  margin: 14px 0 8px;
  text-align: center;
  font-size: 30px;
}
.login-subtitle {
  margin: 0 0 28px;
  color: #a7adc4;
  text-align: center;
  font-size: 14px;
}
.login-card form {
  display: flex;
  flex-direction: column;
}
.login-card label {
  margin: 0 0 8px;
  color: #e5e7eb;
  font-size: 13px;
  font-weight: 600;
}
.login-card input {
  width: 100%;
  box-sizing: border-box;
  margin-bottom: 20px;
  padding: 14px;
  border: 1px solid #3b405b;
  border-radius: 10px;
  outline: none;
  background: #15182a;
  color: white;
}
.login-card input:focus {
  border-color: #a855f7;
  box-shadow: 0 0 0 3px #a855f722;
}
.login-card button {
  padding: 14px;
  margin-top: 4px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(100deg,#9333ea,#526dfe);
  color: white;
  font-weight: 800;
  font-size: 15px;
  cursor: pointer;
}
.login-card button:disabled {
  opacity: .6;
  cursor: wait;
}
.login-message {
  color: #fda4af;
  font-size: 13px;
  overflow-wrap: anywhere;
}
.login-notice {
  color: #86efac;
  font-size: 13px;
  margin-bottom: 15px;
}
.login-switch {
  margin: 24px 0 0;
  color: #a7adc4;
  text-align: center;
  font-size: 13px;
}
.login-switch a {
  color: #c4b5fd;
  font-weight: bold;
  text-decoration: none;
}
.login-switch a:hover {
  text-decoration: underline;
}
@media(max-width:480px) {
  .login-card { padding: 26px 20px; }
}
`;

const API_URL = `${API_BASE}/api/auth`;

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  async function handleLogin(e) {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Invalid username or password");
      }

      sessionStorage.setItem("secretalkUser", JSON.stringify(data.user));
      navigate("/home");
    } catch (error) {
      setMessage(
        error.message === "Failed to fetch"
          ? "Backend se connection nahi ho raha."
          : error.message
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{styles}</style>

      <main className="login-page">
        <section className="login-card">
          <div className="login-logo">S</div>

          <p className="login-brand">SECRETTALK</p>
          <h1>Welcome back</h1>
          <p className="login-subtitle">
            Login to continue your conversations.
          </p>

          {location.state?.message && (
            <p className="login-notice">{location.state.message}</p>
          )}

          <form onSubmit={handleLogin}>
            <label htmlFor="login-username">Username</label>
            <input
              id="login-username"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />

            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />

            {message && <p className="login-message">{message}</p>}

            <button type="submit" disabled={loading}>
              {loading ? "Logging in..." : "Login →"}
            </button>
          </form>

          <p className="login-switch">
            Don't have an account? <Link to="/register">Register</Link>
          </p>
        </section>
      </main>
    </>
  );
}
