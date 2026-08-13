/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        green: {
          50: '#fdf3f2',
          100: '#fbe4e4',
          200: '#f7c8c8',
          300: '#f0a2a2',
          400: '#e46e6e',
          500: '#d54141',
          600: '#be2929',
          700: '#9f1d1d',
          800: '#841c1c',
          900: '#630702',
          950: '#3f0200',
        },
        risk: {
          critical: "#dc2626",
          high: "#ea580c",
          medium: "#d97706",
          low: "#65a30d",
          info: "#0284c7",
        },
      },
    },
  },
  plugins: [],
};
