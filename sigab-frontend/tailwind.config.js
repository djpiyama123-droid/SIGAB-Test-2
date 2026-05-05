/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  safelist: [
    // KPICard y componentes con clases dinámicas por color
    { pattern: /bg-(emerald|red|yellow|blue|indigo|violet|purple|orange|slate|green)-(400|500)\/10/ },
    { pattern: /text-(emerald|red|yellow|blue|indigo|violet|purple|orange|slate|green)-(300|400|500)/ },
    { pattern: /border-(emerald|red|yellow|blue|indigo|violet|purple|orange|slate|green)-(400|500)\/20/ },
    { pattern: /ring-(emerald|red|yellow|blue|indigo|violet|purple|orange|slate|green)-(400|500)/ },
    // SIGAB v2 cobalt + teal2 — tokens utilizados por components/v2/SigabUI.jsx
    { pattern: /(bg|text|border|ring)-(cobalt|teal2)-(50|100|300|500|700|800|900)/ },
    { pattern: /(bg|text|border|ring)-(cobalt|teal2)-(50|100|300|500|700|800|900)\/(20|30|40|45|50|60|70|80)/ },
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
        sans: ['Lexend', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Courier New', 'monospace'],
        // SIGAB v2 — identidad visual aprobada por CTO (Montserrat headers + Open Sans body)
        sigabHead: ['Montserrat', 'Inter', 'system-ui', 'sans-serif'],
        sigabBody: ['Open Sans', 'Inter', 'system-ui', 'sans-serif'],
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
        sigab: {
          primary:   '#4F46E5',  // indigo-600 — marca principal (legacy v1)
          secondary: '#6366F1',  // indigo-500
          accent:    '#818CF8',  // indigo-400
          glow:      'rgba(79,70,229,0.15)',
        },
        // SIGAB v2 — paleta cobalt aprobada por CTO (sustituye indigo en migraciones nuevas)
        cobalt: {
          50:  '#EAF2F8',
          100: '#D4E5F0',
          300: '#85B6D4',
          500: '#3B7BA3',
          700: '#1B4F72',
          800: '#143850',
          900: '#0E2D43',
        },
        teal2: {
          50:  '#E6F2F6',
          100: '#C2DDE6',
          300: '#7FB3C2',
          500: '#2E86AB',
          700: '#246F8E',
          800: '#1C5872',
          900: '#143F52',
        },
      },
      backgroundImage: {
        'sigab-gradient': 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
        'glass-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
      },
      boxShadow: {
        'glass':    '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
        'indigo':   '0 4px 20px rgba(79,70,229,0.25)',
        'indigo-lg':'0 8px 40px rgba(79,70,229,0.35)',
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
