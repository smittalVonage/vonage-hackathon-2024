import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SignIn = () => {
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+1'); // Default to United States (+1)
  const navigate = useNavigate();

  const handleSubmit = async () => {
    const fullPhoneNumber = `${countryCode}${whatsappNumber}`;

    const response = await fetch(`${process.env.REACT_APP_API_URL}/otp/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phoneNumber: fullPhoneNumber }),
    });

    if (response.status === 200) {
      navigate('/signin/otp', { state: { whatsappNumber: fullPhoneNumber } });
    } else {
      navigate('/home');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col justify-center items-center">
      <h1 className="text-4xl font-bold mb-4">Sign In</h1>
      <p className="text-2xl mb-6">Fill below details to login</p>
      <div className="mb-4 w-1/3">
        <label className="block text-lg font-bold mb-2">Country Code</label>
        <select
          value={countryCode}
          onChange={(e) => setCountryCode(e.target.value)}
          className="block w-full bg-gray-800 text-white py-2 px-4 rounded"
        >
          <option value="+1">United States (+1)</option>
          <option value="+44">United Kingdom (+44)</option>
          <option value="+91">India (+91)</option>
        </select>
      </div>
      <div className="mb-6 w-1/3">
        <label className="block text-lg font-bold mb-2">WhatsApp Number</label>
        <input
          type="text"
          value={whatsappNumber}
          onChange={(e) => setWhatsappNumber(e.target.value)}
          placeholder="Enter your Whatsapp Number"
          className="block w-full bg-gray-800 text-white py-2 px-4 rounded"
        />
      </div>
      <button 
        className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
        onClick={handleSubmit}
      >
        Submit
      </button>
    </div>
  );
}

export default SignIn;
