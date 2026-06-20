
'use client';

import React, { useState, useEffect } from 'react';
import Spinner from './Spinner';
import { getRandomQuote } from '@/lib/quotes';
import type { Quote } from '@/lib/quotes';

interface LoadingIndicatorProps {
  message: string;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ message }) => {
  const [quote, setQuote] = useState<Quote | null>(null);

  useEffect(() => {
    // Defer the initial random pick to the next macrotask so React's
    // strict-effects lint doesn't flag a synchronous setState in the effect
    // body. Server renders no quote (SSR-safe), client renders one shortly
    // after mount, then the interval rotates it every 10s.
    const initialId = setTimeout(() => setQuote(getRandomQuote()), 0);
    const intervalId = setInterval(() => {
      setQuote(getRandomQuote());
    }, 10000);

    return () => {
      clearTimeout(initialId);
      clearInterval(intervalId);
    };
  }, []);

  return (
    <div
      className="flex min-h-[400px] animate-fade-in flex-col items-center justify-center py-20 text-center"
      aria-live="polite"
      aria-busy="true"
    >
      <Spinner size="md" />
      <p className="mt-4 text-lg font-semibold text-discogs-text">{message}</p>
      {quote && (
        <blockquote className="mt-4 max-w-sm border-l-4 border-discogs-border p-4 italic text-discogs-text-secondary">
          <p>&ldquo;{quote.quote}&rdquo;</p>
          <cite className="mt-2 block text-right text-sm not-italic text-discogs-text-secondary/80">
            &mdash; {quote.author}
          </cite>
        </blockquote>
      )}
    </div>
  );
};

export default LoadingIndicator;
