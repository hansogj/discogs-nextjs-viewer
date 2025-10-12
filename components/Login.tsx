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
    <div className="flex min-h-screen items-center justify-center bg-gray-900 p-4 text-white">
      <div className="w-full max-w-md rounded-2xl border border-gray-700 bg-gray-800 p-8 shadow-2xl">
        <h1 className="mb-2 text-center text-3xl font-bold text-sky-400">
          Discogs Collection Viewer
        </h1>
        <p className="mb-8 text-center text-gray-400">
          Enter your Personal Access Token to continue.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label
              htmlFor="token"
              className="mb-2 block text-sm font-medium text-gray-300"
            >
              Personal Access Token
            </label>
            <input
              type="password"
              id="token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="block w-full rounded-lg border border-gray-600 bg-gray-700 p-2.5 text-sm text-white placeholder-gray-400 focus:border-sky-500 focus:ring-sky-500"
              placeholder="Your Discogs token"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-sky-600 px-5 py-2.5 text-center text-sm font-medium text-white transition-colors duration-300 hover:bg-sky-700 focus:outline-none focus:ring-4 focus:ring-sky-800"
          >
            Connect to Discogs
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-gray-500">
          You can generate a token in your Discogs account under Settings &gt;
          Developers.
        </p>
      </div>
    </div>
  );
};

export default Login;
