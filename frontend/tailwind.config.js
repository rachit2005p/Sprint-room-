export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
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
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'glass-gradient': 'linear-gradient(145deg, rgba(20, 28, 47, 0.4) 0%, rgba(11, 17, 33, 0.4) 100%)',
      },
      boxShadow: {
        'glow-primary': '0 0 20px -5px rgba(124, 58, 237, 0.5)',
        'glow-accent': '0 0 20px -5px rgba(56, 189, 248, 0.5)',
        'glass': '0 4px 30px rgba(0, 0, 0, 0.1)',
      }
    },
  },
  plugins: [],
}
