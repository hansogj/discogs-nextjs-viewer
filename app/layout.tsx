import type { Metadata } from 'next';
import { Inter, Fraunces, Space_Mono } from 'next/font/google';
import './globals.css';
import React from 'react';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});
const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  weight: ['400', '600', '900'],
  display: 'swap',
});
const spaceMono = Space_Mono({
  subsets: ['latin'],
  variable: '--font-space-mono',
  weight: ['400', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Discogs Collection Viewer',
  description:
    'View your Discogs collection and wantlist with a modern interface.',
};

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      // The inline themeInitScript below sets data-theme on this element
      // before hydration, so the server tree (without data-theme) and the
      // client tree (with it) intentionally differ. suppressHydrationWarning
      // tells React this is expected and prevents the warning from cascading
      // into a hydration failure that leaves child components un-hydrated.
      suppressHydrationWarning
      className={`${inter.variable} ${fraunces.variable} ${spaceMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="bg-discogs-bg font-sans text-discogs-text">
        {children}
      </body>
    </html>
  );
}
