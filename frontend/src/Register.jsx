import { useState } from "react";
import { API_BASE } from "./config";
import { Link, useNavigate } from "react-router-dom";

const styles = `
.register-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  box-sizing: border-box;
  background: radial-gradient(circle at top left,#29245b,transparent 40%),
              radial-gradient(circle at bottom right,#43215d,transparent 35%),
              #101321;
  color: #f8fafc;
  font-family: Arial, sans-serif;
}
.register-card {
  width: 100%;
  max-width: 440px;
  padding: 32px 36px;
  box-sizing: border-box;
  border: 1px solid #35344f;
  border-radius: 24px;
  background: #191c2ff5;
  box-shadow: 0 25px 70px #0005;
}
.register-logo {
  width: 54px;
  height: 54px;
  display: grid;
  place-items: center;
  margin: 0 auto 16px;
  border-radius: 17px;
  background: linear-gradient(135deg,#a855f7,#536dfe);
  font-size: 28px;
  font-weight: 800;
}
.register-brand {
  margin: 0;
  text-align: center;
  color: #b9a2ff;
  letter-spacing: 4px;
  font-size: 11px;
  font-weight: bold;
}
.register-card h1 {
  margin: 12px 0 8px;
  text-align: center;
  font-size: 28px;
}
.register-subtitle {
  margin: 0 0 22px;
  color: #a7adc4;
  text-align: center;
  font-size: 13px;
}
.register-card form {
  display: flex;
  flex-direction: column;
}
.register-card label {
  margin: 0 0 7px;
  color: #e5e7eb;
  font-size: 13px;
  font-weight: 600;
}
.register-card input {
  width: 100%;
  box-sizing: border-box;
  margin-bottom: 15px;
  padding: 12px 14px;
  border: 1px solid #3b405b;
  border-radius: 10px;
  outline: none;
  background: #15182a;
  color: white;
}
.register-card input:focus {
  border-color: #a855f7;
  box-shadow: 0 0 0 3px #a855f722;
}
.register-card button {
  padding: 14px;
  margin-top: 5px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(100deg,#9333ea,#526dfe);
  color: white;
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
}
.register-card button:disabled {
  opacity: .6;
  cursor: wait;
}
.register-message {
  color: #fda4af;
  font-size: 13px;
  overflow-wrap: anywhere;
}
.register-switch {
  margin: 22px 0 0;
  color: #a7adc4;
  text-align: center;
  font-size: 13px;
}
.register-switch a {
  color: #c4b5fd;
  font-weight: bold;
  text-decoration: none;
}
.register-switch a:hover {
  text-decoration: underline;
}
@media(max-width:480px) {
  .register-card { padding: 25px 20px; }
}
`;

const API_URL = `${API_BASE}/api/auth`;

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  async function handleRegister(e) {
    e.preventDefault();
    setMessage("");

    if (password !== confirmPassword) {
      setMessage("Passwords match nahi kar rahe.");
      return;
    }

    if (password.length < 8 || password.length > 72) {
      setMessage("Password 8 se 72 characters ka hona chahiye.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Registration failed");
      }

      navigate("/login", {
        state: { message: "Account created! Ab login karo." },
      });
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

      <main className="register-page">
        <section className="register-card">
          <div className="register-logo">S</div>

          <p className="register-brand">SECRETTALK</p>
          <h1>Create account</h1>
          <p className="register-subtitle">
            Create your account and get started.
          </p>

          <form onSubmit={handleRegister}>
            <label htmlFor="register-username">Username</label>
            <input
              id="register-username"
              type="text"
              placeholder="Choose a username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              minLength={3}
              maxLength={50}
              pattern="[A-Za-z0-9_]+"
              title="Letters, numbers and underscores only"
              autoComplete="username"
              required
            />

            <label htmlFor="register-email">Email address</label>
            <input
              id="register-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={100}
              autoComplete="email"
              required
            />

            <label htmlFor="register-password">Password</label>
            <input
              id="register-password"
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              maxLength={72}
              autoComplete="new-password"
              required
            />

            <label htmlFor="confirm-password">Confirm password</label>
            <input
              id="confirm-password"
              type="password"
              placeholder="Enter password again"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={8}
              maxLength={72}
              autoComplete="new-password"
              required
            />

            {message && <p className="register-message">{message}</p>}

            <button type="submit" disabled={loading}>
              {loading ? "Creating account..." : "Create account →"}
            </button>
          </form>

          <p className="register-switch">
            Already have an account? <Link to="/login">Login</Link>
          </p>
        </section>
      </main>
    </>
  );
}

