import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Shield, Zap, Trash2, Users, ArrowRight, Star } from 'lucide-react';

// Login/Signup page — split layout: left brand panel, right auth form.
// The isSignup prop toggles between login and registration modes.
const Login = ({ isSignup = false }) => {
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const { login, register } = useAuth();
  const navigate = useNavigate();

  // Form submit — calls register or login API based on isSignup, navigates to dashboard on success
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      // Step 1 — determine action: register (with username) vs login (email + password only)
      if (isSignup) {
        await register(formData.username, formData.email, formData.password);
      } else {
        await login(formData.email, formData.password);
      }
      // Step 2 — on success, redirect to the dashboard
      navigate('/');
    } catch (err) {
      // Step 3 — extract the most specific error message available
      // Priority: server msg field → validation errors array → timeout → network → generic
      const message =
        // Preferred: the backend's top-level "msg" property
        err.response?.data?.msg ||
        // Fallback: first item in a validation errors array
        err.response?.data?.errors?.[0]?.msg ||
        // Network-specific: request timeout (Axios code ECONNABORTED)
        (err.code === 'ECONNABORTED'
          ? 'The server took too long to respond.'
          // No response at all — server unreachable
          : !err.response
            ? 'Cannot reach the backend. Please start the backend server on port 5000.'
            // Catch-all fallback
            : 'An error occurred');
      // Step 4 — display the resolved message in the error banner
      setError(message);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex">
      {/* Left — brand panel with logo, tagline, feature highlights, and copyright (hidden on mobile) */}
      <div className="hidden lg:flex flex-1 bg-secondary p-16 xl:p-24 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #2E9E44 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-brand-light pointer-events-none"></div>
        <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-brand-badge pointer-events-none"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-2.5 mb-20">
            <div className="w-9 h-9 rounded-lg bg-brand flex items-center justify-center font-bold text-lg text-white shrink-0">S</div>
            <span className="font-bold text-xl text-gray-900 tracking-tight">SprintRoom</span>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 bg-brand-badge text-brand text-xs font-semibold px-3.5 py-1.5 rounded-full mb-6">
              <Star size={14} fill="currentColor" />
              <span>Used by 500+ focused teams</span>
            </div>

            <h1 className="text-4xl xl:text-5xl font-extrabold text-gray-900 leading-tight mb-6">
              {isSignup ? 'Start your first ephemeral sprint' : 'Welcome back to focused collaboration'}
            </h1>

            <p className="text-gray-500 text-lg max-w-xl leading-relaxed mb-12">
              SprintRoom is where agile teams collaborate intensely — and disappear completely when the sprint ends.
            </p>

            <div className="grid sm:grid-cols-2 gap-5 max-w-xl">
              {[
                { icon: Trash2, title: 'Zero Data Clutter', desc: 'Everything is wiped when the sprint ends.' },
                { icon: Zap, title: 'Real-Time Sync', desc: 'Live messaging powered by WebSockets.' },
                { icon: Shield, title: 'Secure & Private', desc: 'JWT auth with password-protected rooms.' },
                { icon: Users, title: 'Agile Ready', desc: 'Designed specifically for sprint workflows.' },
              ].map((f, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-brand-badge text-brand flex items-center justify-center shrink-0 mt-0.5">
                    <f.icon size={18} strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">{f.title}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        <div className="relative z-10 border-t border-border pt-8">
          <p className="text-sm text-gray-400">© 2026 SprintRoom. Built for ephemeral collaboration.</p>
        </div>
      </div>

      {/* Right — auth form panel with logo, heading, error banner, and form inputs */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-10">
            <div className="w-12 h-12 rounded-xl bg-brand flex items-center justify-center font-bold text-xl text-white mx-auto mb-5">S</div>
            <h2 className="text-2xl font-bold text-gray-900">{isSignup ? 'Create your account' : 'Sign in'}</h2>
            <p className="text-gray-400 text-sm mt-2">
              {isSignup ? 'Start collaborating in ephemeral workspaces.' : 'Sign in to join an active sprint.'}
            </p>
          </div>

          {/* Error banner — shown when login/register API returns an error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 p-3.5 rounded-btn text-sm mb-6 text-center font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username field — shown only during signup, hidden for login */}
            {isSignup && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Username</label>
                <input
                  type="text"
                  required
                  className="input-field"
                  placeholder="johndoe"
                  value={formData.username}
                  onChange={e => setFormData({...formData, username: e.target.value})}
                />
              </div>
            )}

            {/* Email field — required for both login and signup */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                required
                className="input-field"
                placeholder="john@example.com"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
            </div>

            {/* Password field — required for both login and signup */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <input
                type="password"
                required
                className="input-field"
                placeholder="••••••••"
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
              />
            </div>

            {/* Submit button — text changes based on login vs signup mode */}
            <button type="submit" className="btn-primary w-full py-3 gap-2 mt-2">
              {isSignup ? 'Create Account' : 'Sign In'} <ArrowRight size={18} />
            </button>
          </form>

          {/* Toggle link — switches between "Sign in" and "Create account" modes */}
          <p className="text-center text-sm text-gray-400 mt-8">
            {isSignup ? 'Already have an account? ' : "Don't have an account? "}
            <Link to={isSignup ? '/login' : '/signup'} className="text-brand hover:text-brand-hover font-semibold transition-colors">
              {isSignup ? 'Sign in' : 'Create one'}
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
