/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // "The Pass" Palette
        paper: {
          DEFAULT: "#FAF6EE", // Warm paper cream
          50: "#FCFAF6",
          100: "#FAF6EE",
          200: "#F3EDE0",
          300: "#E8DFC9",
          border: "#E4DCCE",
        },
        charcoal: {
          DEFAULT: "#1F1B16", // Deep kitchen ink
          900: "#1F1B16",
          800: "#2F2B24",
          700: "#453F36",
          muted: "#6B6358",
        },
        chalkboard: {
          DEFAULT: "#161513", // Blackboard dark background
          card: "#1F1E1B",
          cardHover: "#282622",
          border: "#2F2D28",
        },
        chalk: {
          DEFAULT: "#F5F2EB", // Chalkboard white text
          muted: "#A5A095",
        },
        chilli: {
          DEFAULT: "#D9381E", // Chilli red primary action
          hover: "#BF2E17",
          light: "#FDF2F0",
          darkLight: "#381B17",
        },
        turmeric: {
          DEFAULT: "#F2B01E", // Turmeric yellow warning
          hover: "#D99C15",
          light: "#FEF9EE",
          darkLight: "#332711",
        },
        leaf: {
          DEFAULT: "#2F7D4F", // Fresh leaf green
          hover: "#25663F",
          light: "#F0F7F3",
          darkLight: "#132D1E",
        },
        // Backwards compatibility tokens
        forest: {
          50: "#F0F7F3",
          100: "#DCFCE7",
          500: "#2F7D4F",
          600: "#25663F",
          700: "#1D5232",
          800: "#163E26",
          900: "#1F1B16",
        },
        warm: {
          50: "#FCFAF6",
          100: "#FAF6EE",
          200: "#F3EDE0",
          300: "#E4DCCE",
          400: "#C2B59D",
          500: "#6B6358",
        }
      },
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'serif'],
        sans: ['"DM Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'ticket': '0 2px 8px -2px rgba(31, 27, 22, 0.08), 0 1px 3px -1px rgba(31, 27, 22, 0.04)',
        'ticket-hover': '0 6px 16px -3px rgba(31, 27, 22, 0.12), 0 2px 6px -2px rgba(31, 27, 22, 0.06)',
        'ticket-dark': '0 3px 10px -2px rgba(0, 0, 0, 0.4)',
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        'chilli-glow': '0 0 16px -2px rgba(217, 56, 30, 0.35)',
      }
    },
  },
  plugins: [],
}
