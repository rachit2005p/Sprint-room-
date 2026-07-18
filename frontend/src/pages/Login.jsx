import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Shield, Zap, Trash2, Users } from 'lucide-react';

const Login = ({ isSignup = false }) => {
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isSignup) {
        await register(formData.username, formData.email, formData.password);
      } else {
        await login(formData.email, formData.password);
      }
      navigate('/');
    } catch (err) {
      const message =
        err.response?.data?.msg ||
        err.response?.data?.errors?.[0]?.msg ||
        (err.code === 'ECONNABORTED'
          ? 'The server took too long to respond. Please check that the backend and MongoDB are running.'
          : !err.response
            ? 'Cannot reach the backend. Please start the backend server on port 5000.'
            : 'An error occurred');

      setError(message);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg flex flex-col lg:block relative">
      {/* Background decorations */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary opacity-20 rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="fixed bottom-[-20%] right-[30%] w-[40%] h-[40%] bg-accent opacity-10 rounded-full blur-[120px] pointer-events-none z-0"></div>
      
      {/* Left Column: Landing Page Content */}
      <div className="lg:mr-[500px] xl:mr-[600px] p-8 lg:p-16 xl:p-24 relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center font-bold text-xl text-white shadow-glow-primary">S</div>
            <span className="font-bold text-2xl tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">SprintRoom</span>
          </div>

          <h1 className="text-5xl lg:text-7xl font-extrabold text-white leading-tight mb-8">
            Ephemeral Collaboration for <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">Focused Teams</span>
          </h1>
          
          <p className="text-slate-400 text-xl mb-16 leading-relaxed max-w-3xl">
            Unlike traditional chat apps where discussions become cluttered over time, SprintRoom provides a distraction-free environment for agile teams, students, and developers. 
            When your meeting is done, <strong className="text-white">everything is permanently deleted</strong>.
          </p>

          <div className="grid sm:grid-cols-2 gap-8 max-w-3xl mb-24">
            <div className="glass-panel p-6 hover:-translate-y-1 transition-transform duration-300">
              <Trash2 className="text-primary mb-4" size={28} />
              <h3 className="text-white text-lg font-bold mb-2">Zero Data Clutter</h3>
              <p className="text-sm text-slate-400 leading-relaxed">All messages, participants, and room data are wiped instantly when the sprint ends. Keep your focus sharp.</p>
            </div>
            <div className="glass-panel p-6 hover:-translate-y-1 transition-transform duration-300">
              <Zap className="text-accent mb-4" size={28} />
              <h3 className="text-white text-lg font-bold mb-2">Real-Time Sync</h3>
              <p className="text-sm text-slate-400 leading-relaxed">Powered by Socket.IO for live typing indicators and instant message delivery. No lag, no waiting.</p>
            </div>
            <div className="glass-panel p-6 hover:-translate-y-1 transition-transform duration-300">
              <Shield className="text-primary mb-4" size={28} />
              <h3 className="text-white text-lg font-bold mb-2">Secure & Private</h3>
              <p className="text-sm text-slate-400 leading-relaxed">JWT-based auth, encrypted passwords, and private password-protected rooms to keep out uninvited guests.</p>
            </div>
            <div className="glass-panel p-6 hover:-translate-y-1 transition-transform duration-300">
              <Users className="text-accent mb-4" size={28} />
              <h3 className="text-white text-lg font-bold mb-2">Agile Ready</h3>
              <p className="text-sm text-slate-400 leading-relaxed">Define agendas, track active users, and manage focused temporary spaces designed specifically for sprints.</p>
            </div>
          </div>

          <div className="max-w-3xl mb-24">
            <h2 className="text-3xl font-bold text-white mb-8">How it Works</h2>
            <div className="space-y-8 relative before:absolute before:inset-0 before:ml-6 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-12 h-12 rounded-full border-4 border-dark-bg bg-primary text-white font-bold shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-glow-primary z-10">1</div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] glass-panel p-6">
                  <h3 className="font-bold text-white mb-1">Create a Room</h3>
                  <p className="text-sm text-slate-400">Set an agenda, optional expiration timer, and an optional password.</p>
                </div>
              </div>
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-12 h-12 rounded-full border-4 border-dark-bg bg-accent text-white font-bold shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-glow-accent z-10">2</div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] glass-panel p-6">
                  <h3 className="font-bold text-white mb-1">Collaborate Live</h3>
                  <p className="text-sm text-slate-400">Share the room ID with your team. Chat, brainstorm, and solve problems in real-time.</p>
                </div>
              </div>
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-12 h-12 rounded-full border-4 border-dark-bg bg-red-500 text-white font-bold shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-[0_0_20px_rgba(239,68,68,0.4)] z-10">3</div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] glass-panel p-6">
                  <h3 className="font-bold text-white mb-1">End & Destroy</h3>
                  <p className="text-sm text-slate-400">Click "End Sprint". The room, its agenda, and every single message is permanently wiped.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Founder About Section */}
          <div className="glass-panel p-8 max-w-3xl flex flex-col sm:flex-row items-center sm:items-start gap-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-dark-800 to-dark-900 border border-white/10 flex items-center justify-center shadow-inner shrink-0 relative z-10">
               <span className="text-4xl">👨‍💻</span>
            </div>
            <div className="text-center sm:text-left relative z-10">
              <p className="text-xs text-slate-400 tracking-widest uppercase font-bold mb-2">Founded & Developed by</p>
              <h2 className="text-3xl font-extrabold text-white tracking-tight mb-2">Rachit Pandey</h2>
              <div className="inline-block bg-primary/10 border border-primary/20 text-primary px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase mb-4">
                B.Tech CSE 3rd Year • LPU
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">
                I built SprintRoom to solve a problem I faced during coding sessions: the accumulation of irrelevant code snippets and chat logs. 
                This platform is engineered to keep teams focused on the "now".
              </p>
            </div>
          </div>
          
          <div className="h-16 lg:h-32"></div> {/* Bottom padding spacer */}
        </motion.div>
      </div>

      {/* Right Column: Sticky Auth Form */}
      <div className="lg:w-[500px] xl:w-[600px] lg:fixed lg:right-0 lg:top-0 lg:h-screen overflow-y-auto p-8 lg:p-12 xl:p-16 flex items-center justify-center relative z-20 bg-dark-900/60 backdrop-blur-xl border-t lg:border-t-0 lg:border-l border-white/5 shadow-2xl">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="card w-full max-w-md shadow-[0_0_40px_rgba(0,0,0,0.3)] bg-dark-card/90"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white">{isSignup ? 'Create an account' : 'Welcome back'}</h2>
            <p className="text-slate-400 mt-2 text-sm">
              {isSignup ? 'Start collaborating in your own ephemeral workspaces.' : 'Sign in to join an active sprint.'}
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl text-sm mb-6 text-center font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignup && (
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-1.5">Username</label>
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
            
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-1.5">Email</label>
              <input 
                type="email" 
                required 
                className="input-field" 
                placeholder="john@example.com"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-1.5">Password</label>
              <input 
                type="password" 
                required 
                className="input-field" 
                placeholder="••••••••"
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
              />
            </div>

            <button type="submit" className="btn-primary w-full mt-8 py-3.5 text-lg shadow-glow-primary">
              {isSignup ? 'Sign Up to SprintRoom' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-400 mt-8">
            {isSignup ? 'Already have an account? ' : "Don't have an account? "}
            <Link to={isSignup ? '/login' : '/signup'} className="text-primary hover:text-primary-light font-bold transition-colors">
              {isSignup ? 'Sign in instead' : 'Create one now'}
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
