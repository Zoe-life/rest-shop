/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        saffron: {
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FB923C',
          500: '#FF9933', // Bright saffron
          600: '#EA580C',
          700: '#C2410C',
          800: '#9A3412',
          900: '#7C2D12',
        },
        navy: {
          50: '#F0F4FF',
          100: '#E0E9FF',
          200: '#C3D4FE',
          300: '#A4B8FE',
          400: '#6B8AFE',
          500: '#4662FE',
          600: '#002366', // Navy blue
          700: '#001A4D',
          800: '#001333',
          900: '#000D1A',
        },
      },
    },
  },
  plugins: [],
}
