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
        subtle: "0 1px 3px rgba(0, 79, 46, 0.06), 0 1px 2px rgba(0, 79, 46, 0.06)",
        card: "0 2px 8px rgba(0, 79, 46, 0.10)",
        elevated: "0 12px 28px rgba(0, 79, 46, 0.16), 0 4px 10px rgba(0, 79, 46, 0.08)",
        modal: "0 8px 32px rgba(0, 79, 46, 0.18)",
      },
      backgroundImage: {
        "gradient-primary": "linear-gradient(135deg, #004F2E 0%, #006850 100%)",
        "gradient-hero":
          "radial-gradient(ellipse at top left, rgba(0, 104, 80, 0.35) 0%, transparent 55%), linear-gradient(160deg, #004F2E 0%, #003a22 55%, #002417 100%)",
        "gradient-surface": "linear-gradient(160deg, #fdfdd0 0%, #f3f2c2 45%, #c8d5c0 130%)",
      },
    },
  },
  plugins: [],
};
