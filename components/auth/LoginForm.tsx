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
      setError('Please enter a token.');
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
      <form
        onSubmit={handleSubmit}
        className="animate-slide-up"
        style={{ animationDelay: '100ms' }}
      >
        <div className="mb-6">
          <label
            htmlFor="token"
            className="mb-2 block text-sm font-medium text-discogs-text-secondary"
          >
            Personal Access Token
          </label>
          <input
            type="password"
            id="token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="block w-full rounded-lg border border-discogs-border bg-discogs-bg p-2.5 text-sm text-white placeholder-discogs-text-secondary/50 focus:border-discogs-blue focus:ring-discogs-blue"
            placeholder="Your Discogs token"
            required
            disabled={isPending}
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="flex w-full items-center justify-center rounded-lg bg-discogs-blue px-5 py-2.5 text-center text-sm font-medium text-white transition-colors duration-300 hover:bg-discogs-blue-dark focus:outline-none focus:ring-4 focus:ring-discogs-blue/50 disabled:bg-discogs-blue-dark/50"
        >
          {isPending ? <Spinner /> : 'Connect to Discogs'}
        </button>
      </form>
      {error && (
        <div className="mt-4">
          <ErrorMessage message={error} onClear={() => setError(null)} />
        </div>
      )}
    </>
  );
}
