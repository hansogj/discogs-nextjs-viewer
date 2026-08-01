import { defineRouting } from "next-intl/routing";
import { createNavigation } from "next-intl/navigation";

export const routing = defineRouting({
  // Supported locales, in the order shown in the language picker.
  // - en: source of truth (all string keys originate here)
  // - nb: Norwegian Bokmål
  // - de: Deutsch
  // - fr: Français
  // - zeuhl: Magma's invented Kobaïan language — placeholder values in the
  //   messages file until a human fills them in.
  locales: ["en", "nb", "de", "fr", "zeuhl"],
  defaultLocale: "en",
  // Read the `NEXT_LOCALE` cookie to persist the user's picker choice
  // across navigations.
  localeCookie: {
    name: "NEXT_LOCALE",
  },
});

export type Locale = (typeof routing.locales)[number];

// Locale-aware Link / router / redirect. Import these instead of the
// `next/link` and `next/navigation` equivalents so hrefs auto-prefix with
// the current locale.
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
