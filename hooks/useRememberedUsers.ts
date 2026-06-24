"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "discogs-remembered-users";
const CHANGE_EVENT = "remembered-users-change";

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

// useSyncExternalStore requires getSnapshot to return a referentially stable
// value when underlying state hasn't changed. Cache against the raw JSON
// string so we only allocate a new array when localStorage actually changed.
let cachedRaw: string | null | undefined = undefined;
let cachedSnapshot: RememberedUser[] = [];

function getSnapshot(): RememberedUser[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cachedSnapshot = raw ? JSON.parse(raw) : [];
    }
    return cachedSnapshot;
  } catch {
    return cachedSnapshot;
  }
}

const SERVER_SNAPSHOT: RememberedUser[] = [];
const getServerSnapshot = () => SERVER_SNAPSHOT;

function subscribe(onChange: () => void) {
  // `storage` only fires cross-tab; we also dispatch a custom event for
  // same-tab updates from saveUser/removeUser.
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function notifyChange() {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function useRememberedUsers() {
  const users = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const saveUser = useCallback((username: string, avatar_url: string) => {
    const current = readUsers();
    const filtered = current.filter((u) => u.username !== username);
    const updated: RememberedUser[] = [
      { username, avatar_url, lastLogin: new Date().toISOString() },
      ...filtered,
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    notifyChange();
  }, []);

  const removeUser = useCallback((username: string) => {
    const current = readUsers();
    const updated = current.filter((u) => u.username !== username);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    notifyChange();
  }, []);

  return { users, saveUser, removeUser };
}
