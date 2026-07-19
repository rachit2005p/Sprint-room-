import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Clock, Users, ChevronRight, Lock, Sparkles, X, ArrowRight } from 'lucide-react';
import api from '../services/api';

// Dashboard — protected page listing active sprint rooms, with create and join functionality
const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinRoomId, setJoinRoomId] = useState(null);
  const [joinPassword, setJoinPassword] = useState('');
  const [joinError, setJoinError] = useState('');

  const [form, setForm] = useState({
    room_name: '',
    agenda: '',
    description: '',
    expires_in_minutes: '',
    password: '',
  });

  // Fetch rooms on mount — loads the user's active sprint rooms from the API
  useEffect(() => {
    fetchRooms();
  }, []);

  // GET /rooms — retrieves all active sprint rooms for the current user
  // Steps: request → store in state → handle failure silently → clear loading flag
  const fetchRooms = async () => {
    try {
      // Step 1 — hit the rooms endpoint
      const res = await api.get('/rooms');
      // Step 2 — save the room list into state
      setRooms(res.data);
    } catch (err) {
      // Step 3 — log failures without blocking the UI
      console.error('Failed to fetch rooms:', err);
    }
    // Step 4 — always clear the loading spinner
    setLoading(false);
  };

  // Create room — POST /rooms/create with form data, then navigate into the new room
  const handleCreateRoom = async (e) => {
    // Step 1 — prevent default form submission
    e.preventDefault();
    // Step 2 — build payload, enforcing a minimum 5-minute duration
    const payload = {
      ...form,
      expires_in_minutes: Math.max(5, Number(form.expires_in_minutes) || 5)
    };
    try {
      // Step 3 — send the creation request
      const res = await api.post('/rooms/create', payload);
      // Step 4 — close the create modal and reset the form
      setShowCreateModal(false);
      setForm({ room_name: '', agenda: '', description: '', expires_in_minutes: '', password: '' });
      // Step 5 — navigate into the newly created room
      navigate(`/room/${res.data.id}`);
    } catch (err) {
      // Step 6 — log creation failures
      console.error('Create room error:', err);
    }
  };

  // Join room — attempts POST /rooms/join; if the room is private, opens the password modal
  const handleJoinRoom = async (roomId, needsPassword = false) => {
    // Step 1 — if the caller already knows the room is private, skip straight to the password prompt
    if (needsPassword) {
      setJoinRoomId(roomId);
      setJoinPassword('');
      setJoinError('');
      setShowJoinModal(true);
      return;
    }
    // Step 2 — attempt a password-less join
    try {
      await api.post('/rooms/join', { room_id: roomId });
      // Step 3 — on success, navigate into the room
      navigate(`/room/${roomId}`);
    } catch (err) {
      // Step 4 — if the server says a password is required, open the modal
      if (err.response?.data?.requires_password) {
        setJoinRoomId(roomId);
        setJoinPassword('');
        setJoinError('');
        setShowJoinModal(true);
      } else {
        // Step 5 — otherwise log the error
        console.error('Join room error:', err);
      }
    }
  };

  // Submit password for a private room — POST /rooms/join with room_id + password, then navigate in
  const handleJoinSubmit = async (e) => {
    // Step 1 — prevent default form submission
    e.preventDefault();
    try {
      // Step 2 — send join request with the entered password
      await api.post('/rooms/join', { room_id: joinRoomId, password: joinPassword });
      // Step 3 — close modal and enter the room
      setShowJoinModal(false);
      navigate(`/room/${joinRoomId}`);
    } catch (err) {
      // Step 4 — display the server's error message (or a generic fallback)
      setJoinError(err.response?.data?.msg || 'Failed to join room');
    }
  };

  // Helper — formats an expiration timestamp into "M:SS" remaining string
  const formatTimeLeft = (expiresAt) => {
    // Step 1 — bail out if there's no expiration date
    if (!expiresAt) return null;
    // Step 2 — calculate the difference between now and the expiration
    const diff = new Date(expiresAt).getTime() - Date.now();
    // Step 3 — if time is up, return a literal "Ending"
    if (diff <= 0) return 'Ending';
    // Step 4 — extract whole minutes
    const mins = Math.floor(diff / 60000);
    // Step 5 — extract remaining seconds (0-59)
    const secs = Math.floor((diff % 60000) / 1000);
    // Step 6 — format as "M:SS" with zero-padded seconds
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  // Helper — cycles through a palette of background colors for room cards
  const cardBg = (i) => {
    // Five-color repeating palette: green tint, off-white, light green, off-white, green tint
    const colors = [
      'bg-brand-light', // light green
      'bg-secondary',   // off-white / subtle gray
      'bg-brand-badge', // very light green
      'bg-secondary',   // off-white / subtle gray
      'bg-brand-light', // light green (wrap-around)
    ];
    return colors[i % colors.length];
  };

  return (
    <div className="space-y-8">
      {/* Header — welcome message and "New Sprint" button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title text-2xl">Dashboard</h1>
          <p className="section-subtitle mt-1">Welcome back, {user?.username}</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary gap-2 text-sm">
          <Plus size={18} /> New Sprint
        </button>
      </div>

      {/* Sprint rooms — shows loading state, empty state (with prompt to create first room), or a card grid */}
      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Loading rooms...</div>
      ) : rooms.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-brand-badge text-brand flex items-center justify-center mx-auto mb-5">
            <Sparkles size={28} />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">No active sprints</h3>
          <p className="text-sm text-gray-400 mb-6 max-w-md mx-auto">
            Create a new sprint room and invite your team to collaborate in an ephemeral workspace.
          </p>
          <button onClick={() => setShowCreateModal(true)} className="btn-primary gap-2">
            <Plus size={18} /> Create Your First Sprint
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {rooms.map((room, idx) => (
            <motion.div
              key={room.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`card-hover ${cardBg(idx)} border-0 relative overflow-hidden group cursor-pointer`}
              onClick={() => handleJoinRoom(room.id, room.is_private)}
            >
              {room.is_private && (
                <div className="absolute top-3 right-3 bg-white/70 backdrop-blur text-gray-500 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">
                  <Lock size={11} /> Private
                </div>
              )}
              <h3 className="font-bold text-gray-900 text-base mb-1.5 pr-16">{room.room_name}</h3>
              {room.agenda && (
                <p className="text-xs text-gray-500 mb-4 line-clamp-2">{room.agenda}</p>
              )}
              <div className="flex items-center justify-between mt-auto">
                <div className="flex items-center gap-3">
                  {formatTimeLeft(room.expires_at) && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 font-medium">
                      <Clock size={13} />
                      {formatTimeLeft(room.expires_at)}
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Users size={13} />
                    {room.participant_count || 0}
                  </div>
                </div>
                <div
                  className="w-8 h-8 rounded-lg bg-white/80 text-brand flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                  onClick={(e) => { e.stopPropagation(); handleJoinRoom(room.id, room.is_private); }}
                >
                  <ArrowRight size={16} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Recent Rooms — tabular list view of up to 10 rooms with creator name, participant count, and time left */}
      {rooms.length > 0 && (
        <div>
          <h2 className="section-title mb-4">All Active Rooms</h2>
          <div className="card p-0 overflow-hidden">
            {rooms.slice(0, 10).map((room) => (
              <div
                key={room.id}
                className="flex items-center gap-4 px-5 py-4 hover:bg-secondary cursor-pointer transition-colors border-b border-border last:border-b-0"
                onClick={() => handleJoinRoom(room.id, room.is_private)}
              >
                <div className="w-9 h-9 rounded-full bg-brand-badge flex items-center justify-center shrink-0">
                  {room.is_private ? <Lock size={15} className="text-brand" /> : <Users size={15} className="text-brand" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{room.room_name}</p>
                  <p className="text-xs text-gray-400">
                    {room.creator_name} · {room.participant_count} member{room.participant_count !== 1 ? 's' : ''}
                    {formatTimeLeft(room.expires_at) ? ` · ${formatTimeLeft(room.expires_at)} left` : ''}
                  </p>
                </div>
                <ChevronRight size={16} className="text-gray-300 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          MODAL 1: CREATE SPRINT ROOM
          ═══════════════════════════════════════════════════════════════ */}
      {/* Create Room Modal — overlay form for room name, agenda, description, duration, and optional password */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg-card rounded-card border border-border p-6 w-full max-w-lg shadow-lift"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Create Sprint Room</h2>
                <button onClick={() => setShowCreateModal(false)} className="p-1.5 rounded-btn text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateRoom} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Room Name *</label>
                  <input className="input-field" placeholder="Sprint Planning Q3" required value={form.room_name} onChange={e => setForm({...form, room_name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Agenda</label>
                  <input className="input-field" placeholder="What's this sprint about?" value={form.agenda} onChange={e => setForm({...form, agenda: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                  <textarea className="input-field min-h-[80px]" placeholder="Add more details..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Duration (minutes) *</label>
                    <input type="number" min="5" className="input-field" placeholder="30" value={form.expires_in_minutes} onChange={e => setForm({...form, expires_in_minutes: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Password (optional)</label>
                    <input type="text" className="input-field" placeholder="Make it private" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
                  </div>
                </div>
                <button type="submit" className="btn-primary w-full py-3 mt-2 gap-2">
                  Create Sprint <ArrowRight size={18} />
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════
          MODAL 2: JOIN PRIVATE ROOM (PASSWORD)
          ═══════════════════════════════════════════════════════════════ */}
      {/* Join Password Modal — prompts for a password when trying to enter a private room */}
      <AnimatePresence>
        {showJoinModal && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg-card rounded-card border border-border p-6 w-full max-w-sm shadow-lift text-center"
            >
              <div className="w-12 h-12 rounded-full bg-brand-badge text-brand flex items-center justify-center mx-auto mb-4">
                <Lock size={22} />
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-2">Password Required</h2>
              <p className="text-sm text-gray-400 mb-6">This room is private. Enter the password to join.</p>

              <form onSubmit={handleJoinSubmit} className="space-y-4">
                <input type="text" className="input-field text-center" placeholder="Enter room password" value={joinPassword} onChange={e => setJoinPassword(e.target.value)} autoFocus />
                {joinError && <p className="text-xs text-red-500">{joinError}</p>}
                <button type="submit" className="btn-primary w-full py-2.5">Join Room</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
