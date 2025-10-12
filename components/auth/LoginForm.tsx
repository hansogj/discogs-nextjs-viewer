'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import ErrorMessage from '../ErrorMessage';
import Spinner from '../Spinner';

export default function LoginForm() {
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!token.trim()) {
        setError("Please enter a token.");
        return;
    }

    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: token.trim() }),
    });

    if (response.ok) {
      startTransition(() => {
        router.refresh();
      });
    } else {
      const data = await response.json();
      setError(data.error || 'Login failed. Please check your token.');
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="animate-slide-up" style={{ animationDelay: '100ms' }}>
        <div className="mb-6">
          <label htmlFor="token" className="block mb-2 text-sm font-medium text-discogs-text-secondary">Personal Access Token</label>
          <input
            type="password"
            id="token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="bg-discogs-bg border border-discogs-border text-white text-sm rounded-lg focus:ring-discogs-blue focus:border-discogs-blue block w-full p-2.5 placeholder-discogs-text-secondary/50"
            placeholder="Your Discogs token"
            required
            disabled={isPending}
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="w-full text-white bg-discogs-blue hover:bg-discogs-blue-dark focus:ring-4 focus:outline-none focus:ring-discogs-blue/50 font-medium rounded-lg text-sm px-5 py-2.5 text-center transition-colors duration-300 flex items-center justify-center disabled:bg-discogs-blue-dark/50"
        >
          {isPending ? <Spinner /> : 'Connect to Discogs'}
        </button>
      </form>
      {error && <div className="mt-4"><ErrorMessage message={error} onClear={() => setError(null)} /></div>}
    </>
  );
}