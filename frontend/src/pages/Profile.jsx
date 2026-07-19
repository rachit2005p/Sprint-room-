import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const Profile = () => {
  const { user } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', bio: '' });

  useEffect(() => {
    if (user) {
      setForm({
        name: user.username || user.name || '',
        email: user.email || '',
        bio: user.bio || '',
      });
    }
  }, [user]);

  const handleSubmit = (e) => {
    e.preventDefault();
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto relative z-10">
      <h2 className="text-2xl font-bold text-gray-900 mb-1">Profile</h2>
      <p className="section-subtitle mb-8">Manage your personal information.</p>

      <div className="card max-w-lg">
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-full bg-brand text-white flex items-center justify-center text-3xl font-bold shadow-soft mb-4">
            {(user.username || user.name || 'U').charAt(0).toUpperCase()}
          </div>
          <h3 className="text-lg font-bold text-gray-900">{user.username || user.name}</h3>
          <p className="text-sm text-gray-500">{user.email}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
            <input
              type="text"
              className="input-field"
              placeholder="Your name"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input
              type="email"
              className="input-field"
              placeholder="your@email.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Bio</label>
            <textarea
              className="input-field min-h-[100px] resize-y"
              placeholder="Write a short bio about yourself..."
              value={form.bio}
              onChange={e => setForm({ ...form, bio: e.target.value })}
            />
          </div>

          <button type="submit" className="btn-primary w-full">
            Save Changes
          </button>
        </form>
      </div>
    </div>
  );
};

export default Profile;
