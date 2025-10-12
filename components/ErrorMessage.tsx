'use client';

import React from 'react';

interface ErrorMessageProps {
  message: string;
  onClear?: () => void;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, onClear }) => (
  <div
    className="relative mx-auto max-w-md rounded-lg border border-red-700 bg-red-900/50 px-4 py-3 text-center text-red-200"
    role="alert"
  >
    <strong className="font-bold">Error: </strong>
    <span className="block sm:inline">{message}</span>
    {onClear && (
      <button
        onClick={onClear}
        className="absolute inset-y-0 right-0 px-4 py-3 text-red-200 hover:text-white"
        aria-label="Close"
      >
        <svg
          className="h-6 w-6 fill-current"
          role="button"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
        >
          <title>Close</title>
          <path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z" />
        </svg>
      </button>
    )}
  </div>
);

export default ErrorMessage;
