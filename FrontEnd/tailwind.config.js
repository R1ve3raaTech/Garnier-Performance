/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Verde lima Garnier
        brand: {
          50:  '#f4fce8',
          100: '#e5f7c5',
          200: '#cef09a',
          300: '#b3e465',
          400: '#9cd543',
          500: '#8DC63F',   // ← Primary (logo verde lima)
          600: '#72a430',
          700: '#578026',
          800: '#42631e',
          900: '#315219',
        },
        // Gris oscuro Garnier
        garnier: {
          700: '#5a5a5a',
          800: '#4A4A4A',   // ← "GARNIER" text color
          900: '#333333',
        },
      },
    },
  },
  plugins: [],
};
