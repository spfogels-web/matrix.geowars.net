/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}','./components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        orbitron: ['Orbitron','sans-serif'],
        mono: ['"Share Tech Mono"','monospace'],
        exo: ['"Exo 2"','sans-serif'],
      },
      colors: {
        cyan: { neon: '#00f5ff' },
        red:  { neon: '#ff2d55' },
        orange: { neon: '#ff6a00' },
        green:  { neon: '#00ff9d' },
        purple: { neon: '#b44fff' },
        gold:   { neon: '#ffd700' },
      },
      animation: {
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'ping-slow':  'ping 2s cubic-bezier(0,0,0.2,1) infinite',
        'spin-slow':  'spin 8s linear infinite',
        'glow':       'glow 2s ease-in-out infinite',
        'scanline':   'scanline 4s linear infinite',
        'fadeIn':     'fadeIn 0.5s ease-out',
        'slideUp':    'slideUp 0.4s ease-out',
        'slideLeft':  'slideLeft 0.4s ease-out',
      },
      keyframes: {
        glow: { '0%,100%':{ opacity:'0.6' }, '50%':{ opacity:'1' } },
        scanline: { '0%':{ top:'-2px' }, '100%':{ top:'100%' } },
        fadeIn: { from:{ opacity:'0' }, to:{ opacity:'1' } },
        slideUp: { from:{ opacity:'0', transform:'translateY(12px)' }, to:{ opacity:'1', transform:'translateY(0)' } },
        slideLeft: { from:{ opacity:'0', transform:'translateX(16px)' }, to:{ opacity:'1', transform:'translateX(0)' } },
      },
    },
  },
  plugins: [],
}
