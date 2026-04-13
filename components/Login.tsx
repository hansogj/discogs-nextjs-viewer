'use client';

import React from 'react';

const Login: React.FC = () => {
  const handleLogin = () => {
    window.location.href = '/api/oauth/request';
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 p-4 text-white">
      <div className="w-full max-w-md rounded-2xl border border-gray-700 bg-gray-800 p-8 shadow-2xl">
        <h1 className="mb-2 text-center text-3xl font-bold text-sky-400">
          Discogs Collection Viewer
        </h1>
        <p className="mb-8 text-center text-gray-400">
          Connect your Discogs account to view your collection and wantlist.
        </p>
        <button
          type="button"
          onClick={handleLogin}
          className="w-full rounded-lg bg-sky-600 px-5 py-2.5 text-center text-sm font-medium text-white transition-colors duration-300 hover:bg-sky-700 focus:outline-none focus:ring-4 focus:ring-sky-800"
        >
          Login with Discogs
        </button>
        <p className="mt-6 text-center text-xs text-gray-500">
          This application uses Discogs OAuth to securely access your data without storing your credentials.
        </p>
      </div>
    </div>
  );
};

export default Login;
