import React from "react";
import {Routes,Route} from 'react-router-dom'
import Landing from "./components/landing/Dotted.jsx";
import Signup from "./components/authentication/Signup.jsx";
import Dashboard from "./components/dashboard/dashboard.jsx";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  );
}

export default App;
