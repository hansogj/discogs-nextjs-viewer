import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // All theme-aware colors resolve to CSS variables defined per
        // [data-theme="..."] block in globals.css.
        "discogs-blue": "var(--color-accent)",
        "discogs-blue-dark": "var(--color-accent-dark)",
        "discogs-bg": "var(--color-bg)",
        "discogs-bg-light": "var(--color-bg-light)",
        "discogs-border": "var(--color-border)",
        "discogs-text": "var(--color-text)",
        "discogs-text-secondary": "var(--color-text-secondary)",
        "discogs-teal": "var(--color-teal)",
        "discogs-success": "var(--color-success)",
        "discogs-success-dark": "var(--color-success-dark)",
        "discogs-danger": "var(--color-danger)",
        "discogs-danger-dark": "var(--color-danger-dark)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        serif: ["var(--font-fraunces)", "ui-serif", "Georgia", "serif"],
        mono: [
          "var(--font-space-mono)",
          "ui-monospace",
          "SFMono-Regular",
          "monospace",
        ],
      },
      boxShadow: {
        "glow-blue": "0 0 15px 5px rgba(52, 152, 219, 0.2)",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-in-out",
        "slide-up": "slideUp 0.5s ease-in-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
