import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        inter: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        glass: {
          light: 'rgba(255, 255, 255, 0.03)',
          DEFAULT: 'rgba(255, 255, 255, 0.05)',
          heavy: 'rgba(255, 255, 255, 0.08)',
        },
        brand: {
          cyan: '#00E5FF',
          'cyan-deep': '#00C2FF',
          violet: '#7B61FF',
          orange: '#FFB547',
          'orange-deep': '#FF8A00',
        },
        neutral: {
          white: '#FFFFFF',
          ice: '#D9E1FF',
          'space-light': '#0B1020',
          'space-dark': '#050816',
        },
        surface: {
          DEFAULT: '#050816',
          light: '#0B1020',
          lighter: '#1a1a3a',
        },
        border: {
          glass: 'rgba(255, 255, 255, 0.08)',
          'glass-light': 'rgba(255, 255, 255, 0.15)',
        },
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #00E5FF, #7B61FF, #00C2FF)',
        'gradient-accent': 'linear-gradient(135deg, #FFB547, #FF8A00)',
        'gradient-dark': 'linear-gradient(180deg, #050816, #0B1020)',
        'gradient-radial': 'radial-gradient(ellipse at center, rgba(123, 97, 255, 0.15), transparent 70%)',
        'gradient-glow': 'radial-gradient(ellipse at center, rgba(0, 229, 255, 0.2), transparent 60%)',
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        glow: 'glow 3s ease-in-out infinite alternate',
        shimmer: 'shimmer 2s linear infinite',
        'neural-pulse': 'neuralPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ambient-breathe': 'ambientBreathe 8s ease-in-out infinite',
        'light-sweep': 'lightSweep 4s linear infinite',
        'spin-slow': 'spin 4s linear infinite',
        spotlight: 'spotlight 2s ease .75s 1 normal forwards',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-15px)' },
        },
        glow: {
          '0%': { filter: 'drop-shadow(0 0 15px rgba(0, 229, 255, 0.3)) drop-shadow(0 0 30px rgba(123, 97, 255, 0.2))' },
          '100%': { filter: 'drop-shadow(0 0 25px rgba(0, 229, 255, 0.6)) drop-shadow(0 0 50px rgba(123, 97, 255, 0.4))' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        neuralPulse: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '.7', transform: 'scale(1.05)' },
        },
        ambientBreathe: {
          '0%, 100%': { transform: 'scale(1)', filter: 'brightness(1)' },
          '50%': { transform: 'scale(1.02)', filter: 'brightness(1.15)' },
        },
        lightSweep: {
          '0%': { backgroundPosition: '200% center' },
          '100%': { backgroundPosition: '-200% center' },
        },
        spotlight: {
          '0%': {
            opacity: '0',
            transform: 'translate(-72%, -62%) scale(0.5)',
          },
          '100%': {
            opacity: '1',
            transform: 'translate(-50%, -40%) scale(1)',
          },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
};

export default config;
