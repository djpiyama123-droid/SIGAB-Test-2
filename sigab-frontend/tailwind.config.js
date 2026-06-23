/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  safelist: [
    // KPICard y componentes con clases dinámicas por color
    { pattern: /bg-(emerald|red|yellow|blue|indigo|violet|purple|orange|slate|green)-(400|500)\/10/ },
    { pattern: /text-(emerald|red|yellow|blue|indigo|violet|purple|orange|slate|green)-(300|400|500)/ },
    { pattern: /border-(emerald|red|yellow|blue|indigo|violet|purple|orange|slate|green)-(400|500)\/20/ },
    { pattern: /ring-(emerald|red|yellow|blue|indigo|violet|purple|orange|slate|green)-(400|500)/ },
  ],
  theme: {
    extend: {
      screens: {
        '3xl': '1920px',  // 24" Full HD
        '5xl': '3840px',  // 55" 4K
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Courier New', 'monospace'],
        display: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
        body: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'xs':   ['clamp(0.75rem, 1vw, 1rem)',     { lineHeight: '1rem' }],
        'sm':   ['clamp(0.875rem, 1.25vw, 1.25rem)', { lineHeight: '1.25rem' }],
        'base': ['clamp(1rem, 1.5vw, 1.5rem)',    { lineHeight: '1.5rem' }],
        'lg':   ['clamp(1.125rem, 1.75vw, 1.75rem)', { lineHeight: '1.75rem' }],
        'xl':   ['clamp(1.25rem, 2vw, 2rem)',     { lineHeight: '2rem' }],
        '2xl':  ['clamp(1.5rem, 2.5vw, 2.5rem)', { lineHeight: '2.5rem' }],
        '3xl':  ['clamp(1.875rem, 3vw, 3rem)',    { lineHeight: '3rem' }],
        '4xl':  ['clamp(2.25rem, 4vw, 4rem)',     { lineHeight: '1' }],
      },
      colors: {
        sigah: {
          blue:    '#006CB7',
          emerald: '#059669',
        },
        // Clinical Precision Glass (Stitch / Apple-Medical) — Fase diseño premium
        'cyan-glow':  '#22D3EE',
        'ai-violet':  '#8B5CF6',
        glass: {
          0: '#020617',   // fondo base (deep slate)
        },
      },
      boxShadow: {
        'blue-sm':  '0 4px 20px rgba(0,108,183,0.25)',
      },
      animation: {
        'slide-up':   'slideUp 0.25s cubic-bezier(0.16,1,0.3,1)',
      },
      keyframes: {
        slideUp: { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
};