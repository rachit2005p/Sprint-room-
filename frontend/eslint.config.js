// ── ESLint Configuration ──────────────────────────────────────────────
// Purpose: Lint rules for the React frontend. Enforces best practices,
// hooks rules, and React Refresh (HMR) compatibility.

import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // Ignore the production build folder
  globalIgnores(['dist']),

  // Apply these rules to all .js and .jsx files
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      // Standard JavaScript best-practice rules
      js.configs.recommended,
      // React hooks rules (useEffect deps, etc.)
      reactHooks.configs.flat.recommended,
      // React Refresh — warn if non-component exports break HMR
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
])
