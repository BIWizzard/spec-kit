import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // KGiQ Brand Colors
        'kgiq': {
          primary: '#FFD166',   // Golden Yellow
          secondary: '#8FAD77', // Sage Green
          tertiary: '#5E7F9B',  // Blue Gray
        },
        // Glassmorphic Design System
        'bg': {
          primary: '#0f172a',   // slate-900
          secondary: '#1e293b', // slate-800
          tertiary: '#334155',  // slate-700
        },
        'glass': {
          border: 'rgba(255, 255, 255, 0.2)',
          bg: 'rgba(255, 255, 255, 0.1)',
          'bg-sm': 'rgba(255, 255, 255, 0.05)',
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
