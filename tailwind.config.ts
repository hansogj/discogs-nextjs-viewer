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
        'discogs-blue': '#3498db',
        'discogs-blue-dark': '#2980b9',
        'discogs-bg': '#101114',
        'discogs-bg-light': '#1d1f24',
        'discogs-border': '#2f323a',
        'discogs-text': '#e0e0e0',
        'discogs-text-secondary': '#a0a0a0',
      },
      boxShadow: {
        'glow-blue': '0 0 15px 5px rgba(52, 152, 219, 0.2)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.5s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0'},
          '100%': { transform: 'translateY(0)', opacity: '1' },
        }
      }
    },
  },
  plugins: [],
};
export default config;
