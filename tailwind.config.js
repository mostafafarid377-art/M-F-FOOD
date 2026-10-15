/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Warm flame-orange brand palette
        primary: {
          DEFAULT: "#EA580C", // orange-600
          50: "#FFF7ED",
          100: "#FFEDD5",
          200: "#FED7AA",
          300: "#FDBA74",
          400: "#FB923C",
          500: "#F97316",
          600: "#EA580C",
          700: "#C2410C",
          800: "#9A3412",
          900: "#7C2D12",
        },
        secondary: {
          DEFAULT: "#7C2D12", // deep roasted orange
          600: "#9A3412",
          700: "#7C2D12",
        },
        sand: "#FFF9F2",
      },
    },
  },
  plugins: [],
};
