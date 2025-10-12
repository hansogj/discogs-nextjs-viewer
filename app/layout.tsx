import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
// FIX: Import React to resolve 'Cannot find namespace' error for React.ReactNode.
import React from "react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Discogs Collection Viewer",
  description: "View your Discogs collection and wantlist with a modern interface.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-discogs-bg text-discogs-text`}>
        {children}
      </body>
    </html>
  );
}