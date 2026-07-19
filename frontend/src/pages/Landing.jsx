import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Trash2, Zap, Shield, EyeOff, ArrowRight, Star, ChevronRight, Globe, MessageCircle, Briefcase } from 'lucide-react';

// Navigation links rendered in the sticky top bar
const navLinks = ['Features', 'How It Works', 'Pricing', 'Resources'];

// Reusable scroll-triggered fade-up animation preset (used across sections)
const fadeUp = (delay = 0) => ({
  // Start invisible and shifted down 28px
  initial: { opacity: 0, y: 28 },
  // Animate to fully visible at original position
  whileInView: { opacity: 1, y: 0 },
  // Trigger only once; fire when 60px of the element is visible
  viewport: { once: true, margin: '-60px' },
  // Ease-out over 550ms with optional per-instance delay
  transition: { duration: 0.55, ease: 'easeOut', delay },
});

// Core feature cards displayed in the features grid section
const features = [
  { icon: Trash2, title: 'Ephemeral by Default', desc: 'Rooms, messages, files — everything is permanently deleted when the sprint ends. No digital clutter.' },
  { icon: EyeOff, title: 'Distraction Free', desc: 'No notifications, no history, no noise. Just you, your team, and the current sprint.' },
  { icon: Zap, title: 'Real-time Collaboration', desc: 'Live messaging, typing indicators, and instant sync powered by WebSockets.' },
  { icon: Shield, title: 'Private & Secure', desc: 'Password-protected rooms, JWT auth, and end-to-end encrypted sessions.' },
];

// Three-step walkthrough explaining the sprint lifecycle (create → collaborate → delete)
const steps = [
  { num: '01', title: 'Create a Room', desc: 'Set an agenda, an optional timer, and a password. Share the room code with your team.' },
  { num: '02', title: 'Collaborate Live', desc: 'Chat, share ideas, and solve problems in a clean, focused space with zero distractions.' },
  { num: '03', title: 'End & Delete', desc: 'Click "End Sprint". Every message, file, and trace of your session is permanently erased.' },
];

// Color palette for social proof avatar circles in the hero section
const avatarColors = ['#2E9E44', '#34C759', '#FFB347', '#FF5C5C', '#5E5CE6'];

// Public marketing page — hero, features, how it works, CTA, and footer
const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-bg">
      {/* Nav — sticky top bar with logo, nav links, and auth buttons */}
      <nav className="sticky top-0 z-50 bg-bg/90 backdrop-blur-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-brand flex items-center justify-center font-bold text-lg text-white shrink-0">S</div>
              <span className="font-bold text-xl text-gray-900 tracking-tight">SprintRoom</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <a key={link} href={`#${link.toLowerCase().replace(/\s+/g, '-')}`} className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
                  {link}
                </a>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/login')} className="btn-ghost text-sm">Log in</button>
            <button onClick={() => navigate('/signup')} className="btn-primary text-sm">Sign Up</button>
          </div>
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════════
          HERO SECTION
          ═══════════════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 lg:pb-32">
        <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
          {/* Hero Left — headline, social proof badge, tagline, CTA buttons, avatar avatars */}
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }} className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-brand-badge text-brand text-xs font-semibold px-3.5 py-1.5 rounded-full mb-6">
              <Star size={14} fill="currentColor" />
              <span>Used by 500+ focused teams</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold text-gray-900 leading-[1.1] tracking-tight mb-6">
              Collaborate deeply.{' '}
              <span className="text-brand">Disappear completely.</span>
            </h1>
            <p className="text-base sm:text-lg text-gray-500 max-w-xl mx-auto lg:mx-0 leading-relaxed mb-10">
              The ephemeral collaboration platform for agile teams that value focus over forever. 
              When the sprint ends, everything disappears — no traces, no clutter, no context switching.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
              <button onClick={() => navigate('/signup')} className="btn-primary text-base px-7 py-3 gap-2">
                Create Room <ArrowRight size={18} />
              </button>
              <button className="btn-secondary text-base px-7 py-3">See how it works</button>
            </div>
            {/* Social proof */}
            <div className="flex items-center gap-4 mt-10 justify-center lg:justify-start">
              <div className="flex -space-x-2.5">
                {['RN', 'AK', 'JD', 'SP', 'LM'].map((init, i) => (
                  <div key={init} className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold text-white border-2 border-bg-card" style={{ background: avatarColors[i] }}>
                    {init}
                  </div>
                ))}
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={14} className="text-warning" fill="currentColor" />
                  ))}
                </div>
                <p className="text-sm text-gray-500 font-medium">Loved by 500+ focused teams</p>
              </div>
            </div>
          </motion.div>

          {/* Hero Right — animated illustration panel with a floating timer card mockup */}
          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.15 }} className="flex-1 max-w-md lg:max-w-none">
            <div className="relative w-full aspect-[4/3] bg-secondary rounded-hero border border-border shadow-soft flex items-center justify-center overflow-hidden">
              {/* Illustration background — subtle dot grid pattern */}
              <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #2E9E44 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
              {/* Illustration background — decorative abstract shapes */}
              <div className="absolute top-6 left-6 w-20 h-20 rounded-2xl bg-brand-light rotate-12"></div>
              <div className="absolute bottom-8 right-8 w-16 h-16 rounded-full bg-brand/10 -rotate-6"></div>
              <div className="absolute top-1/4 right-10 w-12 h-12 rounded-lg bg-brand-badge rotate-45"></div>

              {/* ── Floating Timer Card ── */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="relative z-10 bg-bg-card rounded-card p-6 shadow-lift border border-border w-56"
              >
                {/* Card top row — live status indicator + LIVE badge */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <div className="w-2 h-2 rounded-full bg-success animate-pulse"></div>
                    <span className="text-gray-700">live sprint</span>
                  </div>
                  <span className="badge-green text-[10px] tracking-wider uppercase">LIVE</span>
                </div>

                {/* Card center — countdown timer display */}
                <div className="text-center mb-4">
                  <span className="text-4xl font-extrabold text-gray-900 tracking-widest">42:18</span>
                  <p className="text-xs text-gray-400 font-medium mt-1">Time remaining</p>
                </div>

                {/* Card bottom row — member count + participant avatars */}
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Users size={16} />
                    <span className="font-medium">4 members</span>
                  </div>
                  <div className="flex -space-x-1.5">
                    {['A', 'B', 'C'].map((c, i) => (
                      <div key={c} className="w-6 h-6 rounded-full bg-brand/20 text-brand flex items-center justify-center text-[9px] font-bold border-2 border-bg-card text-xs">{c}</div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          FEATURES SECTION
          ═══════════════════════════════════════════════════ */}
      {/* Features — 4-column grid of value propositions (ephemeral, distraction-free, real-time, secure) */}
      <section id="features" className="bg-secondary py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp()} className="text-center mb-16">
            <span className="badge-green mb-4 inline-block">Features</span>
            <h2 className="section-title text-3xl sm:text-4xl">Built for focused collaboration</h2>
            <p className="section-subtitle max-w-xl mx-auto mt-3">Everything you need for ephemeral, distraction-free teamwork.</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="card-hover group"
              >
                <div className="w-11 h-11 rounded-xl bg-brand-badge text-brand flex items-center justify-center mb-5 group-hover:bg-brand group-hover:text-white transition-all duration-300">
                  <f.icon size={22} strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          HOW IT WORKS SECTION
          ═══════════════════════════════════════════════════ */}
      {/* How It Works — 3-step horizontal timeline showing the sprint lifecycle */}
      <section id="how-it-works" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp()} className="text-center mb-16">
            <span className="badge-green mb-4 inline-block">How It Works</span>
            <h2 className="section-title text-3xl sm:text-4xl">Three simple steps</h2>
            <p className="section-subtitle max-w-xl mx-auto mt-3">From creation to deletion — the entire lifecycle of a sprint.</p>
          </motion.div>
          <div className="relative">
            {/* Connector line */}
            <div className="hidden lg:block absolute top-12 left-[calc(16.66%+24px)] right-[calc(16.66%+24px)] h-0.5 bg-border">
              <div className="absolute inset-0 bg-brand/30" style={{ width: '66%' }}></div>
            </div>
            <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">
              {steps.map((s, i) => (
                <motion.div
                  key={s.num}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.45, delay: i * 0.12 }}
                  className="text-center relative"
                >
                  <div className="w-14 h-14 rounded-2xl bg-brand text-white text-xl font-extrabold flex items-center justify-center mx-auto mb-6 shadow-soft relative z-10">{s.num}</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{s.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed max-w-xs mx-auto">{s.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          CTA SECTION
          ═══════════════════════════════════════════════════ */}
      <section className="bg-secondary py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div {...fadeUp()}>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 leading-tight mb-6">
              Ready to start your next sprint?
            </h2>
            <p className="text-gray-500 text-base sm:text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
              No sign-ups required to join a room. Create your first ephemeral workspace in seconds — no credit card, no commitment, no trace.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button onClick={() => navigate('/signup')} className="btn-primary text-base px-8 py-3.5 gap-2">
                Get Started Free <ChevronRight size={18} />
              </button>
              <button className="btn-secondary text-base px-8 py-3.5">Learn More</button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          FOOTER
          ═══════════════════════════════════════════════════ */}
      <footer className="border-t border-border py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center font-bold text-sm text-white shrink-0">S</div>
              <span className="font-bold text-lg text-gray-900">SprintRoom</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-400">
              <span>© 2026 SprintRoom. All rights reserved.</span>
              <span className="hidden sm:inline">·</span>
              <span className="hidden sm:inline">Built for ephemeral collaboration</span>
            </div>
            <div className="flex items-center gap-3">
              {[Globe, MessageCircle, Briefcase].map((Icon, i) => (
                <button key={i} className="w-8 h-8 rounded-lg border border-border text-gray-400 hover:text-gray-600 hover:border-gray-300 flex items-center justify-center transition-all">
                  <Icon size={16} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
