/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        premium: {
          dark: "#0a0a0c",
          card: "#16161a",
          accent: "#6366f1",
          secondary: "#ec4899",
          text: "#e2e8f0",
          muted: "#94a3b8",
        }
      },
      backgroundImage: {
        'gradient-premium': 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)',
      }
    },
  },
  plugins: [],
}
