// ──────────────────────────────────────────────
// Entry point — mounts the React application into the DOM
// ──────────────────────────────────────────────

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Grab the root DOM node that index.html provides
const rootElement = document.getElementById('root')

// Create a React 18 concurrent root and render the app tree
// StrictMode is development-only and helps surface side-effect bugs
const root = ReactDOM.createRoot(rootElement)

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
