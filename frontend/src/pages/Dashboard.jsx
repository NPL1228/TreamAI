import { useNavigate, Link } from 'react-router-dom';
import { MessageSquare, Users, Video, LogOut, Settings, Plus, Hash, UserPlus, Check } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Dashboard({ user, onLogout }) {
  const navigate = useNavigate();
  
  // Data states
  const [chats, setChats] = useState([]);
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Form states
  const [joinCode, setJoinCode] = useState('');
  const [joinMeetingCode, setJoinMeetingCode] = useState('');
  const [newChatName, setNewChatName] = useState('');
  const [friendUsername, setFriendUsername] = useState('');
  
  // Status states
  const [friendStatus, setFriendStatus] = useState('');
  const [joinError, setJoinError] = useState('');
  const [createError, setCreateError] = useState('');

  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8443';

  useEffect(() => {
    document.title = 'Dashboard | TreamAI';
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const [chatsRes, friendsRes] = await Promise.all([
        fetch(`${baseUrl}/api/chats/${user}`),
        fetch(`${baseUrl}/api/friends/${user}`)
      ]);
      
      if (chatsRes.ok) {
        const data = await chatsRes.json();
        setChats(data.chats);
      }
      
      if (friendsRes.ok) {
        const data = await friendsRes.json();
        setFriends(data.friends);
        setPendingRequests(data.pending);
      }
    } catch (err) {
      console.error("Failed to fetch dashboard data", err);
    }
  };

  const handleSendFriendRequest = async (e) => {
    e.preventDefault();
    setFriendStatus('');
    if (!friendUsername.trim()) return;

    try {
      const res = await fetch(`${baseUrl}/api/friends/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from_user: user, to_user: friendUsername.trim() })
      });
      if (res.ok) {
        setFriendStatus('Friend request sent!');
        setFriendUsername('');
      } else {
        setFriendStatus('Could not send request. User may not exist or request already pending.');
      }
    } catch (err) {
      setFriendStatus('Server error');
    }
  };

  const handleAcceptRequest = async (requester) => {
    try {
      const res = await fetch(`${baseUrl}/api/friends/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user1: requester, user2: user })
      });
      if (res.ok) {
        fetchData(); // Refresh to show new chat and friend
        window.dispatchEvent(new Event('sidebar-update'));
      }
    } catch (err) {
      console.error("Error accepting request", err);
    }
  };

  const handleJoinTeam = async (e) => {
    e.preventDefault();
    setJoinError('');
    if (!joinCode.trim()) return;

    try {
      const res = await fetch(`${baseUrl}/api/chats/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: joinCode.trim(), username: user })
      });
      if (res.ok) {
        navigate(`/chat/${joinCode.trim()}`);
      } else {
        const data = await res.json();
        setJoinError(data.detail || 'Code not found');
      }
    } catch (err) {
      setJoinError('Server error');
    }
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    setCreateError('');
    if (!newChatName.trim()) return;

    try {
      const res = await fetch(`${baseUrl}/api/chats/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_name: newChatName.trim(), chat_type: 'team', username: user })
      });
      if (res.ok) {
        const data = await res.json();
        navigate(`/chat/${data.chat_id}`);
      } else {
        setCreateError('Failed to create team');
      }
    } catch (err) {
      setCreateError('Server error');
    }
  };

  const handleJoinMeeting = (e) => {
    e.preventDefault();
    if (joinMeetingCode.trim()) {
      navigate(`/meeting/${joinMeetingCode.trim()}`);
    }
  };

  const handleCreateMeeting = () => {
    const randomCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    navigate(`/meeting/${randomCode}`);
  };

  return (
    <div style={{ padding: '40px' }}>
      
      <h1 style={{ fontSize: '2rem', marginBottom: '40px' }}>Dashboard</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px' }}>
          
          {/* Friends Management */}
          <div className="glass-panel animate-fade-in" style={{ padding: '30px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
              <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.2)', borderRadius: '12px', color: '#10b981' }}>
                <UserPlus size={24} />
              </div>
              <h2>Friends</h2>
            </div>
            
            <div style={{ marginBottom: '30px' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '10px' }}>Add Friend</h3>
              <form onSubmit={handleSendFriendRequest} style={{ display: 'flex', gap: '10px' }}>
                <input type="text" className="input-field" placeholder="Username" value={friendUsername} onChange={(e) => setFriendUsername(e.target.value)} required />
                <button type="submit" className="btn-primary" style={{ background: '#10b981' }}>Add</button>
              </form>
              {friendStatus && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '8px' }}>{friendStatus}</p>}
            </div>

          </div>

          {/* Team Chats */}
          <div className="glass-panel animate-fade-in" style={{ padding: '30px', animationDelay: '0.1s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
              <div style={{ padding: '12px', background: 'rgba(99, 102, 241, 0.2)', borderRadius: '12px', color: 'var(--primary)' }}>
                <Users size={24} />
              </div>
              <h2>Team Workspaces</h2>
            </div>
            
            <div style={{ marginBottom: '30px' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '10px' }}>Join via Code</h3>
              <form onSubmit={handleJoinTeam} style={{ display: 'flex', gap: '10px' }}>
                <input type="text" className="input-field" placeholder="8-digit code" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} required />
                <button type="submit" className="btn-primary">Join</button>
              </form>
              {joinError && <p style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '5px' }}>{joinError}</p>}
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '10px' }}>Create New Team</h3>
              <form onSubmit={handleCreateTeam} style={{ display: 'flex', gap: '10px' }}>
                <input type="text" className="input-field" placeholder="Team Name" value={newChatName} onChange={(e) => setNewChatName(e.target.value)} required />
                <button type="submit" className="btn-primary" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                  <Plus size={18} /> Create
                </button>
              </form>
              {createError && <p style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '5px' }}>{createError}</p>}
            </div>
          </div>

          {/* Video Meets */}
          <div className="glass-panel animate-fade-in" style={{ padding: '30px', animationDelay: '0.2s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
              <div style={{ padding: '12px', background: 'rgba(139, 92, 246, 0.2)', borderRadius: '12px', color: 'var(--secondary)' }}>
                <Video size={24} />
              </div>
              <h2>Video Meets</h2>
            </div>
            
            <div style={{ marginBottom: '30px' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '10px' }}>Join via Code</h3>
              <form onSubmit={handleJoinMeeting} style={{ display: 'flex', gap: '10px' }}>
                <input type="text" className="input-field" placeholder="Meeting Code" value={joinMeetingCode} onChange={(e) => setJoinMeetingCode(e.target.value)} required />
                <button type="submit" className="btn-primary" style={{ background: 'var(--secondary)' }}>Join</button>
              </form>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px', textAlign: 'center' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '10px', textAlign: 'left' }}>Instant Meeting</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px', textAlign: 'left' }}>Generate a random 8-character meeting code and jump right in.</p>
              <button onClick={handleCreateMeeting} className="btn-primary" style={{ background: 'var(--secondary)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', width: '100%' }}>
                <Video size={18} /> Start New Meeting
              </button>
            </div>
          </div>

        </div>
      </div>
  );
}
