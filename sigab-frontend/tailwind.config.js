/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        imss: {
          green: '#065F46',
          dark: '#064E3B',
        },
      },
    },
  },
  plugins: [],
};
