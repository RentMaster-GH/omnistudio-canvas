import React, { useState, useEffect, useRef } from 'react';
import { Phone, Video, MessageSquare, UserPlus, PhoneOff, Mic, MicOff, VideoOff, Send, Users, X, ShieldCheck } from 'lucide-react';
import { io, Socket } from 'socket.io-client';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  guestUserId: string;
  borderCol?: string;
  bgBar?: string;
}

interface Friend {
  id: string;
  name: string;
  status: 'online' | 'offline';
}

interface Message {
  senderId: string;
  text: string;
  timestamp: string;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export const SocialMessengerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  guestUserId,
}) => {
  const [friends, setFriends] = useState<Friend[]>(() => {
    const saved = localStorage.getItem('omni_friends_list');
    return saved ? JSON.parse(saved) : [
      { id: 'demo_peer_1', name: 'Alex Architect', status: 'online' },
      { id: 'demo_peer_2', name: 'Sarah Engineer', status: 'online' },
    ];
  });

  const [activeFriend, setActiveFriend] = useState<Friend | null>(friends[0] || null);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [chatInput, setChatInput] = useState('');
  const [newFriendIdInput, setNewFriendIdInput] = useState('');

  // Call & WebRTC States
  const [callState, setCallState] = useState<'idle' | 'calling' | 'incoming' | 'connected'>('idle');
  const [callType, setCallType] = useState<'audio' | 'video'>('video');
  const [callerInfo, setCallerInfo] = useState<{ id: string; name: string } | null>(null);

  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoDisabled, setIsVideoDisabled] = useState(false);

  // WebRTC Refs
  const socketRef = useRef<Socket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const pendingOfferRef = useRef<any>(null);

  useEffect(() => {
    localStorage.setItem('omni_friends_list', JSON.stringify(friends));
  }, [friends]);

  // Socket & Signaling Initialization
  useEffect(() => {
    const socketUrl = window.location.hostname === 'localhost' ? 'http://localhost:5000' : window.location.origin;
    const socket = io(socketUrl, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.emit('register-social-user', { userId: guestUserId });

    // Handle Incoming Message
    socket.on('receive-message', ({ senderId, text, timestamp }) => {
      setMessages((prev) => ({
        ...prev,
        [senderId]: [...(prev[senderId] || []), { senderId, text, timestamp }],
      }));
    });

    // Handle Incoming Call Offer
    socket.on('incoming-call', ({ callerId, callerName, type, offer }) => {
      setCallerInfo({ id: callerId, name: callerName });
      setCallType(type);
      pendingOfferRef.current = offer;
      setCallState('incoming');
    });

    // Handle Call Answer
    socket.on('call-answered', async ({ answer }) => {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        setCallState('connected');
      }
    });

    // Handle ICE Candidates
    socket.on('ice-candidate', async ({ candidate }) => {
      if (peerConnectionRef.current && candidate) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.warn('ICE candidate error:', e);
        }
      }
    });

    // Handle End Call
    socket.on('call-ended', () => {
      endCallCleanup();
    });

    return () => {
      socket.disconnect();
    };
  }, [guestUserId]);

  if (!isOpen) return null;

  // --- WEBRTC CALL HANDLERS ---
  const initializePeerConnection = () => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate && activeFriend && socketRef.current) {
        socketRef.current.emit('send-ice-candidate', {
          targetId: activeFriend.id,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  };

  const startCall = async (type: 'audio' | 'video') => {
    if (!activeFriend) {
      alert('Please select a friend to call!');
      return;
    }

    try {
      setCallType(type);
      setCallState('calling');

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video',
      });

      localStreamRef.current = stream;
      if (localVideoRef.current && type === 'video') {
        localVideoRef.current.srcObject = stream;
      }

      const pc = initializePeerConnection();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      if (socketRef.current) {
        socketRef.current.emit('call-user', {
          targetId: activeFriend.id,
          callerId: guestUserId,
          callerName: 'Peer User (' + guestUserId.substring(0, 6) + ')',
          type,
          offer,
        });
      }
    } catch (err: any) {
      alert('Could not start call: ' + err.message);
      endCallCleanup();
    }
  };

  const acceptCall = async () => {
    try {
      setCallState('connected');

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'video',
      });

      localStreamRef.current = stream;
      if (localVideoRef.current && callType === 'video') {
        localVideoRef.current.srcObject = stream;
      }

      const pc = initializePeerConnection();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      if (pendingOfferRef.current) {
        await pc.setRemoteDescription(new RTCSessionDescription(pendingOfferRef.current));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        if (socketRef.current && callerInfo) {
          socketRef.current.emit('answer-call', {
            targetId: callerInfo.id,
            answer,
          });
        }
      }
    } catch (err: any) {
      alert('Error accepting call: ' + err.message);
      endCallCleanup();
    }
  };

  const endCallCleanup = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    setCallState('idle');
    setCallerInfo(null);
  };

  const handleEndCall = () => {
    if (socketRef.current && activeFriend) {
      socketRef.current.emit('end-call', { targetId: activeFriend.id });
    }
    endCallCleanup();
  };

  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoDisabled(!videoTrack.enabled);
      }
    }
  };

  // --- CHAT HANDLERS ---
  const handleSendMessage = () => {
    if (!chatInput.trim() || !activeFriend) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMsg: Message = { senderId: guestUserId, text: chatInput, timestamp: timeStr };

    setMessages((prev) => ({
      ...prev,
      [activeFriend.id]: [...(prev[activeFriend.id] || []), newMsg],
    }));

    if (socketRef.current) {
      socketRef.current.emit('send-private-message', {
        targetId: activeFriend.id,
        senderId: guestUserId,
        text: chatInput,
        timestamp: timeStr,
      });
    }

    setChatInput('');
  };

  const handleAddFriend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFriendIdInput.trim()) return;

    const newFriend: Friend = {
      id: newFriendIdInput.trim(),
      name: 'Peer ' + newFriendIdInput.trim().substring(0, 8),
      status: 'online',
    };

    setFriends((prev) => [...prev.filter((f) => f.id !== newFriend.id), newFriend]);
    setActiveFriend(newFriend);
    setNewFriendIdInput('');
  };

  const activeFriendMessages = activeFriend ? messages[activeFriend.id] || [] : [];

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.88)',
      backdropFilter: 'blur(8px)',
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#1e293b',
        color: '#ffffff',
        borderRadius: '16px',
        maxWidth: '860px',
        width: '100%',
        height: '600px',
        border: '1px solid #334155',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', backgroundColor: '#0f172a', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users style={{ width: '22px', height: '22px', color: '#38bdf8' }} />
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>Studio Social, Chat & P2P Calls</h3>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>Your ID: <b style={{ color: '#38bdf8', fontFamily: 'monospace' }}>{guestUserId}</b></span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <X style={{ width: '20px', height: '20px' }} />
          </button>
        </div>

        {/* Main Body Grid */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Left Sidebar: Friends List */}
          <div style={{ width: '260px', backgroundColor: '#0f172a', borderRight: '1px solid #334155', display: 'flex', flexDirection: 'column' }}>
            {/* Add Friend Input */}
            <form onSubmit={handleAddFriend} style={{ padding: '12px', borderBottom: '1px solid #334155', display: 'flex', gap: '6px' }}>
              <input
                type="text"
                value={newFriendIdInput}
                onChange={(e) => setNewFriendIdInput(e.target.value)}
                placeholder="Add Friend ID..."
                style={{ flex: 1, backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '6px', padding: '6px 8px', color: '#fff', fontSize: '12px' }}
              />
              <button type="submit" style={{ padding: '6px 10px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                <UserPlus style={{ width: '14px', height: '14px' }} />
              </button>
            </form>

            {/* Friends List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
              <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', padding: '4px 8px', display: 'block', textTransform: 'uppercase' }}>Friends ({friends.length})</span>
              {friends.map((f) => (
                <div
                  key={f.id}
                  onClick={() => setActiveFriend(f)}
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    backgroundColor: activeFriend?.id === f.id ? '#1e293b' : 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '4px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: f.status === 'online' ? '#10b981' : '#64748b' }} />
                    <span style={{ fontSize: '13px', fontWeight: 'bold', color: activeFriend?.id === f.id ? '#ffffff' : '#cbd5e1' }}>{f.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Main Stage: Active Call Stage or Chat Window */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#1e293b', position: 'relative' }}>
            {/* Active Call Video Stage Overlay */}
            {callState === 'connected' || callState === 'calling' ? (
              <div style={{ flex: 1, backgroundColor: '#0f172a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                {callType === 'video' ? (
                  <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                    <video ref={remoteVideoRef} autoPlay style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <video ref={localVideoRef} autoPlay muted style={{ position: 'absolute', bottom: '16px', right: '16px', width: '140px', height: '100px', objectFit: 'cover', borderRadius: '8px', border: '2px solid #0284c7' }} />
                  </div>
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <Phone style={{ width: '48px', height: '48px', color: '#38bdf8', marginBottom: '12px' }} />
                    <h4 style={{ margin: 0, fontSize: '18px' }}>Voice Call with {activeFriend?.name}</h4>
                    <span style={{ fontSize: '12px', color: '#34d399' }}>Connected • HD P2P Audio</span>
                  </div>
                )}

                {/* Call Controls Bar */}
                <div style={{ position: 'absolute', bottom: '20px', display: 'flex', gap: '12px', backgroundColor: 'rgba(15, 23, 42, 0.85)', padding: '10px 20px', borderRadius: '30px', backdropFilter: 'blur(6px)' }}>
                  <button onClick={toggleMic} style={{ padding: '10px', borderRadius: '50%', backgroundColor: isMicMuted ? '#ef4444' : '#334155', color: '#fff', border: 'none', cursor: 'pointer' }}>
                    {isMicMuted ? <MicOff style={{ width: '18px', height: '18px' }} /> : <Mic style={{ width: '18px', height: '18px' }} />}
                  </button>
                  {callType === 'video' && (
                    <button onClick={toggleVideo} style={{ padding: '10px', borderRadius: '50%', backgroundColor: isVideoDisabled ? '#ef4444' : '#334155', color: '#fff', border: 'none', cursor: 'pointer' }}>
                      {isVideoDisabled ? <VideoOff style={{ width: '18px', height: '18px' }} /> : <Video style={{ width: '18px', height: '18px' }} />}
                    </button>
                  )}
                  <button onClick={handleEndCall} style={{ padding: '10px 20px', borderRadius: '30px', backgroundColor: '#ef4444', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <PhoneOff style={{ width: '18px', height: '18px' }} /> End Call
                  </button>
                </div>
              </div>
            ) : activeFriend ? (
              <>
                {/* Active Chat Header with Call Buttons */}
                <div style={{ padding: '12px 16px', backgroundColor: '#0f172a', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{activeFriend.name}</span>
                    <span style={{ fontSize: '11px', color: '#10b981' }}>● Online</span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => startCall('audio')} style={{ padding: '6px 12px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Phone style={{ width: '14px', height: '14px' }} /> Voice Call
                    </button>
                    <button onClick={() => startCall('video')} style={{ padding: '6px 12px', backgroundColor: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Video style={{ width: '14px', height: '14px' }} /> Video Call
                    </button>
                  </div>
                </div>

                {/* Messages Stream */}
                <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {activeFriendMessages.map((m, idx) => (
                    <div key={idx} style={{ alignSelf: m.senderId === guestUserId ? 'flex-end' : 'flex-start', maxWidth: '70%' }}>
                      <div style={{ backgroundColor: m.senderId === guestUserId ? '#0284c7' : '#334155', padding: '8px 12px', borderRadius: '12px', color: '#fff', fontSize: '13px' }}>
                        {m.text}
                      </div>
                      <span style={{ fontSize: '10px', color: '#64748b', marginTop: '2px', display: 'block', textAlign: m.senderId === guestUserId ? 'right' : 'left' }}>{m.timestamp}</span>
                    </div>
                  ))}
                </div>

                {/* Chat Input Bar */}
                <div style={{ padding: '12px', backgroundColor: '#0f172a', borderTop: '1px solid #334155', display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder={`Message ${activeFriend.name}...`}
                    style={{ flex: 1, backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '8px 12px', color: '#fff', fontSize: '13px', outline: 'none' }}
                  />
                  <button onClick={handleSendMessage} style={{ padding: '8px 16px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                    <Send style={{ width: '16px', height: '16px' }} />
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>

        {/* Incoming Ringing Call Modal Overlay */}
        {callState === 'incoming' && callerInfo && (
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.95)', zIndex: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div style={{ width: '70px', height: '70px', borderRadius: '50%', backgroundColor: 'rgba(56, 189, 248, 0.2)', border: '2px solid #38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', animation: 'pulse 1s infinite' }}>
              <Phone style={{ width: '32px', height: '32px', color: '#38bdf8' }} />
            </div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '20px' }}>Incoming {callType.toUpperCase()} Call</h3>
            <span style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '24px' }}>{callerInfo.name} is calling you...</span>

            <div style={{ display: 'flex', gap: '16px' }}>
              <button onClick={handleEndCall} style={{ padding: '12px 24px', borderRadius: '30px', backgroundColor: '#ef4444', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>
                Decline
              </button>
              <button onClick={acceptCall} style={{ padding: '12px 28px', borderRadius: '30px', backgroundColor: '#10b981', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>
                Accept Call
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};