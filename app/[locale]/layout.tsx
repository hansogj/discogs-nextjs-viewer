import type { Metadata } from "next";
import { Inter, Fraunces, Space_Mono } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import { cookies } from "next/headers";
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

const THEMES = ["dark-blue", "earthy", "olive", "light"] as const;
type Theme = (typeof THEMES)[number];
const DEFAULT_THEME: Theme = "dark-blue";

function isTheme(value: string | undefined): value is Theme {
  return !!value && (THEMES as readonly string[]).includes(value);
}

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

  // Server-render the persisted theme onto <html data-theme=…> so the
  // right theme is applied on the initial paint. Reading the theme from a
  // cookie (rather than a client-side inline script off localStorage)
  // means no <script> tag inside the React tree — which React 19 refuses
  // to execute on client renders and warns loudly about — and no
  // hydration mismatch since server and client see the same value.
  const themeCookie = (await cookies()).get("theme")?.value;
  const theme: Theme = isTheme(themeCookie) ? themeCookie : DEFAULT_THEME;

  return (
    <html
      lang={locale}
      data-theme={theme}
      className={`${inter.variable} ${fraunces.variable} ${spaceMono.variable}`}
    >
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
