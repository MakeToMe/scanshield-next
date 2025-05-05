/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0ea5e9', // sky-500
          dark: '#0284c7',    // sky-600
          light: '#38bdf8',   // sky-400
        },
        secondary: {
          DEFAULT: '#f43f5e', // rose-500
          dark: '#e11d48',    // rose-600
          light: '#fb7185',   // rose-400
        },
        dark: {
          DEFAULT: '#1e293b', // slate-800
          light: '#334155',   // slate-700
          darker: '#0f172a',  // slate-900
        },
        success: {
          DEFAULT: '#22c55e', // green-500
          dark: '#16a34a',    // green-600
        },
        warning: {
          DEFAULT: '#f59e0b', // amber-500
          dark: '#d97706',    // amber-600
        },
        danger: {
          DEFAULT: '#ef4444', // red-500
          dark: '#dc2626',    // red-600
        },
      },
      animation: {
        'pulse-border': 'pulse-border 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 1.5s ease-in-out infinite alternate',
        'siren': 'siren 1.5s infinite',
      },
      keyframes: {
        'pulse-border': {
          '0%, 100%': { borderColor: 'rgba(239, 68, 68, 0.5)' },
          '50%': { borderColor: 'rgba(239, 68, 68, 1)' },
        },
        'glow': {
          '0%': { boxShadow: '0 0 5px rgba(14, 165, 233, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(14, 165, 233, 0.8)' },
        },
        'siren': {
          '0%': { backgroundColor: 'rgba(239, 68, 68, 0)' },
          '50%': { backgroundColor: 'rgba(239, 68, 68, 0.3)' },
          '100%': { backgroundColor: 'rgba(239, 68, 68, 0)' },
        },
      },
    },
  },
  plugins: [],
};
