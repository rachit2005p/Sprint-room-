import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home } from 'lucide-react';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="text-center max-w-md"
      >
        {/* Illustration */}
        <div className="relative w-48 h-48 mx-auto mb-10">
          {/* Large circle */}
          <div className="absolute inset-0 rounded-full bg-brand-light border-4 border-brand/20 animate-pulse"></div>
          {/* Inner shape */}
          <div className="absolute inset-6 rounded-full bg-bg-card border-2 border-border flex items-center justify-center shadow-soft">
            <div className="w-16 h-16 rounded-2xl bg-brand-badge rotate-12 flex items-center justify-center">
              <div className="w-8 h-8 rounded-lg bg-brand rotate-12"></div>
            </div>
          </div>
          {/* Decorative dots */}
          <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-brand/20"></div>
          <div className="absolute -bottom-1 -left-1 w-4 h-4 rounded-full bg-brand/30"></div>
          <div className="absolute top-1/2 -right-4 w-3 h-3 rounded-full bg-brand-badge"></div>
        </div>

        <h1 className="text-8xl sm:text-9xl font-extrabold text-gray-900 leading-none tracking-tight mb-2">404</h1>
        <p className="text-xl text-gray-500 font-medium mb-2">Room Not Found</p>
        <p className="text-sm text-gray-400 mb-10 max-w-xs mx-auto leading-relaxed">
          This sprint room doesn't exist or has already expired and been deleted.
        </p>

        <button onClick={() => navigate('/')} className="btn-primary mx-auto gap-2 text-sm px-6 py-2.5">
          <Home size={16} />
          Back to Dashboard
        </button>
      </motion.div>
    </div>
  );
};

export default NotFound;
