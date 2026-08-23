import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Users, UserPlus, Check } from 'lucide-react';

export default function FriendsList({ user }) {
  const navigate = useNavigate();
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [search, setSearch] = useState('');
  
  const [friendUsername, setFriendUsername] = useState('');
  const [friendStatus, setFriendStatus] = useState('');

  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8443';

  useEffect(() => {
    document.title = 'Friends | TreamAI';
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const res = await fetch(`${baseUrl}/api/friends/${user}`);
      if (res.ok) {
        const data = await res.json();
        setFriends(data.friends);
        setPendingRequests(data.pending);
      }
    } catch (err) {
      console.error("Failed to fetch friends", err);
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
        setFriendStatus('Could not send request.');
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
        fetchData(); 
        window.dispatchEvent(new Event('sidebar-update'));
      }
    } catch (err) {
      console.error("Error accepting request", err);
    }
  };

  const handleChatNow = async (friendUsername) => {
    try {
      const res = await fetch(`${baseUrl}/api/chats/${user}`);
      if (res.ok) {
        const data = await res.json();
        const chat = data.chats.find(c => c.chat_type === 'private' && c.chat_name === friendUsername);
        if (chat) navigate(`/chat/${chat.chat_id}`);
      }
    } catch (err) {
      console.error("Failed to fetch chats to navigate", err);
    }
  };

  const filteredFriends = friends.filter(f => f.username.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '40px', maxWidth: '800px', margin: '0 auto', height: '100%' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '40px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'transparent', border: 'none', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={24} />
        </button>
        <h1 style={{ fontSize: '2rem', margin: 0 }}>All Friends</h1>
      </div>

      <div className="glass-panel animate-fade-in" style={{ padding: '30px', marginBottom: '20px' }}>
        <h2 style={{ marginBottom: '20px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <UserPlus size={20} color="#10b981" /> Add a Friend
        </h2>
        <form onSubmit={handleSendFriendRequest} style={{ display: 'flex', gap: '10px' }}>
          <input type="text" className="input-field" placeholder="Username" value={friendUsername} onChange={(e) => setFriendUsername(e.target.value)} required />
          <button type="submit" className="btn-primary" style={{ background: '#10b981' }}>Add</button>
        </form>
        {friendStatus && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '8px' }}>{friendStatus}</p>}
      </div>

      {pendingRequests.length > 0 && (
        <div className="glass-panel animate-fade-in" style={{ padding: '30px', marginBottom: '20px', animationDelay: '0.1s' }}>
          <h2 style={{ marginBottom: '20px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            Pending Requests <span style={{ background: '#ef4444', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.85rem' }}>{pendingRequests.length}</span>
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {pendingRequests.map((req, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '8px' }}>
                <span style={{ fontSize: '1.1rem' }}>{req.username}</span>
                <button onClick={() => handleAcceptRequest(req.username)} style={{ background: '#10b981', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Check size={16} /> Accept
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="glass-panel animate-fade-in" style={{ padding: '30px', flex: 1, animationDelay: '0.2s', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={20} color="var(--primary)" /> Friend List
          </h2>
          <div style={{ position: 'relative', width: '250px' }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              className="input-field" 
              placeholder="Search friends..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '38px' }}
            />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredFriends.map((f, i) => (
            <div key={i} style={{ padding: '15px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255, 255, 255, 0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <Users size={20} color="var(--text-muted)" />
                <span style={{ fontSize: '1.1rem' }}>{f.username}</span>
              </div>
              <button onClick={() => handleChatNow(f.username)} style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem' }}>
                Chat Now
              </button>
            </div>
          ))}
          {filteredFriends.length === 0 && (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '20px' }}>No friends found.</p>
          )}
        </div>
      </div>

    </div>
  );
}
