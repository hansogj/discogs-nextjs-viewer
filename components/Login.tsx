import React, { useState } from 'react';

interface LoginProps {
  onLogin: (token: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [token, setToken] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (token.trim()) {
      onLogin(token.trim());
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-4">
      <div className="w-full max-w-md bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-700">
        <h1 className="text-3xl font-bold text-center mb-2 text-sky-400">Discogs Collection Viewer</h1>
        <p className="text-center text-gray-400 mb-8">Enter your Personal Access Token to continue.</p>
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label htmlFor="token" className="block mb-2 text-sm font-medium text-gray-300">Personal Access Token</label>
            <input
              type="password"
              id="token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-sky-500 focus:border-sky-500 block w-full p-2.5 placeholder-gray-400"
              placeholder="Your Discogs token"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full text-white bg-sky-600 hover:bg-sky-700 focus:ring-4 focus:outline-none focus:ring-sky-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center transition-colors duration-300"
          >
            Connect to Discogs
          </button>
        </form>
        <p className="text-xs text-gray-500 mt-6 text-center">
          You can generate a token in your Discogs account under Settings &gt; Developers.
        </p>
      </div>
    </div>
  );
};

export default Login;
