"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import clsx from "clsx";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter, routing, type Locale } from "@/i18n/routing";

interface HeaderMenuProps {
  onSync: () => void;
  onClearCache: () => void;
  isSyncing: boolean;
}

type MenuView = "main" | "language" | "theme";

type Theme = "dark-blue" | "earthy" | "olive" | "light";

interface ThemeOption {
  id: Theme;
  labelKey: "darkBlue" | "earthy" | "olive" | "light";
  // Two-stop preview swatch: background + accent.
  swatch: [string, string];
}

const THEMES: ThemeOption[] = [
  { id: "dark-blue", labelKey: "darkBlue", swatch: ["#101114", "#3498db"] },
  { id: "earthy", labelKey: "earthy", swatch: ["#15120c", "#e8a33d"] },
  { id: "olive", labelKey: "olive", swatch: ["#1a1d12", "#8db342"] },
  { id: "light", labelKey: "light", swatch: ["#ece3d1", "#c56a1e"] },
];

const THEME_STORAGE_KEY = "theme";
const DEFAULT_THEME: Theme = "dark-blue";

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // localStorage may be unavailable (privacy mode); ignore.
  }
}

function subscribeThemeAttribute(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

function getThemeSnapshot(): Theme {
  const current = document.documentElement.dataset.theme as Theme | undefined;
  return current && THEMES.some((t) => t.id === current)
    ? current
    : DEFAULT_THEME;
}

function getServerThemeSnapshot(): Theme {
  return DEFAULT_THEME;
}

// Consolidates the header's right-side controls (sync, language, theme,
// clear cache, sign out) behind a single burger button. Language and theme
// each open as a sub-view within the same dropdown panel so nothing spills
// out sideways.
export default function HeaderMenu({
  onSync,
  onClearCache,
  isSyncing,
}: HeaderMenuProps) {
  const t = useTranslations("header");
  const tLang = useTranslations("language");
  const tTheme = useTranslations("theme");
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const [view, setView] = useState<MenuView>("main");
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const theme = useSyncExternalStore(
    subscribeThemeAttribute,
    getThemeSnapshot,
    getServerThemeSnapshot,
  );
  const activeTheme = THEMES.find((th) => th.id === theme) ?? THEMES[0];

  const close = useCallback(() => {
    setOpen(false);
    setView("main");
  }, []);

  useEffect(() => {
    if (!open) return;

    const onDocClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!rootRef.current?.contains(target)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  const handleSyncClick = () => {
    if (isSyncing) return;
    close();
    onSync();
  };

  const handleClearCacheClick = () => {
    close();
    onClearCache();
  };

  const handleLogoutClick = async () => {
    close();
    await fetch("/api/logout", { method: "POST" });
    router.refresh();
  };

  const handleLocaleSelect = (nextLocale: Locale) => {
    if (nextLocale === locale) {
      setView("main");
      return;
    }
    close();
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
    });
  };

  const handleThemeSelect = (nextTheme: Theme) => {
    applyTheme(nextTheme);
    setView("main");
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
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-discogs-border bg-discogs-bg-light text-discogs-text transition-colors hover:bg-discogs-border focus:outline-none focus:ring-2 focus:ring-discogs-blue"
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
          {view === "main" && (
            <>
              <button
                role="menuitem"
                type="button"
                onClick={handleSyncClick}
                disabled={isSyncing}
                className={clsx(
                  "flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium transition-colors",
                  isSyncing
                    ? "cursor-not-allowed text-discogs-text-secondary"
                    : "bg-discogs-success text-white hover:bg-discogs-success-dark",
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

              <div className="border-t border-discogs-border/60">
                <SubmenuLink
                  icon={<LanguageIcon />}
                  label={tLang("picker")}
                  value={tLang(locale as Locale)}
                  onClick={() => setView("language")}
                />
                <SubmenuLink
                  icon={<PaletteIcon />}
                  label={tTheme("picker")}
                  value={tTheme(activeTheme.labelKey)}
                  onClick={() => setView("theme")}
                />
              </div>

              <div className="border-t border-discogs-border/60">
                <button
                  role="menuitem"
                  type="button"
                  onClick={handleClearCacheClick}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-discogs-text-secondary transition-colors hover:bg-discogs-border hover:text-discogs-text"
                >
                  <TrashIcon />
                  <span>{t("clearCache")}</span>
                </button>
              </div>

              <div className="border-t border-discogs-border/60">
                <button
                  role="menuitem"
                  type="button"
                  onClick={handleLogoutClick}
                  className="flex w-full items-center gap-3 bg-discogs-danger px-4 py-3 text-left text-sm font-medium text-white transition-colors hover:bg-discogs-danger-dark"
                >
                  <LogoutIcon />
                  <span>{t("logout")}</span>
                </button>
              </div>
            </>
          )}

          {view === "language" && (
            <SubmenuList
              title={tLang("picker")}
              onBack={() => setView("main")}
              busy={isPending}
            >
              {routing.locales.map((loc) => (
                <SubmenuOption
                  key={loc}
                  label={tLang(loc)}
                  selected={loc === locale}
                  onClick={() => handleLocaleSelect(loc)}
                />
              ))}
            </SubmenuList>
          )}

          {view === "theme" && (
            <SubmenuList
              title={tTheme("picker")}
              onBack={() => setView("main")}
            >
              {THEMES.map((opt) => (
                <SubmenuOption
                  key={opt.id}
                  label={tTheme(opt.labelKey)}
                  selected={opt.id === theme}
                  onClick={() => handleThemeSelect(opt.id)}
                  leading={
                    <span
                      className="block h-4 w-6 flex-shrink-0 overflow-hidden rounded-sm border border-discogs-border"
                      aria-hidden="true"
                    >
                      <span
                        className="float-left block h-full w-1/2"
                        style={{ background: opt.swatch[0] }}
                      />
                      <span
                        className="block h-full w-1/2"
                        style={{ background: opt.swatch[1] }}
                      />
                    </span>
                  }
                />
              ))}
            </SubmenuList>
          )}
        </div>
      )}
    </div>
  );
}

function SubmenuLink({
  icon,
  label,
  value,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onClick: () => void;
}) {
  return (
    <button
      role="menuitem"
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-discogs-text transition-colors hover:bg-discogs-border"
    >
      {icon}
      <span className="flex-1">{label}</span>
      <span className="text-xs text-discogs-text-secondary">{value}</span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-4 w-4 text-discogs-text-secondary"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
          clipRule="evenodd"
        />
      </svg>
    </button>
  );
}

function SubmenuList({
  title,
  onBack,
  busy,
  children,
}: {
  title: string;
  onBack: () => void;
  busy?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="flex w-full items-center gap-2 border-b border-discogs-border/60 px-4 py-3 text-left text-sm font-medium text-discogs-text-secondary transition-colors hover:bg-discogs-border hover:text-discogs-text"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
        <span>{title}</span>
      </button>
      <ul
        className={clsx("py-1", busy && "pointer-events-none opacity-60")}
        role="menu"
      >
        {children}
      </ul>
    </div>
  );
}

function SubmenuOption({
  label,
  selected,
  onClick,
  leading,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  leading?: React.ReactNode;
}) {
  return (
    <li role="none">
      <button
        role="menuitemradio"
        aria-checked={selected}
        type="button"
        onClick={onClick}
        className={clsx(
          "flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors",
          selected
            ? "bg-discogs-blue text-white"
            : "text-discogs-text hover:bg-discogs-border",
        )}
      >
        {leading}
        <span className="flex-1">{label}</span>
        {selected && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </button>
    </li>
  );
}

function LanguageIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5 flex-shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
      />
    </svg>
  );
}

function PaletteIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5 flex-shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5 flex-shrink-0"
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
  );
}

function LogoutIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5 flex-shrink-0"
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
  );
}
