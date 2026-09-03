/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#004F2E",
          light: "#006850",
        },
        accent: {
          DEFAULT: "#D4AF37",
          dark: "#B8981F",
        },
        ivory: "#FDFDD0",
        sage: "#C8D5C0",
        "dark-brown": "#2E2417",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        display: ["Lora", "serif"],
      },
      boxShadow: {
        card: "0 2px 8px rgba(0, 79, 46, 0.10)",
        modal: "0 8px 32px rgba(0, 79, 46, 0.18)",
      },
    },
  },
  plugins: [],
};
