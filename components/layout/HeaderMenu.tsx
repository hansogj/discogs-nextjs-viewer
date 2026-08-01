"use client";

import React, { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import LanguagePicker from "./LanguagePicker";
import ThemePicker from "./ThemePicker";

interface HeaderMenuProps {
  onSync: () => void;
  onClearCache: () => void;
  isSyncing: boolean;
}

// Consolidates the header's right-side controls (sync, language, theme,
// clear cache, sign out) behind a single burger button so the top bar
// stays uncluttered on narrow viewports and quieter on wider ones.
export default function HeaderMenu({
  onSync,
  onClearCache,
  isSyncing,
}: HeaderMenuProps) {
  const t = useTranslations("header");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const onDocClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!rootRef.current?.contains(target)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleSyncClick = () => {
    if (isSyncing) return;
    setOpen(false);
    onSync();
  };

  const handleClearCacheClick = () => {
    setOpen(false);
    onClearCache();
  };

  const handleLogoutClick = async () => {
    setOpen(false);
    await fetch("/api/logout", { method: "POST" });
    router.refresh();
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("menu")}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-center rounded-lg border border-discogs-border bg-discogs-bg-light p-2 text-discogs-text transition-colors hover:bg-discogs-border focus:outline-none focus:ring-2 focus:ring-discogs-blue"
        title={t("menu")}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          aria-label={t("menu")}
          className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-lg border border-discogs-border bg-discogs-bg-light shadow-xl"
        >
          <button
            role="menuitem"
            type="button"
            onClick={handleSyncClick}
            disabled={isSyncing}
            className={clsx(
              "flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium transition-colors",
              isSyncing
                ? "cursor-not-allowed text-discogs-text-secondary"
                : "text-white bg-discogs-success hover:bg-discogs-success-dark",
            )}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={clsx("h-5 w-5", isSyncing && "animate-spin")}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span>{isSyncing ? t("syncing") : t("sync")}</span>
          </button>

          <div className="border-t border-discogs-border/60 px-4 py-3">
            <div className="flex items-center justify-between">
              <LanguagePicker />
            </div>
          </div>

          <div className="border-t border-discogs-border/60 px-4 py-3">
            <div className="flex items-center justify-between">
              <ThemePicker />
            </div>
          </div>

          <div className="border-t border-discogs-border/60">
            <button
              role="menuitem"
              type="button"
              onClick={handleClearCacheClick}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-discogs-text-secondary transition-colors hover:bg-discogs-border hover:text-discogs-text"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{t("clearCache")}</span>
            </button>
          </div>

          <div className="border-t border-discogs-border/60">
            <button
              role="menuitem"
              type="button"
              onClick={handleLogoutClick}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-white bg-discogs-danger transition-colors hover:bg-discogs-danger-dark"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              <span>{t("logout")}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
