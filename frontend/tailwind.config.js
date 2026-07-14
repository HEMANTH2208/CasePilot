/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        brand: {
          50: "#f0fdff",
          100: "#ccfbfe",
          200: "#99f6fc",
          300: "#67e8f9",
          400: "#22d3ee",
          500: "#06b6d4",
          600: "#0891b2",
          700: "#0e7490",
          800: "#155e75",
          900: "#164e63"
        }
      },
      boxShadow: {
        soft: "0 10px 30px rgba(0, 0, 0, 0.5)",
        glow: "0 0 40px -10px rgba(56, 189, 248, 0.15)"
      }
    }
  },
  plugins: []
};
