/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    screens: {
      "base-1513": "1513px",
    },

    extend: {
      fontFamily: {
        inter: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        dmSans: [
          "DM Sans",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        poppins: [
          "Poppins",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
      },
      colors: {
        page: "#f5f5f5",
        gray: {
          300: "#D0D5DD",
          500: "#667085",
          600: "#475467",
          700: "#344054",
          900: "#101828",
        },
        blue: {
          500: "#2970FF",
        },
      },
      boxShadow: {
        "login-card": "0 10px 24px 0 rgba(16, 24, 40, 0.06)",
        input: "0 0.0625rem 0.125rem 0 rgba(16, 24, 40, 0.05)",
      },
    },
  },
  plugins: [],
};
