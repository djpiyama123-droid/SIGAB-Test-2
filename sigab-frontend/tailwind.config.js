/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      screens: {
        'xs': '320px',
        '3xl': '1920px',  // 24" Full HD
        '4xl': '2560px',  // 27" 1440p / 2K
        '5xl': '3840px',  // 55" 4K
      },
      fontSize: {
        'xs': ['clamp(0.75rem, 1vw, 1rem)', { lineHeight: '1rem' }],
        'sm': ['clamp(0.875rem, 1.25vw, 1.25rem)', { lineHeight: '1.25rem' }],
        'base': ['clamp(1rem, 1.5vw, 1.5rem)', { lineHeight: '1.5rem' }],
        'lg': ['clamp(1.125rem, 1.75vw, 1.75rem)', { lineHeight: '1.75rem' }],
        'xl': ['clamp(1.25rem, 2vw, 2rem)', { lineHeight: '2rem' }],
        '2xl': ['clamp(1.5rem, 2.5vw, 2.5rem)', { lineHeight: '2.5rem' }],
        '3xl': ['clamp(1.875rem, 3vw, 3rem)', { lineHeight: '3rem' }],
        '4xl': ['clamp(2.25rem, 4vw, 4rem)', { lineHeight: '1' }],
      },
      colors: {
        medical: {
          green: '#10B981',
          yellow: '#F59E0B',
          red: '#EF4444',
        },
        imss: {
          green: '#065F46',
          dark: '#064E3B',
        },
      },
    },
  },
  plugins: [],
};
