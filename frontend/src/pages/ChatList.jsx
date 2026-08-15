import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, MessageSquare, Hash } from 'lucide-react';

export default function ChatList({ user, type }) {
  const navigate = useNavigate();
  const [chats, setChats] = useState([]);
  const [search, setSearch] = useState('');

  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8443';

  useEffect(() => {
    document.title = type === 'private' ? 'Private Chats | Teamora' : 'Team Chats | Teamora';
    fetchChats();
  }, [user, type]);

  const fetchChats = async () => {
    try {
      const res = await fetch(`${baseUrl}/api/chats/${user}`);
      if (res.ok) {
        const data = await res.json();
        const filtered = data.chats.filter(c => c.chat_type === type);
        setChats(filtered);
      }
    } catch (err) {
      console.error("Failed to fetch chats", err);
    }
  };

  const filteredChats = chats.filter(c => c.chat_name.toLowerCase().includes(search.toLowerCase()));
  
  // Sort Agent to top for private chats if present
  if (type === 'private') {
    const agentIndex = filteredChats.findIndex(c => c.chat_name === 'Teamora Agent');
    if (agentIndex > -1) {
      const agent = filteredChats.splice(agentIndex, 1)[0];
      filteredChats.unshift(agent);
    }
  }

  const formatTimeAgo = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString + 'Z');
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} mins ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return `${Math.floor(diff / 86400)} days ago`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '40px', maxWidth: '800px', margin: '0 auto', height: '100%' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '40px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'transparent', border: 'none', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={24} />
        </button>
        <h1 style={{ fontSize: '2rem', margin: 0 }}>
          {type === 'private' ? 'All Private Chats' : 'All Team Chats'}
        </h1>
      </div>

      <div className="animate-fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '30px', width: '100%' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={20} color="var(--text-muted)" style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              className="input-field" 
              placeholder="Search chats..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ padding: '16px 20px 16px 52px', fontSize: '1.1rem', borderRadius: '12px' }}
            />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredChats.map(chat => (
            <div 
              key={chat.chat_id}
              onClick={() => navigate(`/chat/${chat.chat_id}`)}
              style={{ 
                padding: '15px', 
                borderRadius: '8px', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: chat.chat_name === 'Teamora Agent' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                border: chat.chat_name === 'Teamora Agent' ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent'
              }}
              className="hover-bg"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                {type === 'private' ? (
                  <MessageSquare size={20} color={chat.chat_name === 'Teamora Agent' ? 'var(--primary)' : 'var(--text-muted)'} />
                ) : (
                  <Hash size={20} color="var(--text-muted)" />
                )}
                <span style={{ fontSize: '1.1rem', fontWeight: chat.chat_name === 'Teamora Agent' ? '600' : 'normal' }}>{chat.chat_name}</span>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                {formatTimeAgo(chat.last_activity)}
              </div>
            </div>
          ))}
          {filteredChats.length === 0 && (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '20px' }}>No chats found.</p>
          )}
        </div>
      </div>

    </div>
  );
}
