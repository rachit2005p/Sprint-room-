import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { socket } from '../socket/socket';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Send, Users, AlertCircle, Mic, Square, ArrowLeft, Timer, Smile, FileSymlink, Presentation, Check, X, ChevronLeft, ChevronRight, Download, Image, Monitor, MonitorOff, Trash2 } from 'lucide-react';
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
  const [pendingScreenShareRequest, setPendingScreenShareRequest] = useState(null);
  const [pendingMediaRequest, setPendingMediaRequest] = useState(null);
  const [screenShareSize, setScreenShareSize] = useState(320);
  const screenSharePosRef = useRef({ x: 100, y: 80 });
  const screenShareDragRef = useRef({ dragging: false, startX: 0, startY: 0, startPosX: 0, startPosY: 0 });
  const screenShareElRef = useRef(null);
  const localScreenStreamRef = useRef(null);
  const localVideoRef = useRef(null);
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

    // Media Share Request/Approve/Deny (non-admin image/audio)
    socket.on('media_share_requested', ({ senderId, username, messageType, fileData, fileName, fileMime, audioData, requesterSocketId }) => {
      if (roomDetails?.created_by === user.id) {
        setPendingMediaRequest({ senderId, username, messageType, fileData, fileName, fileMime, audioData, requesterSocketId });
        showToast(`${username} wants to share ${messageType === 'audio' ? 'a voice message' : 'an image'}.`, 'info');
      }
    });

    socket.on('media_share_approved', () => {
      showToast('Media shared successfully!', 'info');
    });

    socket.on('media_share_denied', () => {
      showToast('Media share request denied by admin.', 'error');
    });

    // Screen Share Permission Listeners
    socket.on('screen_share_requested', ({ userId, username, requesterSocketId }) => {
      if (roomDetails?.created_by === user.id) {
        setPendingScreenShareRequest({ userId, username, requesterSocketId });
        showToast(`${username} wants to share their screen.`, 'info');
      }
    });

    socket.on('screen_share_approved', () => {
      showToast('Screen share approved by admin!', 'info');
      startScreenShare();
    });

    socket.on('screen_share_denied', () => {
      showToast('Screen share request denied by admin.', 'error');
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

    socket.on('message_deleted', ({ messageId }) => {
      setMessages((prev) => prev.filter((msg) => (msg.id || msg._id) !== messageId));
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
      socket.off('media_share_requested');
      socket.off('media_share_approved');
      socket.off('media_share_denied');
      socket.off('screen_share_requested');
      socket.off('screen_share_approved');
      socket.off('screen_share_denied');
      socket.off('screen_share_started');
      socket.off('screen_share_offer');
      socket.off('screen_share_answer');
      socket.off('screen_share_ice_candidate');
      socket.off('screen_share_stopped');
      socket.off('message_deleted');
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
    const isAdmin = roomDetails?.created_by === user.id;
    if (isAdmin) {
      socket.emit('send_message', {
        roomId,
        senderId: user.id,
        message: 'Voice message',
        username: user.username,
        messageType: 'audio',
        audioData
      });
    } else {
      socket.emit('media_share_request', {
        roomId,
        senderId: user.id,
        username: user.username,
        messageType: 'audio',
        audioData
      });
      showToast('Voice message sent to admin for approval.', 'info');
    }
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
      const isAdmin = roomDetails?.created_by === user.id;
      if (isAdmin) {
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
      } else {
        socket.emit('media_share_request', {
          roomId,
          senderId: user.id,
          username: user.username,
          messageType: 'image',
          fileData: reader.result,
          fileName: file.name,
          fileMime: file.type
        });
        showToast('Image sent to admin for approval.', 'info');
      }
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
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
    peerConnectionsRef.current = {};
    setIsSharingScreen(false);
    socket.emit('screen_share_stop', { roomId });
  };

  const handleScreenShareRequest = () => {
    if (isAdmin) {
      startScreenShare();
    } else {
      socket.emit('screen_share_request', { roomId, userId: user.id, username: user.username });
      showToast('Screen share request sent to admin...', 'info');
    }
  };

  const handleApproveScreenShare = () => {
    if (!pendingScreenShareRequest) return;
    socket.emit('screen_share_approve', {
      roomId,
      requesterSocketId: pendingScreenShareRequest.requesterSocketId
    });
    setPendingScreenShareRequest(null);
    showToast('Screen share approved.', 'info');
  };

  const handleDenyScreenShare = () => {
    if (!pendingScreenShareRequest) return;
    socket.emit('screen_share_deny', {
      roomId,
      requesterSocketId: pendingScreenShareRequest.requesterSocketId
    });
    setPendingScreenShareRequest(null);
    showToast('Screen share denied.', 'info');
  };

  const handleDeleteMessage = (msg) => {
    const messageId = msg.id || msg._id;
    if (!messageId) return;
    socket.emit('delete_message', { roomId, messageId, senderId: user.id });
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

  // Attach local screen stream to video element once it mounts
  useEffect(() => {
    if (isSharingScreen && localScreenStreamRef.current && localVideoRef.current) {
      localVideoRef.current.srcObject = localScreenStreamRef.current;
    }
  }, [isSharingScreen]);


  if (loading) return <div className="h-full flex items-center justify-center text-gray-500 font-medium">Loading Workspace...</div>;

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
            className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4.5 py-2.5 rounded-xl shadow-soft flex items-center gap-2 border font-semibold text-xs ${
              toast.type === 'error'
                ? 'bg-danger text-white border-danger/30'
                : 'bg-brand text-white border-brand/20'
            }`}
          >
            {toast.type === 'error' ? <AlertCircle size={14} /> : <Check size={14} />}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col card overflow-hidden relative">

        {/* Workspace Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          {/* Left: Back + Timer */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="w-8 h-8 rounded-xl bg-secondary border border-border flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all"
              title="Back to Dashboard"
            >
              <ArrowLeft size={16} />
            </button>

            <button
              type="button"
              onClick={() => {
                if (!isAdmin) {
                  showToast('Admin only', 'error');
                } else {
                  setShowTimerModal(true);
                }
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-secondary border border-border hover:border-brand/30 transition-all group"
              title={isAdmin ? 'Click to adjust room timer' : 'Timer (Admin only)'}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" className="text-brand shrink-0">
                <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.2" />
                {roomTimerSecondsLeft !== null && (
                  <circle
                    cx="10" cy="10" r="8"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeDasharray={2 * Math.PI * 8}
                    strokeDashoffset={2 * Math.PI * 8 * (1 - roomTimerSecondsLeft / 3600)}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-linear"
                    transform="rotate(-90 10 10)"
                  />
                )}
              </svg>
              <span className="text-xs font-semibold font-mono text-gray-500 group-hover:text-gray-700 transition-colors">
                {roomTimerSecondsLeft !== null
                  ? `${Math.floor(roomTimerSecondsLeft / 60)}:${String(roomTimerSecondsLeft % 60).padStart(2, '0')}`
                  : 'No limit'}
              </span>
            </button>
          </div>

          {/* Center: Room Name */}
          <div className="flex flex-col items-center">
            <h2 className="font-bold text-gray-900 tracking-tight">{roomDetails?.room_name}</h2>
            {roomDetails?.agenda && (
              <p className="text-xs text-gray-500 font-medium line-clamp-1 max-w-[200px] md:max-w-sm">{roomDetails?.agenda}</p>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            {/* Screen Share Button */}
            <button
              onClick={() => {
                if (isSharingScreen) {
                  stopScreenShare();
                } else {
                  handleScreenShareRequest();
                }
              }}
              className={`text-xs font-semibold px-3 py-2 rounded-xl border transition-all flex items-center gap-1.5 ${
                isSharingScreen
                  ? 'bg-brand/10 text-brand border-brand/20 hover:bg-brand hover:text-white'
                  : 'bg-secondary text-gray-600 border-border hover:bg-gray-100 hover:text-gray-800'
              }`}
              title={isSharingScreen ? 'Stop sharing screen' : (isAdmin ? 'Share your screen' : 'Request to share screen')}
            >
              {isSharingScreen ? <MonitorOff size={14} /> : <Monitor size={14} />}
              <span className="hidden sm:inline">
                {isSharingScreen ? 'Stop Share' : (isAdmin ? 'Share Screen' : 'Request Share')}
              </span>
            </button>
            <button
              onClick={() => {
                if (!isAdmin) {
                  showToast('Admin only', 'error');
                } else {
                  setShowEndModal(true);
                }
              }}
              className="text-xs font-semibold px-3 py-2 rounded-xl border border-danger/20 text-danger hover:bg-danger hover:text-white transition-all flex items-center gap-1.5"
              title={isAdmin ? 'End Sprint' : 'End Sprint (Admin only)'}
            >
              <AlertCircle size={14} />
              <span className="hidden sm:inline">End Sprint</span>
            </button>
          </div>
        </div>

        {/* Pending Presentation Request Banner (Admin Only) */}
        {pendingPresentationRequest && (
          <div className="bg-brand-light border-b border-brand/20 px-6 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Presentation className="text-brand shrink-0" size={16} />
              <span>
                <strong>{pendingPresentationRequest.username}</strong> wants to present <strong>{pendingPresentationRequest.fileName}</strong>.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleApprovePresentation}
                className="px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-hover transition-all flex items-center gap-1"
              >
                <Check size={12} /> Allow
              </button>
              <button
                onClick={handleDenyPresentation}
                className="px-3 py-1.5 rounded-lg bg-danger/10 text-danger text-xs font-semibold hover:bg-danger hover:text-white transition-all flex items-center gap-1"
              >
                <X size={12} /> Deny
              </button>
            </div>
          </div>
        )}

        {/* Pending Screen Share Request Banner (Admin Only) */}
        {pendingScreenShareRequest && (
          <div className="bg-brand-light border-b border-brand/20 px-6 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Monitor className="text-brand shrink-0" size={16} />
              <span>
                <strong>{pendingScreenShareRequest.username}</strong> wants to share their screen.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleApproveScreenShare}
                className="px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-hover transition-all flex items-center gap-1"
              >
                <Check size={12} /> Allow
              </button>
              <button
                onClick={handleDenyScreenShare}
                className="px-3 py-1.5 rounded-lg bg-danger/10 text-danger text-xs font-semibold hover:bg-danger hover:text-white transition-all flex items-center gap-1"
              >
                <X size={12} /> Deny
              </button>
            </div>
          </div>
        )}

        {/* Pending Media Request Banner (Admin Only) */}
        {pendingMediaRequest && (
          <div className="bg-brand-light border-b border-brand/20 px-6 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3 text-sm text-gray-700 min-w-0">
              {pendingMediaRequest.messageType === 'image' && pendingMediaRequest.fileData ? (
                <img
                  src={pendingMediaRequest.fileData}
                  alt="Preview"
                  className="w-12 h-12 rounded-lg object-cover border border-brand/30 shrink-0"
                />
              ) : (
                <Mic className="text-brand shrink-0" size={16} />
              )}
              <span className="truncate">
                <strong>{pendingMediaRequest.username}</strong> wants to share{' '}
                {pendingMediaRequest.messageType === 'audio' ? 'a voice message' : 'an image'}
                {pendingMediaRequest.fileName && <>: <strong>{pendingMediaRequest.fileName}</strong></>}.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-3">
              <button
                onClick={() => {
                  if (!pendingMediaRequest) return;
                  socket.emit('media_share_approve', {
                    roomId,
                    requesterSocketId: pendingMediaRequest.requesterSocketId,
                    senderId: pendingMediaRequest.senderId,
                    username: pendingMediaRequest.username,
                    messageType: pendingMediaRequest.messageType,
                    fileData: pendingMediaRequest.fileData,
                    fileName: pendingMediaRequest.fileName,
                    fileMime: pendingMediaRequest.fileMime,
                    audioData: pendingMediaRequest.audioData
                  });
                  setPendingMediaRequest(null);
                }}
                className="px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-hover transition-all flex items-center gap-1"
              >
                <Check size={12} /> Allow
              </button>
              <button
                onClick={() => {
                  if (!pendingMediaRequest) return;
                  socket.emit('media_share_deny', {
                    roomId,
                    requesterSocketId: pendingMediaRequest.requesterSocketId
                  });
                  setPendingMediaRequest(null);
                }}
                className="px-3 py-1.5 rounded-lg bg-danger/10 text-danger text-xs font-semibold hover:bg-danger hover:text-white transition-all flex items-center gap-1"
              >
                <X size={12} /> Deny
              </button>
            </div>
          </div>
        )}

        {/* Active Presentation Slides Panel */}
        {activePresentation && (
          <div className="bg-secondary border-b border-border px-6 py-4 flex flex-col gap-3 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <Presentation className="text-brand shrink-0" size={16} />
                <span className="text-xs text-gray-500 font-medium truncate">
                  Presenting: <strong className="text-gray-800">{activePresentation.fileName}</strong> by{' '}
                  <strong className="text-brand">{activePresentation.presenterName}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleDownloadPPT}
                  className="p-1.5 rounded-lg bg-white border border-border text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-all"
                  title="Download Presentation"
                >
                  <Download size={14} />
                </button>
                {(user.id === activePresentation.presenterId || roomDetails?.created_by === user.id) && (
                  <button
                    onClick={handleStopPresentation}
                    className="px-2.5 py-1 rounded-lg bg-danger/10 text-danger border border-danger/20 text-xs font-semibold hover:bg-danger hover:text-white transition-all"
                  >
                    Stop Presentation
                  </button>
                )}
              </div>
            </div>

            {/* Slide Showcase Area */}
            <div className="min-h-44 sm:min-h-64 bg-white border border-border rounded-xl flex flex-col relative overflow-hidden shadow-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-brand/[0.03] to-gray-50 pointer-events-none" />

              {/* Slide Content */}
              <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6">
                {presentationSlides.length > 0 && presentationSlides[activePresentation.currentSlide - 1] ? (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                    {presentationSlides[activePresentation.currentSlide - 1].images.length > 0 && (
                      <div className="flex flex-wrap items-center justify-center gap-4 max-w-full">
                        {presentationSlides[activePresentation.currentSlide - 1].images.map((img, i) => (
                          <img
                            key={i}
                            src={img}
                            alt={`Slide ${activePresentation.currentSlide} image ${i + 1}`}
                            className="max-h-56 max-w-full rounded-lg object-contain shadow-sm border border-border"
                          />
                        ))}
                      </div>
                    )}

                    {presentationSlides[activePresentation.currentSlide - 1].texts.length > 0 && (
                      <div className="w-full max-w-lg space-y-2">
                        {presentationSlides[activePresentation.currentSlide - 1].texts.map((text, i) => (
                          <p key={i} className="text-sm text-gray-600 text-center leading-relaxed">{text}</p>
                        ))}
                      </div>
                    )}

                    {presentationSlides[activePresentation.currentSlide - 1].images.length === 0 &&
                      presentationSlides[activePresentation.currentSlide - 1].texts.length === 0 && (
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand/10 to-gray-100 flex items-center justify-center border border-border font-bold text-gray-400 text-lg">
                          {activePresentation.currentSlide}
                        </div>
                        <p className="text-sm text-gray-400">Slide {activePresentation.currentSlide}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand/10 to-gray-100 flex items-center justify-center border border-border font-bold text-gray-400 text-lg">
                      {activePresentation.currentSlide}
                    </div>
                    <p className="text-sm text-gray-400">
                      Slide {activePresentation.currentSlide} of {activePresentation.totalSlides || presentationSlides.length || 1}
                    </p>
                    <p className="text-[11px] text-gray-400">Presentation syncing live with all room members</p>
                  </div>
                )}
              </div>

              {/* Slide Counter & Controls */}
              <div className="relative z-10 flex items-center justify-between px-4 py-2 bg-gray-50 border-t border-border">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Presentation size={12} className="text-brand" />
                  <span>
                    Slide {activePresentation.currentSlide} of {activePresentation.totalSlides || presentationSlides.length || 1}
                  </span>
                </div>

                <div className="flex items-center gap-2">
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
                        className="p-1.5 rounded-lg bg-white border border-border text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-all cursor-pointer"
                        title="Add Image to Presentation"
                      >
                        <Image size={13} />
                      </label>
                    </>
                  )}

                  {user.id === activePresentation.presenterId && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleSlideChange('prev')}
                        disabled={activePresentation.currentSlide <= 1}
                        className="p-1.5 rounded-lg bg-white border border-border text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Previous Slide"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <button
                        onClick={() => handleSlideChange('next')}
                        disabled={activePresentation.currentSlide >= (activePresentation.totalSlides || presentationSlides.length || 1)}
                        className="p-1.5 rounded-lg bg-white border border-border text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
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
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
          {/* Empty State */}
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand/10 to-gray-100 mx-auto flex items-center justify-center border border-border mb-4">
              <span className="text-2xl font-bold text-brand">{roomDetails?.room_name?.charAt(0)}</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900">Welcome to {roomDetails?.room_name}</h3>
            <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto leading-relaxed">
              This is the start of the ephemeral discussion. All messages will be permanently deleted when the sprint ends.
            </p>
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
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                      isMe
                        ? 'bg-brand text-white'
                        : 'bg-secondary text-gray-500 border border-border'
                    }`}
                  >
                    {msg.username ? msg.username.charAt(0).toUpperCase() : '?'}
                  </div>
                  <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[75%] group`}>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-xs font-semibold text-gray-700">{msg.username}</span>
                      <span className="text-[10px] text-gray-400 font-medium">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <div
                        className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                          isMe
                            ? 'bg-brand text-white rounded-tr-sm'
                            : 'bg-white text-gray-800 rounded-tl-sm border border-border'
                        }`}
                      >
                        {msg.message_type === 'image' && msg.file_data ? (
                          <div className="flex flex-col gap-2 min-w-40">
                            <img
                              src={msg.file_data}
                              alt={msg.file_name || 'Shared image'}
                              className="max-h-72 max-w-full rounded-lg object-contain cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => window.open(msg.file_data, '_blank')}
                            />
                            {msg.file_name && (
                              <span className="text-[11px] text-gray-500 font-medium truncate">{msg.file_name}</span>
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
                              <Presentation className={isMe ? 'text-white' : 'text-brand'} size={16} />
                              <span className="text-xs font-semibold opacity-80">PowerPoint Presentation</span>
                            </div>
                            <span className="font-bold text-xs line-clamp-1">{msg.file_name}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = msg.file_data;
                                link.download = msg.file_name;
                                link.click();
                              }}
                              className={`mt-1 flex items-center justify-center gap-1 rounded-lg py-1 px-3 text-xs font-bold transition-all ${
                                isMe
                                  ? 'bg-white/20 text-white hover:bg-white/30'
                                  : 'bg-secondary text-gray-600 border border-border hover:bg-gray-100'
                              }`}
                            >
                              <Download size={12} /> Download PPT
                            </button>
                          </div>
                        ) : (
                          msg.message
                        )}
                      </div>
                      {isMe && (msg.message_type === 'image' || msg.message_type === 'audio' || msg.message_type === 'ppt') && (
                        <button
                          onClick={() => handleDeleteMessage(msg)}
                          className="shrink-0 mt-2 p-1.5 rounded-lg text-gray-400 hover:text-danger hover:bg-danger/10 transition-all opacity-0 group-hover:opacity-100"
                          title="Delete message"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {typingUsers.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-gray-400 ml-11">
              <span className="flex gap-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
              <span>{typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="relative shrink-0 px-6 py-4 border-t border-border bg-white">
          {recordingError && (
            <div className="mb-3 text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
              {recordingError}
            </div>
          )}

          {/* Emoji Picker Panel */}
          {showEmojiPicker && (
            <div className="absolute bottom-20 left-6 bg-white border border-border rounded-2xl p-3 shadow-lift flex gap-1.5 z-50">
              {['👍', '❤️', '😂', '🎉', '🔥', '🚀', '👀', '😮', '😢', '💯', '✨'].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    setNewMessage((prev) => prev + emoji);
                    setShowEmojiPicker(false);
                  }}
                  className="w-8 h-8 rounded-lg hover:bg-gray-100 text-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleRecording}
              className={`shrink-0 p-3 rounded-xl border transition-all ${
                isRecording
                  ? 'bg-danger text-white border-danger shadow-[0_0_20px_rgba(255,92,92,0.35)]'
                  : 'bg-secondary text-gray-500 border-border hover:bg-gray-100 hover:text-gray-700'
              }`}
              aria-label={isRecording ? 'Stop recording voice message' : 'Record voice message'}
              title={isRecording ? 'Stop recording' : 'Record voice message'}
            >
              {isRecording ? <Square size={18} /> : <Mic size={18} />}
            </button>

            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={`shrink-0 p-3 rounded-xl border transition-all ${
                showEmojiPicker
                  ? 'bg-brand/10 text-brand border-brand/20'
                  : 'bg-secondary text-gray-500 border-border hover:bg-gray-100 hover:text-gray-700'
              }`}
              title="Insert emoji"
            >
              <Smile size={18} />
            </button>

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
              className={`shrink-0 p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                isImageUploading
                  ? 'bg-brand/10 border-brand/20 animate-pulse'
                  : 'bg-secondary text-gray-500 border-border hover:bg-gray-100 hover:text-gray-700'
              } ${isRecording || isPPTUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
              title="Send Image"
            >
              <Image size={18} />
            </label>

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
              className={`shrink-0 p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                isPPTUploading
                  ? 'bg-brand/10 border-brand/20 animate-pulse'
                  : 'bg-secondary text-gray-500 border-border hover:bg-gray-100 hover:text-gray-700'
              } ${isRecording ? 'opacity-50 cursor-not-allowed' : ''}`}
              title="Share PPT Presentation"
            >
              <FileSymlink size={18} />
            </label>

            <div className="relative flex-1">
              <input
                type="text"
                className="w-full bg-gray-50 border border-border rounded-xl pl-5 pr-14 py-3.5 text-sm focus:outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/20 transition-all text-gray-800 placeholder:text-gray-400"
                placeholder={
                  isRecording
                    ? 'Recording voice message...'
                    : isPPTUploading
                      ? 'Uploading presentation...'
                      : `Message in ${roomDetails?.room_name}...`
                }
                value={newMessage}
                disabled={isRecording || isPPTUploading}
                onChange={handleTyping}
              />
              <button
                type="submit"
                disabled={!newMessage.trim()}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 bg-brand hover:bg-brand-hover text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                <Send size={16} />
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Screen Share Video Overlay - Floating, Draggable */}
      {(isViewingScreen || isSharingScreen) && (
        <div
          ref={screenShareElRef}
          className="fixed z-50 rounded-2xl overflow-hidden border border-border shadow-lift bg-white select-none"
          style={{ width: screenShareSize, left: screenSharePosRef.current.x, top: screenSharePosRef.current.y }}
        >
          <div
            onMouseDown={handleScreenShareMouseDown}
            className="flex items-center justify-between px-3 py-2 bg-white border-b border-border cursor-grab active:cursor-grabbing"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Monitor size={13} className="text-brand shrink-0" />
              <span className="text-xs font-semibold text-gray-600 truncate">
                {isSharingScreen ? 'You are sharing' : `${screenSharerInfo?.username}'s screen`}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <input
                type="range"
                min="200"
                max="900"
                step="10"
                value={screenShareSize}
                onChange={(e) => setScreenShareSize(Number(e.target.value))}
                onMouseDown={(e) => e.stopPropagation()}
                className="w-16 h-1 accent-brand cursor-pointer"
                title="Adjust size"
              />
              <button
                onClick={cleanupScreenShareViewer}
                onMouseDown={(e) => e.stopPropagation()}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all ml-1"
                title="Close"
              >
                <X size={13} />
              </button>
            </div>
          </div>
          {isSharingScreen ? (
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full aspect-video bg-black object-contain"
            />
          ) : (
            <video
              ref={remoteVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full aspect-video bg-black object-contain"
            />
          )}
        </div>
      )}

      {/* Sidebar: Online Users */}
      <div className="w-full md:w-72 card flex flex-col shrink-0 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <Users size={16} className="text-brand" /> Online ({onlineUsers.length})
          </h3>
        </div>
        <div className="space-y-1">
          {onlineUsers.map((u, i) => (
            <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-secondary transition-colors">
              <div className="relative">
                <div className="w-9 h-9 rounded-xl bg-secondary border border-border flex items-center justify-center text-sm font-bold text-gray-500">
                  {u.username.charAt(0).toUpperCase()}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-success border-2 border-white rounded-full" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold text-gray-800 truncate">{u.username}</span>
                {u.userId === roomDetails?.created_by ? (
                  <span className="text-[10px] font-bold text-brand tracking-wide">ADMIN</span>
                ) : (
                  <span className="text-[10px] text-gray-400">MEMBER</span>
                )}
              </div>
            </div>
          ))}
          {onlineUsers.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-8">No other users online</p>
          )}
        </div>
      </div>

      {/* End Room Modal */}
      {showEndModal && (
        <div className="fixed inset-0 bg-gray-900/40 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-border rounded-2xl p-6 w-full max-w-md shadow-lift"
          >
            <div className="w-12 h-12 bg-danger/10 text-danger rounded-full flex items-center justify-center mb-4 mx-auto">
              <AlertCircle size={24} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 text-center mb-2">End Sprint Room?</h2>
            <p className="text-gray-500 text-sm text-center mb-6 leading-relaxed">
              This action is irreversible. Ending the sprint will permanently delete this room, kick all participants,
              and wipe all messages from the database.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowEndModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-border text-gray-600 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEndRoom}
                className="flex-1 bg-danger hover:bg-red-600 text-white font-semibold py-2.5 rounded-xl transition-colors"
              >
                Yes, End Sprint
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Adjust Timer Modal */}
      {showTimerModal && (
        <div className="fixed inset-0 bg-gray-900/40 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-border rounded-2xl p-6 w-full max-w-sm shadow-lift"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Timer className="text-brand" size={18} /> Adjust Timer
              </h2>
              <button
                onClick={() => setShowTimerModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-all"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-gray-500 text-sm mb-6 leading-relaxed">
              Modify the duration of the current sprint. Decreasing the timer below 0 will end the sprint room
              immediately.
            </p>

            <div className="bg-secondary border border-border rounded-xl p-4 mb-6 flex flex-col items-center justify-center gap-1">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Time Remaining</span>
              <span className="text-2xl font-bold font-mono text-gray-800 tracking-wider">
                {roomTimerSecondsLeft !== null
                  ? `${Math.floor(roomTimerSecondsLeft / 60)}:${String(roomTimerSecondsLeft % 60).padStart(2, '0')}`
                  : 'NO LIMIT'}
              </span>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Quick Adjust</label>
              <div className="grid grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => handleAdjustTimer(-10)}
                  className="py-2 text-xs font-bold rounded-lg bg-danger/10 hover:bg-danger/20 text-danger border border-danger/10 hover:border-danger/20 transition-all"
                >
                  -10m
                </button>
                <button
                  type="button"
                  onClick={() => handleAdjustTimer(-5)}
                  className="py-2 text-xs font-bold rounded-lg bg-danger/10 hover:bg-danger/20 text-danger border border-danger/10 hover:border-danger/20 transition-all"
                >
                  -5m
                </button>
                <button
                  type="button"
                  onClick={() => handleAdjustTimer(5)}
                  className="py-2 text-xs font-bold rounded-lg bg-brand/10 hover:bg-brand/20 text-brand border border-brand/10 hover:border-brand/20 transition-all"
                >
                  +5m
                </button>
                <button
                  type="button"
                  onClick={() => handleAdjustTimer(10)}
                  className="py-2 text-xs font-bold rounded-lg bg-brand/10 hover:bg-brand/20 text-brand border border-brand/10 hover:border-brand/20 transition-all"
                >
                  +10m
                </button>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Custom Adjust</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  max="1440"
                  className="input-field py-2 text-sm text-center flex-1"
                  placeholder="Minutes"
                  value={customMinutes}
                  onChange={(e) => setCustomMinutes(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => {
                    const mins = Math.abs(Number(customMinutes) || 1);
                    handleAdjustTimer(-mins);
                  }}
                  className="px-4 py-2 text-xs font-bold rounded-lg border border-danger/20 bg-danger/10 hover:bg-danger/20 text-danger transition-all"
                >
                  Subtract
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const mins = Math.abs(Number(customMinutes) || 1);
                    handleAdjustTimer(mins);
                  }}
                  className="px-4 py-2 text-xs font-bold rounded-lg border border-brand/20 bg-brand/10 hover:bg-brand/20 text-brand transition-all"
                >
                  Add
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowTimerModal(false)}
              className="w-full py-2.5 rounded-xl border border-border text-gray-600 font-medium hover:bg-gray-50 transition-colors"
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
