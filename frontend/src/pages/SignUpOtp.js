import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const SignUpOtp = () => {
  const [otp, setOtp] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  const handleChange = (e, index) => {
    const value = e.target.value;
    if (isNaN(value)) return; // Ensure only numbers are entered

    let newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Automatically focus the next input if value is entered
    if (value && index < 3) {
      document.getElementById(`otp-input-${index + 1}`).focus();
    }
  };

  const handleVerifyOtp = async () => {
    const { whatsappNumber, name, currency } = location.state;
    const otpCode = otp.join(''); // Combine all OTP values into a single string

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/otp/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: whatsappNumber,
          code: otpCode,
          newUser: true,
          name,
          currency,
        }),
      });

      if (response.status === 200) {
        // Navigate on successful OTP verification
        navigate('/dashboard', { state: { whatsappNumber, currency } });
      } else {
        // Show error message
        const errorData = await response.json();
        setError(errorData.message || 'An error occurred. Please try again.');
        setTimeout(() => setError(''), 5000); // Clear error message after 5 seconds
      }
    } catch (err) {
      // Handle network errors
      setError('Network error. Please try again.');
      setTimeout(() => setError(''), 5000); // Clear error message after 5 seconds
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col justify-center items-center">
      <h1 className="text-4xl font-bold mb-4">Sign Up</h1>
      <p className="text-xl mb-6">Enter the OTP you've received</p>
      <div className="flex space-x-2 mb-6">
        {otp.map((_, index) => (
          <input
            key={index}
            id={`otp-input-${index}`}
            type="text"
            maxLength="1"
            value={otp[index]}
            onChange={(e) => handleChange(e, index)}
            className="w-12 h-12 text-center text-2xl bg-gray-800 border border-gray-600 rounded"
          />
        ))}
      </div>
      <button 
        className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
        onClick={handleVerifyOtp}
      >
        Verify OTP
      </button>
      {error && (
        <div className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded shadow-lg">
          {error}
        </div>
      )}
    </div>
  );
};

export default SignUpOtp;