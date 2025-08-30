/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        monad: {
          purple: '#8B5CF6',
          blue: '#3B82F6',
          green: '#10B981',
          red: '#EF4444',
        },
        prediction: {
          strong: '#DC2626',
          medium: '#F59E0B', 
          weak: '#06B6D4',
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-light': 'bounce 2s infinite',
        'gradient-shift': 'gradient-shift 3s ease infinite',
        'cube-float': 'cube-float 3s ease-in-out infinite alternate',
        'float-particle': 'float-particle 6s linear infinite',
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}