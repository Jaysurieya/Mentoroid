import React from "react";
import {Routes,Route} from 'react-router-dom'
import Dotted from './components/landing/Dotted.jsx'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Dotted />} />
    </Routes>
  );
}

export default App;
