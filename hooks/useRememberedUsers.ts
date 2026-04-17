'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'discogs-remembered-users';

export interface RememberedUser {
  username: string;
  avatar_url: string;
  lastLogin: string;
}

function readUsers(): RememberedUser[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function useRememberedUsers() {
  const [users, setUsers] = useState<RememberedUser[]>([]);

  useEffect(() => {
    setUsers(readUsers());
  }, []);

  const saveUser = useCallback((username: string, avatar_url: string) => {
    const current = readUsers();
    const filtered = current.filter((u) => u.username !== username);
    const updated: RememberedUser[] = [
      { username, avatar_url, lastLogin: new Date().toISOString() },
      ...filtered,
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setUsers(updated);
  }, []);

  const removeUser = useCallback((username: string) => {
    const current = readUsers();
    const updated = current.filter((u) => u.username !== username);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setUsers(updated);
  }, []);

  return { users, saveUser, removeUser };
}
