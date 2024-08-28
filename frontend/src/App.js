//import './App.css';

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import SignUp from './pages/SignUp';
import SignUpOtp from './pages/SignUpOtp';
import SignIn from './pages/SignIn';
import SignInOtp from './pages/SignInOtp';
import Dashboard from './pages/Dashboard';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/home" element={<Home />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/signup/otp" element={<SignUpOtp />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signin/otp" element={<SignInOtp />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/" element={<Home />} />
      </Routes>
    </Router>
  );
}

export default App;

