import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import Login from "./Login";
import Register from "./Register";
import Home from "./Home";
import Profile from "./Profile";
import Chat from "./Chat";
import Calls from "./Calls";

function App() {
  useEffect(() => { document.documentElement.dataset.theme = localStorage.getItem("secretalkTheme") || "dark"; }, []);
  return <BrowserRouter><Routes>
    <Route path="/" element={<Navigate to="/login" replace />} />
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route path="/home" element={<Home />} />
    <Route path="/chat/:id" element={<Chat />} />
    <Route path="/profile/:id" element={<Profile />} />
    <Route path="/calls" element={<Calls />} />
    <Route path="*" element={<Navigate to="/login" replace />} />
  </Routes></BrowserRouter>;
}
export default App;
