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
        'xs': '320px',
        '3xl': '1920px',  // 24" Full HD
        '4xl': '2560px',  // 27" 1440p / 2K
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
        medical: {
          green:  '#10B981',
          yellow: '#F59E0B',
          red:    '#EF4444',
        },
        imss: {
          green: '#065F46',
          dark:  '#064E3B',
          blue:  '#006CB7',
        },
        sigah: {
          blue:            '#006CB7',
          'blue-dark':     '#00497D',
          'blue-light':    '#DCEBF7',
          emerald:         '#059669',
          'emerald-light': '#DCFCE7',
          amber:           '#B45309',
          'amber-light':   '#FEF3C7',
          red:             '#B91C1C',
          'red-light':     '#FEE2E2',
          slate:           '#1E293B',
          gray:            '#64748B',
          'gray-light':    '#F1F5F9',
        },
        // Clinical Precision Glass (Stitch / Apple-Medical) — Fase diseño premium
        'cyan-glow':  '#22D3EE',
        'ai-violet':  '#8B5CF6',
        glass: {
          0: '#020617',   // fondo base (deep slate)
          50:'#060e20',
          100:'#0b1326',
          200:'#131b2e',
          300:'#171f33',
          400:'#222a3d',
          500:'#2d3449',
        },
      },
      backgroundImage: {
        'sigah-gradient':        'linear-gradient(135deg, #006CB7 0%, #00497D 100%)',
        'sigah-emerald-gradient':'linear-gradient(135deg, #059669 0%, #047857 100%)',
      },
      boxShadow: {
        'blue-sm':  '0 4px 20px rgba(0,108,183,0.25)',
        'blue-lg':  '0 8px 40px rgba(0,108,183,0.35)',
        'green-sm': '0 4px 20px rgba(5,150,105,0.25)',
      },
      backdropBlur: {
        'xs': '4px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'fade-in':    'fadeIn 0.2s ease-out',
        'slide-up':   'slideUp 0.25s cubic-bezier(0.16,1,0.3,1)',
      },
      keyframes: {
        fadeIn:  { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
};
