import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { socket } from '../socket/socket';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Send, Users, AlertCircle, Mic, Square, ArrowLeft, Timer, Smile, FileSymlink, Presentation, Check, X, ChevronLeft, ChevronRight, Download, Image, Monitor, MonitorOff } from 'lucide-react';
import { parsePPTX } from '../utils/pptParser';

import { motion, AnimatePresence } from 'framer-motion';

const Room = () => {
  const { roomId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [roomDetails, setRoomDetails] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [showEndModal, setShowEndModal] = useState(false);
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [customMinutes, setCustomMinutes] = useState('5');
  const [loading, setLoading] = useState(true);

  const [roomTimerSecondsLeft, setRoomTimerSecondsLeft] = useState(null);


  const [isRecording, setIsRecording] = useState(false);
  const [recordingError, setRecordingError] = useState('');
  
  const [toast, setToast] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [pendingPresentationRequest, setPendingPresentationRequest] = useState(null);
  const [activePresentation, setActivePresentation] = useState(null);
  const [isPPTUploading, setIsPPTUploading] = useState(false);
  const [presentationSlides, setPresentationSlides] = useState([]);
  const [isImageUploading, setIsImageUploading] = useState(false);

  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [isViewingScreen, setIsViewingScreen] = useState(false);
  const [screenSharerInfo, setScreenSharerInfo] = useState(null);
  const [screenShareSize, setScreenShareSize] = useState(320);
  const screenSharePosRef = useRef({ x: 100, y: 80 });
  const screenShareDragRef = useRef({ dragging: false, startX: 0, startY: 0, startPosX: 0, startPosY: 0 });
  const screenShareElRef = useRef(null);
  const localScreenStreamRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const remoteVideoRef = useRef(null);


  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const presentationSlidesRef = useRef([]);

  useEffect(() => {
    // Fetch room data and previous messages
    const initRoom = async () => {
      try {
        const [roomRes, msgsRes] = await Promise.all([
          api.get(`/rooms`).then(res => res.data.find(r => r.id === roomId || r.id === String(roomId))),
          api.get(`/rooms/${roomId}/messages`)
        ]);

        if (!roomRes) {
          navigate('/');
          return;
        }

        setRoomDetails(roomRes);
        setMessages(msgsRes.data);

        // Initialize timer if room has expires_at
        if (roomRes.expires_at) {
          const target = new Date(roomRes.expires_at).getTime();
          const now = Date.now();
          setRoomTimerSecondsLeft(Math.max(0, Math.floor((target - now) / 1000)));
        } else {
          setRoomTimerSecondsLeft(null);
        }

        setLoading(false);
      } catch (err) {
        console.error(err);
        navigate('/');
      }
    };
    initRoom();
  }, [roomId, navigate]);


  useEffect(() => {
    if (!user || loading) return;

    socket.connect();
    
    const handleConnect = () => {
      socket.emit('join_room', { roomId, user });
    };

    if (socket.connected) {
      handleConnect();
    } else {
      socket.on('connect', handleConnect);
    }

    socket.on('receive_message', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    socket.on('room_users_update', (users) => {
      setOnlineUsers(users);
    });

    socket.on('typing', ({ username }) => {
      setTypingUsers(prev => prev.includes(username) ? prev : [...prev, username]);
    });

    socket.on('stop_typing', ({ username }) => {
      setTypingUsers(prev => prev.filter(u => u !== username));
    });

    socket.on('room_ended', () => {
      alert('The room has been ended by the admin.');
      navigate('/');
    });

    socket.on('room_timer_update', ({ roomId: updatedId, expires_at }) => {
      // Update countdown from server-authoritative expires_at
      if (String(updatedId) !== String(roomId)) return;
      if (!expires_at) return;

      const target = new Date(expires_at).getTime();
      if (!Number.isFinite(target)) return;
      const now = Date.now();
      setRoomTimerSecondsLeft(Math.max(0, Math.floor((target - now) / 1000)));
    });

    socket.on('presentation_requested', ({ senderId, username, fileName, fileData }) => {
      if (roomDetails?.created_by === user.id) {
        setPendingPresentationRequest({ senderId, username, fileName, fileData });
        showToast(`${username} wants to present a PPT.`, 'info');
      }
    });

    socket.on('presentation_approved', ({ presenterId, presenterName, fileName, fileData }) => {
      showToast(`${presenterName} started presenting.`, 'info');
      setPendingPresentationRequest(null);
      // Show UI immediately, parse slides in background
      setActivePresentation({
        presenterId, presenterName, fileName, fileData,
        currentSlide: 1,
        totalSlides: 1
      });
      parsePPTX(fileData).then(slides => {
        presentationSlidesRef.current = slides;
        setPresentationSlides(slides);
        setActivePresentation(prev => prev ? { ...prev, totalSlides: slides.length || 1 } : null);
      }).catch(err => {
        console.error('PPT parse error:', err);
      });
    });

    socket.on('presentation_denied', ({ presenterId }) => {
      if (user.id === presenterId) {
        showToast('Presentation request denied by Admin.', 'error');
      }
    });

    socket.on('slide_changed', ({ slideNumber }) => {
      setActivePresentation(prev => prev ? { ...prev, currentSlide: slideNumber } : null);
    });

    socket.on('presentation_image_added', ({ fileName, fileData }) => {
      const newSlide = {
        index: (presentationSlidesRef.current.length || 0) + 1,
        texts: [fileName],
        images: [fileData],
        total: presentationSlidesRef.current.length + 1
      };
      presentationSlidesRef.current = [...presentationSlidesRef.current, newSlide];
      setPresentationSlides([...presentationSlidesRef.current]);
      setActivePresentation(prev => prev ? { ...prev, totalSlides: presentationSlidesRef.current.length } : null);
      showToast(`Image added to presentation`, 'info');
    });

    socket.on('presentation_stopped', () => {
      setActivePresentation(null);
      setPresentationSlides([]);
      showToast('Presentation ended.', 'info');
    });

    // Screen Sharing Socket Listeners
    socket.on('screen_share_started', ({ userId, username }) => {
      if (userId === user.id) return;
      setScreenSharerInfo({ userId, username });
      setIsViewingScreen(true);
      showToast(`${username} started sharing their screen.`, 'info');
    });

    socket.on('screen_share_offer', async ({ offer, senderSocketId }) => {
      try {
        const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
        peerConnectionsRef.current[senderSocketId] = pc;

        pc.ontrack = (event) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('screen_share_ice_candidate', {
              roomId,
              candidate: event.candidate,
              targetSocketId: senderSocketId
            });
          }
        };

        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('screen_share_answer', {
          roomId,
          answer,
          targetSocketId: senderSocketId
        });
      } catch (err) {
        console.error('Screen share offer handling error:', err);
      }
    });

    socket.on('screen_share_answer', async ({ answer, senderSocketId }) => {
      const pc = peerConnectionsRef.current[senderSocketId];
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (err) {
          console.error('Screen share answer handling error:', err);
        }
      }
    });

    socket.on('screen_share_ice_candidate', ({ candidate, senderSocketId }) => {
      const pc = peerConnectionsRef.current[senderSocketId];
      if (pc && candidate) {
        pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(err => {
          console.error('ICE candidate error:', err);
        });
      }
    });

    socket.on('screen_share_stopped', () => {
      if (isSharingScreen) return;
      cleanupScreenShareViewer();
      showToast('Screen sharing ended.', 'info');
    });

    return () => {
      socket.off('connect', handleConnect);
      socket.off('receive_message');
      socket.off('room_users_update');
      socket.off('typing');
      socket.off('stop_typing');
      socket.off('room_ended');
      socket.off('room_timer_update');
      socket.off('presentation_requested');
      socket.off('presentation_approved');
      socket.off('presentation_denied');
      socket.off('slide_changed');
      socket.off('presentation_stopped');
      socket.off('presentation_image_added');
      socket.off('screen_share_started');
      socket.off('screen_share_offer');
      socket.off('screen_share_answer');
      socket.off('screen_share_ice_candidate');
      socket.off('screen_share_stopped');
      cleanupScreenShare();
      socket.disconnect();
    };
  }, [navigate, roomId, user, loading, roomDetails]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      mediaRecorderRef.current?.stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    socket.emit('send_message', { 
      roomId, 
      senderId: user.id, 
      message: newMessage, 
      username: user.username 
    });
    
    socket.emit('stop_typing', { roomId, username: user.username });
    setNewMessage('');
  };

  const sendAudioMessage = (audioData) => {
    socket.emit('send_message', {
      roomId,
      senderId: user.id,
      message: 'Voice message',
      username: user.username,
      messageType: 'audio',
      audioData
    });
  };

  const sendImageMessage = (file) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      showToast('Image size must be under 10MB', 'error');
      return;
    }
    setIsImageUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      socket.emit('send_message', {
        roomId,
        senderId: user.id,
        message: `Sent an image: ${file.name}`,
        username: user.username,
        messageType: 'image',
        fileData: reader.result,
        fileName: file.name,
        fileMime: file.type
      });
      setIsImageUploading(false);
    };
    reader.onerror = () => {
      setIsImageUploading(false);
      showToast('Failed to read image', 'error');
    };
    reader.readAsDataURL(file);
  };

  const handleToggleRecording = async () => {
    setRecordingError('');

    if (isRecording) {
      mediaRecorderRef.current?.stop();
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setRecordingError('Audio recording is not supported in this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());
        setIsRecording(false);

        if (!audioBlob.size) return;

        const reader = new FileReader();
        reader.onloadend = () => sendAudioMessage(reader.result);
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error(err);
      setRecordingError('Microphone access was blocked or unavailable.');
      setIsRecording(false);
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    socket.emit('typing', { roomId, username: user.username });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop_typing', { roomId, username: user.username });
    }, 2000);
  };

  const handleEndRoom = async () => {
    try {
      await api.delete(`/rooms/${roomId}`);
      socket.emit('room_ended', { roomId });
      navigate('/');
    } catch (err) {
      console.error(err);
      alert('Failed to end room. You might not be the admin.');
      setShowEndModal(false);
    }
  };

  const handleAdjustTimer = (minutes) => {
    if (!isAdmin) return;
    socket.emit('extend_room_timer', { roomId, delta_minutes: minutes, user });
  };

  const handleRequestPresentation = (file) => {
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      showToast('File size must be under 15MB', 'error');
      return;
    }
    
    setIsPPTUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      const isAdmin = roomDetails?.created_by === user.id;
      if (isAdmin) {
        socket.emit('approve_presentation', {
          roomId,
          presenterId: user.id,
          presenterName: user.username,
          fileName: file.name,
          fileData: reader.result
        });
        showToast('Presentation started', 'info');
      } else {
        socket.emit('request_presentation', {
          roomId,
          senderId: user.id,
          username: user.username,
          fileName: file.name,
          fileData: reader.result
        });
        showToast('Presentation request sent to Admin. Waiting for approval...', 'info');
      }
      setIsPPTUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleApprovePresentation = () => {
    if (!pendingPresentationRequest) return;
    socket.emit('approve_presentation', {
      roomId,
      presenterId: pendingPresentationRequest.senderId,
      presenterName: pendingPresentationRequest.username,
      fileName: pendingPresentationRequest.fileName,
      fileData: pendingPresentationRequest.fileData
    });
    setPendingPresentationRequest(null);
  };

  const handleDenyPresentation = () => {
    if (!pendingPresentationRequest) return;
    socket.emit('deny_presentation', {
      roomId,
      presenterId: pendingPresentationRequest.senderId
    });
    setPendingPresentationRequest(null);
  };

  const handleSlideChange = (direction) => {
    if (!activePresentation) return;
    const current = activePresentation.currentSlide;
    const total = activePresentation.totalSlides || presentationSlides.length || 1;
    let nextSlide = current;
    if (direction === 'next') {
      nextSlide = Math.min(total, current + 1);
    } else {
      nextSlide = Math.max(1, current - 1);
    }
    
    if (nextSlide !== current) {
      socket.emit('change_slide', { roomId, slideNumber: nextSlide });
    }
  };

  const handleStopPresentation = () => {
    socket.emit('stop_presentation', { roomId });
  };

  const handleDownloadPPT = () => {
    if (!activePresentation) return;
    const link = document.createElement('a');
    link.href = activePresentation.fileData;
    link.download = activePresentation.fileName;
    link.click();
  };

  const handleScreenShareMouseDown = (e) => {
    screenShareDragRef.current.dragging = true;
    screenShareDragRef.current.startX = e.clientX;
    screenShareDragRef.current.startY = e.clientY;
    screenShareDragRef.current.startPosX = screenSharePosRef.current.x;
    screenShareDragRef.current.startPosY = screenSharePosRef.current.y;
    document.addEventListener('mousemove', handleScreenShareMouseMove);
    document.addEventListener('mouseup', handleScreenShareMouseUp);
    e.preventDefault();
  };

  const handleScreenShareMouseMove = (e) => {
    if (!screenShareDragRef.current.dragging) return;
    const dx = e.clientX - screenShareDragRef.current.startX;
    const dy = e.clientY - screenShareDragRef.current.startY;
    screenSharePosRef.current.x = screenShareDragRef.current.startPosX + dx;
    screenSharePosRef.current.y = screenShareDragRef.current.startPosY + dy;
    if (screenShareElRef.current) {
      screenShareElRef.current.style.left = screenSharePosRef.current.x + 'px';
      screenShareElRef.current.style.top = screenSharePosRef.current.y + 'px';
    }
  };

  const handleScreenShareMouseUp = () => {
    screenShareDragRef.current.dragging = false;
    document.removeEventListener('mousemove', handleScreenShareMouseMove);
    document.removeEventListener('mouseup', handleScreenShareMouseUp);
  };

  const cleanupScreenShare = () => {
    document.removeEventListener('mousemove', handleScreenShareMouseMove);
    document.removeEventListener('mouseup', handleScreenShareMouseUp);
    if (localScreenStreamRef.current) {
      localScreenStreamRef.current.getTracks().forEach(t => t.stop());
      localScreenStreamRef.current = null;
    }
    Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
    peerConnectionsRef.current = {};
    setIsSharingScreen(false);
    setIsViewingScreen(false);
    setScreenSharerInfo(null);
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
  };

  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });

      localScreenStreamRef.current = stream;
      setIsSharingScreen(true);
      socket.emit('screen_share_start', { roomId, userId: user.id, username: user.username });

      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };

      const otherUsers = onlineUsers.filter(u => u.userId !== user.id);
      for (const target of otherUsers) {
        const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
        peerConnectionsRef.current[target.socketId] = pc;

        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('screen_share_ice_candidate', {
              roomId,
              candidate: event.candidate,
              targetSocketId: target.socketId
            });
          }
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit('screen_share_offer', {
          roomId,
          offer,
          targetSocketId: target.socketId
        });
      }
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        showToast('Screen sharing permission was denied.', 'error');
      } else {
        console.error('Screen share start error:', err);
        showToast('Failed to start screen sharing.', 'error');
      }
      setIsSharingScreen(false);
    }
  };

  const stopScreenShare = () => {
    if (localScreenStreamRef.current) {
      localScreenStreamRef.current.getTracks().forEach(t => t.stop());
      localScreenStreamRef.current = null;
    }
    Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
    peerConnectionsRef.current = {};
    setIsSharingScreen(false);
    socket.emit('screen_share_stop', { roomId });
  };

  const cleanupScreenShareViewer = () => {
    Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
    peerConnectionsRef.current = {};
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    setIsViewingScreen(false);
    setScreenSharerInfo(null);
  };

  useEffect(() => {
    if (roomTimerSecondsLeft === null) return;
    if (roomTimerSecondsLeft <= 0) return;

    const interval = setInterval(() => {
      setRoomTimerSecondsLeft((s) => (s === null ? null : Math.max(0, s - 1)));
    }, 1000);

    return () => clearInterval(interval);
  }, [roomTimerSecondsLeft]);


  if (loading) return <div className="h-full flex items-center justify-center">Loading Workspace...</div>;

  const isAdmin = roomDetails?.created_by === user.id;




  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col md:flex-row gap-6 relative z-10">
      
      {/* Toast Alert */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4.5 py-2.5 rounded-xl shadow-glow-primary flex items-center gap-2 border font-semibold text-xs backdrop-blur-md ${
              toast.type === 'error' 
                ? 'bg-red-500/90 text-white border-red-400/30' 
                : 'bg-primary/95 text-white border-primary-light/20 shadow-glow-primary/20'
            }`}
          >
            <AlertCircle size={14} />
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col glass-panel overflow-hidden relative">
        {/* Room Header */}
        <div className="min-h-16 border-b border-white/5 flex items-center justify-between px-6 bg-dark-900/40 backdrop-blur-md relative">
          
          {/* Left: Back button & Clickable Timer */}
          <div className="flex items-center gap-3 z-10">
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-xl bg-dark-800/60 border border-white/10 text-slate-300 hover:text-white hover:bg-dark-700 transition-all duration-200"
              title="Back to Dashboard"
            >
              <ArrowLeft size={16} />
            </button>
            
            {roomTimerSecondsLeft !== null && (
              <button
                type="button"
                onClick={() => {
                  if (!isAdmin) {
                    showToast('Admin only', 'error');
                  } else {
                    setShowTimerModal(true);
                  }
                }}
                className="flex items-center gap-1.5 bg-dark-800/80 hover:bg-dark-700 border border-white/10 hover:border-primary/30 px-3.5 py-1.5 rounded-xl shadow-inner transition-all duration-200 group"
                title={isAdmin ? "Click to adjust room timer" : "Timer (Admin only)"}
              >
                <Timer size={13} className="text-primary group-hover:scale-110 transition-transform duration-200" />
                <span className="text-xs font-bold font-mono text-slate-200 group-hover:text-primary-light transition-colors duration-200">
                  Timer: {Math.floor(roomTimerSecondsLeft / 60)}:{String(roomTimerSecondsLeft % 60).padStart(2, '0')}
                </span>
              </button>
            )}
          </div>

          {/* Center: Room Name & Agenda (responsive centering) */}
          <div className="flex flex-col items-center justify-center text-center md:absolute md:left-1/2 md:-translate-x-1/2 md:top-1/2 md:-translate-y-1/2 z-10">
            <h2 className="font-bold text-lg text-white tracking-wide">{roomDetails?.room_name}</h2>
            {roomDetails?.agenda && (
              <p className="text-xs text-slate-400 font-medium line-clamp-1 max-w-[200px] md:max-w-sm">{roomDetails?.agenda}</p>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3 z-10">
            {/* Screen Share Button */}
            <button
              onClick={() => {
                if (isSharingScreen) {
                  stopScreenShare();
                } else {
                  startScreenShare();
                }
              }}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 border ${
                isSharingScreen
                  ? 'bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500 hover:text-white'
                  : 'bg-dark-800/60 text-slate-300 border-white/10 hover:text-white hover:border-primary/40'
              }`}
              title={isSharingScreen ? 'Stop sharing screen' : 'Share your screen'}
            >
              {isSharingScreen ? <MonitorOff size={14} /> : <Monitor size={14} />}
              {isSharingScreen ? 'Stop Share' : 'Share Screen'}
            </button>
            <button 
              onClick={() => {
                if (!isAdmin) {
                  showToast('Admin only', 'error');
                } else {
                  setShowEndModal(true);
                }
              }} 
              className="text-xs font-semibold bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white hover:shadow-glow-primary px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 border border-red-500/20"
              title={isAdmin ? "End Sprint" : "End Sprint (Admin only)"}
            >
              <AlertCircle size={14} /> End Sprint
            </button>
          </div>

        </div>

        {/* Pending Presentation Request Banner (Admin Only) */}
        {pendingPresentationRequest && (
          <div className="bg-primary/20 border-b border-primary/30 px-6 py-3 flex items-center justify-between backdrop-blur-md z-30">
            <div className="flex items-center gap-2 text-sm text-slate-200">
              <Presentation className="text-primary animate-pulse" size={16} />
              <span>
                <strong>{pendingPresentationRequest.username}</strong> wants to present <strong>{pendingPresentationRequest.fileName}</strong>.
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleApprovePresentation}
                className="px-3 py-1 rounded-lg bg-green-500 hover:bg-green-600 text-white font-bold text-xs flex items-center gap-1 transition-all"
              >
                <Check size={12} /> Allow
              </button>
              <button
                onClick={handleDenyPresentation}
                className="px-3 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold text-xs flex items-center gap-1 transition-all border border-red-500/20"
              >
                <X size={12} /> Deny
              </button>
            </div>
          </div>
        )}

        {/* Active Presentation Slides Panel */}
        {activePresentation && (
          <div className="bg-dark-900/60 border-b border-white/5 p-4 flex flex-col gap-3 backdrop-blur-md z-30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Presentation className="text-primary animate-pulse" size={16} />
                <span className="text-xs text-slate-300 font-medium">
                  Presenting: <strong className="text-white">{activePresentation.fileName}</strong> by <strong className="text-primary-light">{activePresentation.presenterName}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadPPT}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all"
                  title="Download Presentation"
                >
                  <Download size={14} />
                </button>
                {(user.id === activePresentation.presenterId || roomDetails?.created_by === user.id) && (
                  <button
                    onClick={handleStopPresentation}
                    className="px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 text-xs font-bold transition-all"
                  >
                    Stop Presentation
                  </button>
                )}
              </div>
            </div>

            {/* Slide Showcase Area */}
            <div className="min-h-44 sm:min-h-64 bg-dark-950 border border-white/5 rounded-xl flex flex-col relative overflow-hidden shadow-inner group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 pointer-events-none"></div>
              
              {/* Slide Content */}
              <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6">
                {presentationSlides.length > 0 && presentationSlides[activePresentation.currentSlide - 1] ? (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                    {/* Slide Images */}
                    {presentationSlides[activePresentation.currentSlide - 1].images.length > 0 && (
                      <div className="flex flex-wrap items-center justify-center gap-4 max-w-full">
                        {presentationSlides[activePresentation.currentSlide - 1].images.map((img, i) => (
                          <img
                            key={i}
                            src={img}
                            alt={`Slide ${activePresentation.currentSlide} image ${i + 1}`}
                            className="max-h-56 max-w-full rounded-lg object-contain shadow-lg border border-white/10"
                          />
                        ))}
                      </div>
                    )}
                    
                    {/* Slide Text */}
                    {presentationSlides[activePresentation.currentSlide - 1].texts.length > 0 && (
                      <div className="w-full max-w-lg space-y-2">
                        {presentationSlides[activePresentation.currentSlide - 1].texts.map((text, i) => (
                          <p key={i} className="text-sm text-slate-200 text-center leading-relaxed">
                            {text}
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Empty slide fallback */}
                    {presentationSlides[activePresentation.currentSlide - 1].images.length === 0 &&
                      presentationSlides[activePresentation.currentSlide - 1].texts.length === 0 && (
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center border border-white/10 font-black text-white text-lg">
                          {activePresentation.currentSlide}
                        </div>
                        <p className="text-sm text-slate-400">Slide {activePresentation.currentSlide}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center border border-white/10 font-black text-white text-lg">
                      {activePresentation.currentSlide}
                    </div>
                    <p className="text-sm text-slate-400">
                      Slide {activePresentation.currentSlide} of {activePresentation.totalSlides || presentationSlides.length || 1}
                    </p>
                    <p className="text-[11px] text-slate-500">Presentation syncing live with all room members</p>
                  </div>
                )}
              </div>

              {/* Slide Counter & Controls */}
              <div className="relative z-10 flex items-center justify-between px-4 py-2 bg-dark-950/80 border-t border-white/5">
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <Presentation size={12} className="text-primary" />
                  <span>Slide {activePresentation.currentSlide} of {activePresentation.totalSlides || presentationSlides.length || 1}</span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Add Image to Presentation (presenter only) */}
                  {user.id === activePresentation.presenterId && (
                    <>
                      <input
                        type="file"
                        accept="image/*"
                        id="presentation-image-input"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              socket.emit('add_image_to_presentation', {
                                roomId,
                                fileName: file.name,
                                fileData: reader.result
                              });
                            };
                            reader.readAsDataURL(file);
                          }
                          e.target.value = '';
                        }}
                      />
                      <label
                        htmlFor="presentation-image-input"
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
                        title="Add Image to Presentation"
                      >
                        <Image size={13} />
                      </label>
                    </>
                  )}

                  {/* Slide Controls */}
                  {user.id === activePresentation.presenterId && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleSlideChange('prev')}
                        disabled={activePresentation.currentSlide <= 1}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Previous Slide"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <button
                        onClick={() => handleSlideChange('next')}
                        disabled={activePresentation.currentSlide >= (activePresentation.totalSlides || presentationSlides.length || 1)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Next Slide"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div className="text-center py-8 mb-6 relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent mx-auto flex items-center justify-center font-bold text-3xl shadow-glow-primary mb-4">{roomDetails?.room_name?.charAt(0)}</div>
            <h3 className="text-2xl font-bold text-white tracking-wide">Welcome to {roomDetails?.room_name}</h3>
            <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto">This is the start of the ephemeral discussion. All messages will be permanently deleted when the sprint ends.</p>
          </div>

          <AnimatePresence>
            {messages.map((msg, idx) => {
              const isMe = msg.sender_id === user.id;
              return (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  key={msg.id || idx} 
                  className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 shadow-inner ${isMe ? 'bg-gradient-to-br from-primary to-accent text-white' : 'bg-dark-700 border border-white/10 text-slate-300'}`}>
                    {msg.username ? msg.username.charAt(0).toUpperCase() : '?'}
                  </div>
                  <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[75%]`}>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-xs font-semibold text-slate-300">{msg.username}</span>
                      <span className="text-[10px] text-slate-500 font-medium">{new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <div className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm backdrop-blur-sm ${isMe ? 'bg-primary/90 text-white rounded-tr-sm border border-white/10 shadow-glow-primary/20' : 'bg-dark-700/80 text-slate-200 rounded-tl-sm border border-white/5'}`}>
                      {msg.message_type === 'image' && msg.file_data ? (
                        <div className="flex flex-col gap-2 min-w-40">
                          <img
                            src={msg.file_data}
                            alt={msg.file_name || 'Shared image'}
                            className="max-h-72 max-w-full rounded-lg object-contain cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => window.open(msg.file_data, '_blank')}
                          />
                          {msg.file_name && (
                            <span className="text-[11px] text-slate-400 font-medium truncate">{msg.file_name}</span>
                          )}
                        </div>
                      ) : msg.message_type === 'audio' && msg.audio_data ? (
                        <div className="flex flex-col gap-2 min-w-56">
                          <span className="text-xs font-semibold opacity-80">Voice message</span>
                          <audio controls src={msg.audio_data} className="w-full max-w-64 h-9" />
                        </div>
                      ) : msg.message_type === 'ppt' ? (
                        <div className="flex flex-col gap-2 min-w-56">
                          <div className="flex items-center gap-2">
                            <Presentation className="text-accent animate-pulse" size={16} />
                            <span className="text-xs font-semibold opacity-80">PowerPoint Presentation</span>
                          </div>
                          <span className="font-bold text-xs text-white line-clamp-1">{msg.file_name}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = msg.file_data;
                              link.download = msg.file_name;
                              link.click();
                            }}
                            className="mt-1 flex items-center justify-center gap-1 bg-white/10 hover:bg-white/20 text-white border border-white/10 hover:border-white/20 rounded-lg py-1 px-3 text-xs font-bold transition-all"
                          >
                            <Download size={12} /> Download PPT
                          </button>
                        </div>
                      ) : (
                        msg.message
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {typingUsers.length > 0 && (
            <div className="text-xs text-slate-500 italic ml-11">
              {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 bg-dark-900/40 backdrop-blur-md border-t border-white/5 relative">
          {recordingError && (
            <div className="mb-3 text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {recordingError}
            </div>
          )}

          {/* Emoji Picker Panel */}
          {showEmojiPicker && (
            <div className="absolute bottom-20 left-4 bg-dark-card border border-white/10 rounded-2xl p-3 shadow-2xl flex gap-1.5 z-50 backdrop-blur-md">
              {['👍', '❤️', '😂', '🎉', '🔥', '🚀', '👀', '😮', '😢', '💯', '✨'].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    setNewMessage(prev => prev + emoji);
                    setShowEmojiPicker(false);
                  }}
                  className="w-8 h-8 rounded-lg hover:bg-white/5 text-lg flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSendMessage} className="relative flex items-center gap-2 group">
            <button
              type="button"
              onClick={handleToggleRecording}
              className={`shrink-0 p-3 rounded-xl border transition-all ${isRecording ? 'bg-red-500 text-white border-red-400 shadow-[0_0_20px_rgba(239,68,68,0.35)]' : 'bg-dark-800/80 text-slate-300 border-white/10 hover:text-white hover:border-primary/40'}`}
              aria-label={isRecording ? 'Stop recording voice message' : 'Record voice message'}
              title={isRecording ? 'Stop recording' : 'Record voice message'}
            >
              {isRecording ? <Square size={18} /> : <Mic size={18} />}
            </button>

            {/* Emoji Trigger */}
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={`shrink-0 p-3 rounded-xl border transition-all ${showEmojiPicker ? 'bg-primary/20 text-primary-light border-primary/30 shadow-glow-primary/20' : 'bg-dark-800/80 text-slate-300 border-white/10 hover:text-white hover:border-primary/40'}`}
              title="Insert emoji"
            >
              <Smile size={18} />
            </button>

            {/* Image Upload */}
            <input
              type="file"
              accept="image/*"
              id="image-upload-input"
              className="hidden"
              disabled={isRecording || isPPTUploading || isImageUploading}
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) sendImageMessage(file);
                e.target.value = '';
              }}
            />
            <label
              htmlFor="image-upload-input"
              className={`shrink-0 p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${isImageUploading ? 'bg-primary/20 border-primary/30 animate-pulse' : 'bg-dark-800/80 text-slate-300 border-white/10 hover:text-white hover:border-primary/40'} ${isRecording || isPPTUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
              title="Send Image"
            >
              <Image size={18} />
            </label>

            {/* PPT Upload Trigger */}
            <input
              type="file"
              accept=".ppt,.pptx"
              id="ppt-upload-input"
              className="hidden"
              disabled={isRecording || isPPTUploading}
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) handleRequestPresentation(file);
                e.target.value = '';
              }}
            />
            <label
              htmlFor="ppt-upload-input"
              className={`shrink-0 p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${isPPTUploading ? 'bg-primary/20 border-primary/30 animate-pulse' : 'bg-dark-800/80 text-slate-300 border-white/10 hover:text-white hover:border-primary/40'} ${isRecording ? 'opacity-50 cursor-not-allowed' : ''}`}
              title="Share PPT Presentation"
            >
              <FileSymlink size={18} />
            </label>

            <input 
              type="text" 
              className="w-full bg-dark-800/80 border border-white/10 rounded-xl pl-5 pr-14 py-3.5 text-sm focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all text-white shadow-inner"
              placeholder={isRecording ? 'Recording voice message...' : isPPTUploading ? 'Uploading presentation...' : `Message in ${roomDetails?.room_name}...`}
              value={newMessage}
              disabled={isRecording || isPPTUploading}
              onChange={handleTyping}
            />
            <button 
              type="submit" 
              disabled={!newMessage.trim()}
              className="absolute right-2 p-2 bg-gradient-to-r from-primary to-accent hover:from-primary-hover hover:to-primary text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-glow-primary"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>

      {/* Screen Share Video Overlay */}
      {(isViewingScreen || isSharingScreen) && (
        <div
          ref={screenShareElRef}
          className="fixed z-50 rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-dark-900/90 backdrop-blur-md select-none"
          style={{ width: screenShareSize, left: screenSharePosRef.current.x, top: screenSharePosRef.current.y }}
        >
          <div
            onMouseDown={handleScreenShareMouseDown}
            className="flex items-center justify-between px-3 py-2 bg-dark-800/80 border-b border-white/5 cursor-grab active:cursor-grabbing"
          >
            <div className="flex items-center gap-2">
              <Monitor size={13} className="text-primary" />
              <span className="text-xs font-bold text-slate-300">
                {isSharingScreen ? 'You are sharing' : `${screenSharerInfo?.username}'s screen`}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <input
                type="range"
                min="200"
                max="900"
                step="10"
                value={screenShareSize}
                onChange={(e) => setScreenShareSize(Number(e.target.value))}
                onMouseDown={(e) => e.stopPropagation()}
                className="w-16 h-1 accent-primary cursor-pointer"
                title="Adjust size"
              />
              <button
                onClick={cleanupScreenShareViewer}
                onMouseDown={(e) => e.stopPropagation()}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all ml-1"
                title="Close"
              >
                <X size={13} />
              </button>
            </div>
          </div>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full aspect-video bg-black object-contain"
          />
        </div>
      )}

      {/* Sidebar: Online Users */}
      <div className="w-full md:w-72 glass-panel p-5 flex flex-col shrink-0 overflow-y-auto">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
          <Users size={16} className="text-primary" /> Online ({onlineUsers.length})
        </h3>
        <div className="space-y-4">
          {onlineUsers.map((u, i) => (
            <div key={i} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-dark-700 border border-white/10 flex items-center justify-center text-sm font-bold text-slate-300 shadow-inner">
                  {u.username.charAt(0).toUpperCase()}
                </div>
                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 border-2 border-dark-card rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-200">{u.username}</span>
                {u.userId === roomDetails?.created_by ? <span className="text-[10px] font-bold text-primary tracking-wide">ADMIN</span> : <span className="text-[10px] text-slate-500">MEMBER</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* End Room Modal */}
      {showEndModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-dark-card border border-red-500/30 rounded-2xl p-6 w-full max-w-md shadow-2xl"
          >
            <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-4">
              <AlertCircle size={24} />
            </div>
            <h2 className="text-xl font-bold mb-2">End Sprint Room?</h2>
            <p className="text-slate-400 text-sm mb-6">
              This action is irreversible. Ending the sprint will permanently delete this room, kick all participants, and wipe all messages from the database.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowEndModal(false)} className="flex-1 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors">
                Cancel
              </button>
              <button onClick={handleEndRoom} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-medium py-2 rounded-lg transition-colors">
                Yes, End Sprint
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Adjust Timer Modal */}
      {showTimerModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-dark-card border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Timer className="text-primary" size={20} /> Adjust Timer
              </h2>
              <button 
                onClick={() => setShowTimerModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>
            
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              Modify the duration of the current sprint. Decreasing the timer below 0 will end the sprint room immediately.
            </p>

            <div className="bg-dark-900/50 border border-white/5 rounded-xl p-4 mb-6 flex flex-col items-center justify-center gap-1 shadow-inner">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Time Remaining</span>
              <span className="text-2xl font-black font-mono text-white tracking-wider">
                {roomTimerSecondsLeft !== null ? (
                  `${Math.floor(roomTimerSecondsLeft / 60)}:${String(roomTimerSecondsLeft % 60).padStart(2, '0')}`
                ) : (
                  'NO LIMIT'
                )}
              </span>
            </div>

            {/* Quick Adjust Buttons */}
            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Quick Adjust</label>
              <div className="grid grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => handleAdjustTimer(-10)}
                  className="py-2 text-xs font-bold rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/10 hover:border-red-500/20 transition-all duration-200"
                >
                  -10m
                </button>
                <button
                  type="button"
                  onClick={() => handleAdjustTimer(-5)}
                  className="py-2 text-xs font-bold rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/10 hover:border-red-500/20 transition-all duration-200"
                >
                  -5m
                </button>
                <button
                  type="button"
                  onClick={() => handleAdjustTimer(5)}
                  className="py-2 text-xs font-bold rounded-lg bg-primary/10 hover:bg-primary/20 text-primary-light border border-primary/10 hover:border-primary/20 transition-all duration-200"
                >
                  +5m
                </button>
                <button
                  type="button"
                  onClick={() => handleAdjustTimer(10)}
                  className="py-2 text-xs font-bold rounded-lg bg-primary/10 hover:bg-primary/20 text-primary-light border border-primary/10 hover:border-primary/20 transition-all duration-200"
                >
                  +10m
                </button>
              </div>
            </div>

            {/* Custom Adjust Input */}
            <div className="space-y-3 mb-6">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Custom Adjust</label>
              <div className="flex gap-2">
                <input 
                  type="number" 
                  min="1"
                  max="1440"
                  className="input-field py-2 text-sm text-center flex-1 shadow-inner"
                  placeholder="Minutes"
                  value={customMinutes}
                  onChange={e => setCustomMinutes(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => {
                    const mins = Math.abs(Number(customMinutes) || 1);
                    handleAdjustTimer(-mins);
                  }}
                  className="px-4 py-2 text-xs font-bold rounded-lg border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all duration-200"
                >
                  Subtract
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const mins = Math.abs(Number(customMinutes) || 1);
                    handleAdjustTimer(mins);
                  }}
                  className="px-4 py-2 text-xs font-bold rounded-lg border border-primary/20 bg-primary/15 hover:bg-primary/25 text-white transition-all duration-200"
                >
                  Add
                </button>
              </div>
            </div>

            <button 
              type="button"
              onClick={() => setShowTimerModal(false)} 
              className="w-full py-2.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors text-sm font-semibold"
            >
              Close
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Room;
