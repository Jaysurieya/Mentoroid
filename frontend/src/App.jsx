import React from "react";
import { Routes, Route } from 'react-router-dom'
import Landing from "./components/landing/Dotted.jsx";
import Signup from "./components/authentication/Signup.jsx";
import Dashboard from "./components/dashboard/Dashboard.jsx";
import AIChatInput from "./components/dashboard/Ai.jsx";
import Profile from "./components/dashboard/Profile.jsx";


function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/ai-chat" element={<AIChatInput />} />
      <Route path="/profile" element={<Profile />} />
    </Routes>
  );
}

export default App;
