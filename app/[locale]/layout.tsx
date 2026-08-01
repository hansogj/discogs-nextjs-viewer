import type { Metadata } from "next";
import { Inter, Fraunces, Space_Mono } from "next/font/google";
import Script from "next/script";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import { notFound } from "next/navigation";
import "../globals.css";
import React from "react";
import { Link, routing } from "@/i18n/routing";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["400", "600", "900"],
  display: "swap",
});
const spaceMono = Space_Mono({
  subsets: ["latin"],
  variable: "--font-space-mono",
  weight: ["400", "700"],
  display: "swap",
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "common" });
  return {
    title: t("appTitle"),
    description: t("appDescription"),
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// Inline, render-blocking so the theme is set before first paint.
// Without this, the page would flash in the default theme before React
// hydrates and the ThemePicker can apply the persisted choice.
const themeInitScript = `
(function(){
  try {
    var t = localStorage.getItem('theme');
    var allowed = ['dark-blue','earthy','olive','light'];
    if (!t || allowed.indexOf(t) === -1) t = 'dark-blue';
    document.documentElement.dataset.theme = t;
  } catch (e) {}
})();
`;

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);
  const messages = await getMessages();
  const t = await getTranslations("footer");

  return (
    <html
      lang={locale}
      // The inline themeInitScript below sets data-theme on this element
      // before hydration, so the server tree (without data-theme) and the
      // client tree (with it) intentionally differ. suppressHydrationWarning
      // tells React this is expected and prevents the warning from cascading
      // into a hydration failure that leaves child components un-hydrated.
      suppressHydrationWarning
      className={`${inter.variable} ${fraunces.variable} ${spaceMono.variable}`}
    >
      <head>
        {/*
          `next/script` with `beforeInteractive` inlines this into the
          document head and runs it before hydration, so the theme is
          applied before first paint. Using a raw <script> here trips
          React 19's "scripts inside components aren't executed" guard.
        */}
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
      </head>
      <body className="flex min-h-screen flex-col bg-discogs-bg font-sans text-discogs-text">
        <NextIntlClientProvider messages={messages} locale={locale}>
          <div className="flex-1">{children}</div>
          <footer className="border-t border-discogs-border px-4 py-3 text-center text-xs text-discogs-text-secondary">
            {/*
              The Discogs TOU-mandated attribution phrase MUST stay verbatim
              in English regardless of locale — it's a legal/trademark notice.
            */}
            This application uses Discogs&apos; API but is not affiliated with,
            sponsored or endorsed by Discogs.{" "}
            <Link href="/about" className="text-discogs-blue hover:underline">
              {t("aboutLink")}
            </Link>
          </footer>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
