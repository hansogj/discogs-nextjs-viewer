"use client";

import React, { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter, routing, type Locale } from "@/i18n/routing";

// Compact select-driven language switcher. Uses next-intl's locale-aware
// router so the new prefix replaces the current one on the same page.
// The router also writes the NEXT_LOCALE cookie so the choice survives
// direct URL entries.
export default function LanguagePicker() {
  const t = useTranslations("language");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextLocale = event.target.value as Locale;
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
    });
  };

  return (
    <label className="flex items-center gap-2 text-xs text-discogs-text-secondary">
      <span className="sr-only">{t("picker")}</span>
      <select
        value={locale}
        onChange={handleChange}
        disabled={isPending}
        aria-label={t("picker")}
        className="rounded-md border border-discogs-border bg-discogs-bg px-2 py-1 text-sm text-discogs-text focus:outline-none focus:ring-2 focus:ring-discogs-blue"
      >
        {routing.locales.map((loc) => (
          <option key={loc} value={loc}>
            {t(loc)}
          </option>
        ))}
      </select>
    </label>
  );
}
