"use client";

import { useEffect } from "react";
import Header from "./Header";
import type { DiscogsUser } from "@/lib/types";
import { useSyncContext } from "@/lib/sync-context";
import { useRememberedUsers } from "@/hooks/useRememberedUsers";

interface AppContainerProps {
  user: DiscogsUser;
  activeView: "collection" | "wantlist" | "duplicates" | "stats" | "user";
  collectionCount: number;
  wantlistCount: number;
  duplicatesCount: number;
}

export default function AppContainer({
  user,
  activeView,
  collectionCount,
  wantlistCount,
  duplicatesCount,
}: AppContainerProps) {
  const { isSyncing, syncProgress, onSync } = useSyncContext();
  const { saveUser } = useRememberedUsers();

  useEffect(() => {
    if (user?.username) {
      saveUser(user.username, user.avatar_url);
    }
  }, [user?.username, user?.avatar_url, saveUser]);

  return (
    <Header
      user={user}
      activeView={activeView}
      collectionCount={collectionCount}
      wantlistCount={wantlistCount}
      duplicatesCount={duplicatesCount}
      onSync={onSync}
      isSyncing={isSyncing}
      syncProgress={syncProgress}
    />
  );
}
