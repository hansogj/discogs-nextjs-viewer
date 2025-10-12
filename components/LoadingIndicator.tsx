'use client';

import React, { useState, useEffect } from 'react';
import Spinner from './Spinner';
import { getRandomQuote } from '@/lib/quotes';

interface LoadingIndicatorProps {
  message: string;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ message }) => {
  const [quote, setQuote] = useState('');

  useEffect(() => {
    // Set initial quote and then change it periodically if the component stays mounted for long
    setQuote(getRandomQuote());
    const intervalId = setInterval(() => {
      setQuote(getRandomQuote());
    }, 10000);

    return () => clearInterval(intervalId);
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
        <blockquote className="mt-4 max-w-sm border-l-4 border-discogs-border pl-4 italic text-discogs-text-secondary">
          <p>"{quote}"</p>
        </blockquote>
      )}
    </div>
  );
};

export default LoadingIndicator;
