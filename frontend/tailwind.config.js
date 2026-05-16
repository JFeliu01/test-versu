/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#F8FAFC",
        surface: "#FFFFFF",
        primary: "#0F172A",
        secondary: "#64748B",
        accent: "#3B82F6",
        border: "#E2E8F0"
      }
    },
  },
  plugins: [],
}