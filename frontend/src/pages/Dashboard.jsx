import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Plus, Users, Clock, Search, ArrowRight, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

const Dashboard = () => {
  const [rooms, setRooms] = useState([]);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoom, setNewRoom] = useState({ room_name: '', agenda: '', description: '', expires_in_minutes: 60, password: '' });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [joinPassword, setJoinPassword] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [joinError, setJoinError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const res = await api.get('/rooms');
      setRooms(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/rooms/create', newRoom);
      setShowCreateModal(false);
      navigate(`/room/${res.data.id}`);
    } catch (err) {
      console.error(err);
    }
  };

  const joinRoom = async (roomId, password = '') => {
    try {
      setJoinError('');
      await api.post('/rooms/join', { room_id: roomId, password });
      setShowPasswordModal(false);
      navigate(`/room/${roomId}`);
    } catch (err) {
      if (err.response?.data?.requires_password) {
        setSelectedRoomId(roomId);
        setShowPasswordModal(true);
      } else {
        setJoinError(err.response?.data?.msg || 'Failed to join room');
        console.error(err);
      }
    }
  };

  const filteredRooms = rooms.filter(r => r.room_name.toLowerCase().includes(search.toLowerCase()) || (r.agenda && r.agenda.toLowerCase().includes(search.toLowerCase())));

  return (
    <div className="space-y-10 relative z-10">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">Active Sprints</h1>
          <p className="text-slate-400 mt-2 font-medium">Join an existing room or create a new ephemeral space.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search rooms..." 
              className="input-field pl-12 w-full sm:w-64"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button onClick={() => setShowCreateModal(true)} className="btn-primary w-full sm:w-auto whitespace-nowrap shadow-glow-primary">
            <Plus size={18} className="mr-2" /> New Sprint
          </button>
        </div>
      </div>

      {/* Room Grid */}
      {filteredRooms.length === 0 ? (
        <div className="text-center py-24 glass-panel border border-white/5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent"></div>
          <div className="w-20 h-20 bg-dark-800 border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner relative z-10">
            <Users size={32} className="text-primary/70" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2 relative z-10">No active sprints</h3>
          <p className="text-slate-400 relative z-10 max-w-sm mx-auto">Create a new sprint room to start collaborating with your team instantly.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredRooms.map((room, idx) => (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              key={room.id} 
              className="card group cursor-pointer flex flex-col h-full hover:-translate-y-1"
              onClick={() => joinRoom(room.id)}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/0 to-primary/5 group-hover:to-primary/10 transition-colors"></div>
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 border border-white/10 text-white flex items-center justify-center font-bold text-xl shadow-inner group-hover:shadow-glow-primary transition-all">
                  {room.room_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex items-center text-[11px] font-bold tracking-wider text-slate-300 bg-dark-800/80 border border-white/5 px-2.5 py-1.5 rounded-lg shadow-sm">
                  <Clock size={12} className="mr-1.5 text-primary" />
                  {room.expires_at ? new Date(room.expires_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'NO LIMIT'}
                </div>
              </div>
              
              <h3 className="text-xl font-bold mb-1.5 group-hover:text-primary transition-colors flex items-center gap-2 relative z-10">
                {room.room_name}
                {room.is_private && <Lock size={14} className="text-primary/70" />}
              </h3>
              <p className="text-slate-400 text-sm mb-6 line-clamp-2 relative z-10 leading-relaxed">{room.agenda || 'No agenda set for this sprint.'}</p>
              
              <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    <div className="w-7 h-7 rounded-full bg-dark-700 flex items-center justify-center text-[10px] font-bold border-2 border-dark-card shadow-sm text-slate-300">{room.creator_name.charAt(0).toUpperCase()}</div>
                  </div>
                  <span className="text-xs font-semibold text-slate-400">{room.participant_count} ACTIVE</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0">
                  <ArrowRight size={16} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Room Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-dark-card border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl"
          >
            <h2 className="text-2xl font-bold mb-4">Create Sprint Room</h2>
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Room Name *</label>
                <input 
                  type="text" 
                  required 
                  className="input-field" 
                  placeholder="e.g. Q3 Planning"
                  value={newRoom.room_name}
                  onChange={e => setNewRoom({...newRoom, room_name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Agenda</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="What is the goal?"
                  value={newRoom.agenda}
                  onChange={e => setNewRoom({...newRoom, agenda: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
                <textarea 
                  className="input-field min-h-[80px]" 
                  placeholder="Brief context for the sprint..."
                  value={newRoom.description}
                  onChange={e => setNewRoom({...newRoom, description: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Expires in (minutes)</label>
                <input 
                  type="number" 
                  className="input-field" 
                  value={newRoom.expires_in_minutes}
                  onChange={e => setNewRoom({...newRoom, expires_in_minutes: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Room Password (Optional)</label>
                <input 
                  type="password" 
                  className="input-field" 
                  placeholder="Leave blank for public room"
                  value={newRoom.password}
                  onChange={e => setNewRoom({...newRoom, password: e.target.value})}
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors">
                  Cancel
                </button>
                <button type="submit" className="flex-1 btn-primary">
                  Start Sprint
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
      {/* Join Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-dark-card border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
          >
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Lock size={20} /> Private Room</h2>
            <p className="text-slate-400 text-sm mb-4">This room requires a password to join.</p>
            
            {joinError && (
              <div className="bg-red-500/10 text-red-400 p-2 rounded-lg text-sm mb-4">
                {joinError}
              </div>
            )}
            
            <form onSubmit={(e) => { e.preventDefault(); joinRoom(selectedRoomId, joinPassword); }}>
              <input 
                type="password" 
                required 
                className="input-field mb-4" 
                placeholder="Enter password..."
                value={joinPassword}
                onChange={e => setJoinPassword(e.target.value)}
              />
              <div className="flex gap-3">
                <button type="button" onClick={() => { setShowPasswordModal(false); setJoinError(''); setJoinPassword(''); }} className="flex-1 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors">
                  Cancel
                </button>
                <button type="submit" className="flex-1 btn-primary">
                  Join Room
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
