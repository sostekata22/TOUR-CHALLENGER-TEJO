/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        tejo: {
          dark: '#0f172a',
          card: '#1e293b',
          accent: '#0284c7',
          gold: '#f59e0b',
          sand: '#d97706',
          danger: '#ef4444',
          success: '#10b981',
          female: '#ec4899',
          male: '#3b82f6'
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      },
      animation: {
        'siren-fast': 'siren 0.5s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2s infinite',
        'bounce-slow': 'bounce 2s infinite',
      },
      keyframes: {
        siren: {
          '0%, 100%': { backgroundColor: 'rgba(239, 68, 68, 0.4)' },
          '50%': { backgroundColor: 'rgba(59, 130, 246, 0.4)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 15px rgba(245, 158, 11, 0.5)' },
          '50%': { boxShadow: '0 0 30px rgba(245, 158, 11, 0.9)' },
        }
      }
    },
  },
  plugins: [],
}
