// ── PostCSS Configuration ─────────────────────────────────────────────
// Purpose: Process CSS with Tailwind and Autoprefixer during the Vite build.
// tailwindcss: generates utility classes from our template files
// autoprefixer: adds vendor prefixes for cross-browser support

export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
