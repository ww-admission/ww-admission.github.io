/** @type {import('tailwindcss').Config} */
import defaultTheme from "tailwindcss/defaultTheme";
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  darkMode: ["selector"],
  safelist: [
    {
      pattern: /col-span-(\d+)/,
      variants: ["lg"],
    },
    {
      pattern: /h-(0|2|3|4|6|8|12|16|24|32)/,
      variants: ["lg"],
    },
    {
      pattern: /text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)/,
      variants: ["lg"],
    },
    {
      pattern: /font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)/,
    },
    {
      pattern: /text-(left|center|right)/,
    },
  ],
  theme: {
    extend: {
      colors: {
        transparent: "transparent",
        // Rose WWA — couleur principale de la marque (#F02860)
        primary: {
          50:  "#fff2f6",
          100: "#ffe3eb",
          200: "#ffcddb",
          300: "#ffb8cc",
          400: "#ff628e",
          500: "#F02860",  // Rose WWA (charte graphique)
          600: "#E1104B",
          700: "#C71043",
          800: "#BA093A",
          900: "#900030",
          950: "#600020",
        },
        // Jaune Étoile d'Or — couleur secondaire de la marque (#FDD737)
        gold: {
          50:  "#FFFBEB",
          100: "#FFF7E1",
          200: "#FFEFAC",
          300: "#FFE782",
          400: "#FDC837",
          500: "#FDD737",  // Jaune Étoile d'Or (charte graphique)
          600: "#FABD16",
          700: "#F1B100",
          800: "#d4990a",
          900: "#a37500",
        },
        neutral: {
          50:  "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
          950: "#020617",
        },
      },
      cursor: {
        fancy: "url(https://www.svgrepo.com/show/269/color-picker.svg)",
      },
      fontFamily: {
        sans:     ["Inter",   ...defaultTheme.fontFamily.sans],
        headings: ["Sora",    ...defaultTheme.fontFamily.sans],
        body:     ["Figtree", ...defaultTheme.fontFamily.sans],
      },
      keyframes: {
        dropdown: {
          "0%":   { transform: "translateY(-0.5rem)", opacity: 0 },
          "100%": { transform: "translateY(0)",        opacity: 1 },
        },
        fadeInShadowLight: {
          "100%": { boxShadow: "0 20px 25px -5px rgba(15,23,42,.025),0 8px 10px -6px rgba(15,23,42,.025)" },
        },
        fadeInShadowDark: {
          "100%": { boxShadow: "0 20px 25px -5px rgba(2,6,23,.25),0 8px 10px -6px rgba(2,6,23,.25)" },
        },
        "slide-in-right": {
          "0%":   { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
      },
      animation: {
        dropdown:          "dropdown 200ms ease-out forwards",
        fadeInShadowLight: "fadeInShadowLight 500ms ease-in-out forwards",
        fadeInShadowDark:  "fadeInShadowDark 500ms ease-in-out forwards",
        "slide-in-right":  "slide-in-right 300ms ease-out forwards",
      },
    },
  },
  variants: {
    animation: ["responsive"],
  },
  plugins: [
    require("@tailwindcss/typography"),
    require("tailwindcss/plugin")(function ({ addVariant }) {
      addVariant("dark-me", ".dark_&");
    }),
  ],
};
