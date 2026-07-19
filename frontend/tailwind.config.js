// ──────────────────────────────────────────────
// Tailwind CSS — custom theme extensions
// ──────────────────────────────────────────────

export default {
  // ── Content paths: scan these files for class names ──
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],

  // ── Theme extensions ──
  theme: {
    extend: {

      /* ── Font families ──────────────────────────────── */
      fontFamily: {
        sans: ['Inter', 'SF Pro Display', 'system-ui', 'sans-serif'],
        display: ['Inter', 'SF Pro Display', 'system-ui', 'sans-serif'],
      },

      /* ── Custom color palette ────────────────────────── */
      colors: {
        // Brand green — used for primary actions, links, and accents
        brand: {
          DEFAULT: '#2E9E44',
          hover: '#25843A',
          light: '#DDF5E1',
          badge: '#EAF9EC',
        },
        // Background surfaces
        bg: {
          DEFAULT: '#FAFBF9',   // Page background (off-white)
          card: '#FFFFFF',      // Card / elevated surface
          secondary: '#F6F8F4', // Secondary / sidebar background
        },
        // Border colours
        border: {
          DEFAULT: '#E4E9DF',
        },
        // Semantic colours
        success: '#34C759',
        danger: '#FF5C5C',
        warning: '#FFB347',
        // Dark mode palette (reserved for future theme toggle)
        dark: {
          900: '#060913',
          800: '#0B1121',
          700: '#141C2F',
          600: '#1E293B',
          bg: '#060913',
          card: '#0B1121',
          text: '#F8FAFC',
          muted: '#94A3B8',
        },
        // Primary purple accent
        primary: {
          DEFAULT: '#7C3AED',
          hover: '#6D28D9',
          light: '#A78BFA',
        },
        // Light-blue accent
        accent: {
          DEFAULT: '#38BDF8',
          hover: '#0EA5E9',
        },
      },

      /* ── Border-radius tokens ────────────────────────── */
      borderRadius: {
        btn: '12px',
        card: '18px',
        hero: '22px',
        input: '12px',
      },

      /* ── Box-shadow tokens ───────────────────────────── */
      boxShadow: {
        soft: '0 6px 18px rgba(0,0,0,.05)',
        lift: '0 8px 24px rgba(0,0,0,.08)',
        'glow-primary': '0 0 20px -5px rgba(124, 58, 237, 0.5)',
        'glow-accent': '0 0 20px -5px rgba(56, 189, 248, 0.5)',
        'glass': '0 4px 30px rgba(0, 0, 0, 0.1)',
      },

      /* ── Extra spacing values ────────────────────────── */
      spacing: {
        18: '4.5rem',
        22: '5.5rem',
        30: '7.5rem',
      },
    },
  },

  // ── Third-party Tailwind plugins ──
  plugins: [],
}
