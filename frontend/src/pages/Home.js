import React from 'react';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col justify-center items-center">      
      <h1 className="text-4xl font-bold mb-4">Unleash the Future of AI-Enhanced Fintech with Vonage API</h1>
      <p className="text-2xl mb-2">Manage and Analyze your Spends</p>
      <p className="text-lg mb-6">Get started by signing up or logging in</p>
      <div className="flex space-x-6">
        <button 
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-6 text-xl rounded"
          onClick={() => navigate('/signup')}
        >
          Sign Up
        </button>
        <button 
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-3 px-6 text-xl rounded"
          onClick={() => navigate('/signin')}
        >
          Sign In
        </button>
      </div>
    </div>
  );
}

export default Home;
