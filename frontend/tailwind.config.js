export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'SF Pro Display', 'system-ui', 'sans-serif'],
        display: ['Inter', 'SF Pro Display', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          DEFAULT: '#2E9E44',
          hover: '#25843A',
          light: '#DDF5E1',
          badge: '#EAF9EC',
        },
        bg: {
          DEFAULT: '#FAFBF9',
          card: '#FFFFFF',
          secondary: '#F6F8F4',
        },
        border: {
          DEFAULT: '#E4E9DF',
        },
        success: '#34C759',
        danger: '#FF5C5C',
        warning: '#FFB347',
        dark: {
          900: '#060913',
          800: '#0B1121',
          700: '#141C2F',
          600: '#1E293B',
          bg: '#060913',
          card: '#0B1121',
          text: '#F8FAFC',
          muted: '#94A3B8'
        },
        primary: {
          DEFAULT: '#7C3AED',
          hover: '#6D28D9',
          light: '#A78BFA'
        },
        accent: {
          DEFAULT: '#38BDF8',
          hover: '#0EA5E9'
        }
      },
      borderRadius: {
        btn: '12px',
        card: '18px',
        hero: '22px',
        input: '12px',
      },
      boxShadow: {
        soft: '0 6px 18px rgba(0,0,0,.05)',
        lift: '0 8px 24px rgba(0,0,0,.08)',
        'glow-primary': '0 0 20px -5px rgba(124, 58, 237, 0.5)',
        'glow-accent': '0 0 20px -5px rgba(56, 189, 248, 0.5)',
        'glass': '0 4px 30px rgba(0, 0, 0, 0.1)',
      },
      spacing: {
        18: '4.5rem',
        22: '5.5rem',
        30: '7.5rem',
      },
    },
  },
  plugins: [],
}
