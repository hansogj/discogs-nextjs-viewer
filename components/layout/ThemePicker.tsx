'use client';

import React, { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

type Theme = 'dark-blue' | 'earthy' | 'olive' | 'light';

interface ThemeOption {
  id: Theme;
  label: string;
  // Two-stop preview swatch: background + accent.
  swatch: [string, string];
}

const THEMES: ThemeOption[] = [
  { id: 'dark-blue', label: 'Dark blue', swatch: ['#101114', '#3498db'] },
  { id: 'earthy', label: 'Earthy', swatch: ['#15120c', '#e8a33d'] },
  { id: 'olive', label: 'Olive', swatch: ['#1a1d12', '#8db342'] },
  { id: 'light', label: 'Light', swatch: ['#ece3d1', '#c56a1e'] },
];

const STORAGE_KEY = 'theme';
const DEFAULT_THEME: Theme = 'dark-blue';

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // localStorage may be unavailable (privacy mode); ignore.
  }
}

function subscribeThemeAttribute(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
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

export default function ThemePicker() {
  // Subscribe to the data-theme attribute on <html>. The inline init script in
  // app/layout.tsx applies the persisted choice before this component mounts,
  // so we just mirror what's already on the DOM.
  const theme = useSyncExternalStore(
    subscribeThemeAttribute,
    getThemeSnapshot,
    getServerThemeSnapshot,
  );
  const [open, setOpen] = useState(false);

  // Close the menu on outside click.
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-theme-picker]')) setOpen(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [open]);

  const handleSelect = useCallback((next: Theme) => {
    applyTheme(next);
    setOpen(false);
  }, []);

  const active = THEMES.find((t) => t.id === theme) ?? THEMES[0];

  return (
    <div className="relative" data-theme-picker>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Theme: ${active.label}`}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg border border-discogs-border bg-discogs-bg-light px-3 py-2 text-sm text-discogs-text transition-colors hover:bg-discogs-border focus:outline-none focus:ring-2 focus:ring-discogs-blue"
        title="Switch theme"
      >
        <span
          className="block h-4 w-6 overflow-hidden rounded-sm border border-discogs-border"
          aria-hidden="true"
        >
          <span
            className="block h-full w-1/2 float-left"
            style={{ background: active.swatch[0] }}
          />
          <span
            className="block h-full w-1/2"
            style={{ background: active.swatch[1] }}
          />
        </span>
        <span className="hidden sm:inline">{active.label}</span>
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label="Theme"
          className="absolute right-0 z-50 mt-1 min-w-[160px] overflow-hidden rounded-lg border border-discogs-border bg-discogs-bg-light shadow-lg"
        >
          {THEMES.map((opt) => {
            const selected = opt.id === theme;
            return (
              <li key={opt.id} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => handleSelect(opt.id)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                    selected
                      ? 'bg-discogs-blue text-white'
                      : 'text-discogs-text hover:bg-discogs-border'
                  }`}
                >
                  <span
                    className="block h-4 w-6 overflow-hidden rounded-sm border border-discogs-border"
                    aria-hidden="true"
                  >
                    <span
                      className="block h-full w-1/2 float-left"
                      style={{ background: opt.swatch[0] }}
                    />
                    <span
                      className="block h-full w-1/2"
                      style={{ background: opt.swatch[1] }}
                    />
                  </span>
                  <span>{opt.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
