/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: "#05050A",
        cardBg: "rgba(15, 15, 25, 0.7)",
        primary: "#3B82F6", // blue
        secondary: "#8B5CF6", // purple
        accent: "#06B6D4", // cyan
        danger: "#EF4444",
        warning: "#F59E0B",
        success: "#10B981"
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'glow': '0 0 15px rgba(6, 182, 212, 0.5)',
        'glow-danger': '0 0 15px rgba(239, 68, 68, 0.5)',
      }
    },
  },
  plugins: [],
}
