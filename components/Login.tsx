'use client';

import React from 'react';
import Image from 'next/image';
import {
  useRememberedUsers,
  type RememberedUser,
} from '@/hooks/useRememberedUsers';

const PLACEHOLDER_AVATAR =
  "data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' fill='none'%3e%3crect width='100' height='100' fill='%231d1f24'/%3e%3ccircle cx='50' cy='40' r='15' fill='%23a0a0a0'/%3e%3cpath d='M25,90 A30,30 0 0,1 75,90 Z' fill='%23a0a0a0'/%3e%3c/svg%3e";

const Login: React.FC = () => {
  const { users, removeUser } = useRememberedUsers();

  const handleLogin = () => {
    window.location.href = '/api/oauth/request';
  };

  const handleRemove = (e: React.MouseEvent, username: string) => {
    e.stopPropagation();
    removeUser(username);
  };

  return (
    <div className="flex flex-col gap-4">
      {users.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-discogs-text-secondary">
            Sign in as:
          </p>
          {users.map((user: RememberedUser) => (
            <button
              key={user.username}
              type="button"
              onClick={handleLogin}
              className="group flex w-full items-center gap-3 rounded-lg border border-discogs-border bg-discogs-bg p-3 text-left transition-colors duration-200 hover:border-discogs-blue hover:bg-discogs-bg-light"
            >
              <Image
                src={user.avatar_url || PLACEHOLDER_AVATAR}
                alt={user.username}
                width={40}
                height={40}
                className="h-10 w-10 rounded-full border border-discogs-border"
              />
              <div className="flex-1">
                <p className="font-medium text-white group-hover:text-discogs-blue">
                  {user.username}
                </p>
                <p className="text-xs text-discogs-text-secondary">
                  Last login: {new Date(user.lastLogin).toLocaleDateString()}
                </p>
              </div>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => handleRemove(e, user.username)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleRemove(e as unknown as React.MouseEvent, user.username);
                  }
                }}
                title="Remove from list"
                className="rounded p-1 text-discogs-text-secondary opacity-0 transition-all hover:bg-discogs-border hover:text-red-400 group-hover:opacity-100"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </span>
            </button>
          ))}
          <div className="relative my-1 flex items-center">
            <div className="flex-grow border-t border-discogs-border"></div>
            <span className="mx-3 text-xs text-discogs-text-secondary">or</span>
            <div className="flex-grow border-t border-discogs-border"></div>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={handleLogin}
        className="w-full rounded-lg bg-discogs-blue px-5 py-2.5 text-center text-sm font-medium text-white transition-colors duration-300 hover:bg-sky-700 focus:outline-none focus:ring-4 focus:ring-sky-800"
      >
        {users.length > 0 ? 'Login with another account' : 'Login with Discogs'}
      </button>
    </div>
  );
};

export default Login;
