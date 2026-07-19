import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const JoinRoom = () => {
  const [code, setCode] = useState('');
  const navigate = useNavigate();

  const handleJoin = (e) => {
    e.preventDefault();
    if (code.trim()) navigate(`/room/${code.trim()}`);
  };

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="card w-full max-w-md text-center relative overflow-hidden"
      >
        <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-brand-light pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-28 h-28 rounded-full bg-brand-light pointer-events-none" />

        <div className="relative z-10">
          <div className="w-16 h-16 rounded-full bg-brand-badge flex items-center justify-center mx-auto mb-5">
            <Users size={28} className="text-brand" />
          </div>

          <h1 className="section-title text-2xl mb-1">Join a Sprint</h1>
          <p className="section-subtitle mb-8">Enter the room code to join</p>

          <form onSubmit={handleJoin} className="space-y-5">
            <input
              type="text"
              placeholder="Room code"
              className="input-field text-center text-lg tracking-widest font-mono"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoFocus
            />
            <button type="submit" className="btn-primary w-full gap-2">
              Join <ArrowRight size={18} />
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-border flex items-center justify-center gap-3 text-sm text-gray-400">
            <Users size={16} className="text-brand" />
            <span>Two people collaborating</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default JoinRoom;
