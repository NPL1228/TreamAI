import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, MessageSquare, Hash, MoreVertical, Trash2, X } from 'lucide-react';

export default function ChatList({ user, type }) {
  const navigate = useNavigate();
  const [chats, setChats] = useState([]);
  const [search, setSearch] = useState('');
  const [activeMenu, setActiveMenu] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const globalWs = useRef(null);

  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8443';
  const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8443';

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

  useEffect(() => {
    document.title = type === 'private' ? 'Private Chats | TreamAI' : 'Team Chats | TreamAI';
    fetchChats();

    globalWs.current = new WebSocket(`${wsUrl}/ws/global/${user}`);
    globalWs.current.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'new_message' || msg.type === 'new_notification') {
          fetchChats();
        }
      } catch (e) {}
    };

    return () => {
      if (globalWs.current) globalWs.current.close();
    };
  }, [user, type, baseUrl, wsUrl]);

  useEffect(() => {
    const handleClickOutside = () => setActiveMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleDeleteChat = async (chatId) => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`${baseUrl}/api/chats/${chatId}?username=${encodeURIComponent(user)}`, { method: 'DELETE' });
      if (res.ok) {
        setConfirmDelete(null);
        setActiveMenu(null);
        fetchChats();
        window.dispatchEvent(new Event('sidebar-update'));
      }
    } catch (err) {
      console.error("Failed to delete chat", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLeaveChat = async (chatId) => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`${baseUrl}/api/chats/${chatId}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user })
      });
      if (res.ok) {
        setConfirmDelete(null);
        setActiveMenu(null);
        fetchChats();
      }
    } catch (err) {
      console.error("Failed to leave chat", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredChats = chats.filter(c => c.chat_name.toLowerCase().includes(search.toLowerCase()));
  
  // Sort Agent to top for private chats if present
  if (type === 'private') {
    const agentIndex = filteredChats.findIndex(c => c.chat_name === 'TreamAI Agent');
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
                background: chat.chat_name === 'TreamAI Agent' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                border: chat.chat_name === 'TreamAI Agent' ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent'
              }}
              className="hover-bg"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                {type === 'private' ? (
                  <MessageSquare size={20} color={chat.chat_name === 'TreamAI Agent' ? 'var(--primary)' : 'var(--text-muted)'} />
                ) : (
                  <Hash size={20} color="var(--text-muted)" />
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: chat.chat_name === 'TreamAI Agent' ? '600' : 'normal' }}>{chat.chat_name}</span>
                  {chat.role === 'left' && (
                    <span style={{ fontSize: '0.7rem', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '2px 8px', borderRadius: '10px' }}>
                      Left
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginLeft: 'auto' }}>
                {chat.unread > 0 && (
                  <div style={{ background: '#ef4444', color: 'white', borderRadius: '50%', minWidth: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold', padding: '0 6px' }}>
                    {chat.unread > 99 ? '99+' : chat.unread}
                  </div>
                )}
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  {formatTimeAgo(chat.last_activity)}
                </div>
                
                <div style={{ position: 'relative' }}>
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setActiveMenu(activeMenu === chat.chat_id ? null : chat.chat_id);
                    }}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '5px' }}
                  >
                    <MoreVertical size={20} />
                  </button>
                  {activeMenu === chat.chat_id && (
                    <div className="animate-fade-in" style={{ 
                      position: 'absolute', 
                      right: 0, 
                      top: '35px',
                      background: '#1f2229', 
                      border: '1px solid var(--border)', 
                      borderRadius: '8px', 
                      padding: '5px', 
                      zIndex: 10, 
                      width: '120px', 
                      boxShadow: '0 4px 12px rgba(0,0,0,0.5)' 
                    }}>
                      {type === 'team' && chat.role !== 'left' ? (
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setConfirmDelete({ id: chat.chat_id, action: 'leave' }); 
                            setActiveMenu(null); 
                          }}
                          style={{ width: '100%', background: 'transparent', border: 'none', color: '#f59e0b', padding: '10px', textAlign: 'left', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}
                          className="hover-bg"
                        >
                          Leave
                        </button>
                      ) : (
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setConfirmDelete({ id: chat.chat_id, action: 'delete' }); 
                            setActiveMenu(null); 
                          }}
                          style={{ width: '100%', background: 'transparent', border: 'none', color: '#ef4444', padding: '10px', textAlign: 'left', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}
                          className="hover-bg"
                        >
                          <Trash2 size={16} /> Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>

              </div>
            </div>
          ))}
          {filteredChats.length === 0 && (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '20px' }}>No chats found.</p>
          )}
        </div>
      </div>

      {confirmDelete && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-panel animate-fade-in" style={{ padding: '30px', maxWidth: '400px', width: '90%', position: 'relative' }}>
            <button onClick={() => setConfirmDelete(null)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <X size={20} />
            </button>
            <h2 style={{ margin: '0 0 15px 0', fontSize: '1.4rem' }}>{confirmDelete.action === 'leave' ? 'Leave Chat?' : 'Delete Chat?'}</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '25px', lineHeight: '1.5' }}>
              {confirmDelete.action === 'leave' 
                ? "Are you sure you want to leave this team chat? You won't be able to send new messages." 
                : "Are you sure you want to permanently remove this chat from your list? This action cannot be undone."}
            </p>
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmDelete(null)} style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
              <button 
                disabled={isDeleting} 
                onClick={() => confirmDelete.action === 'leave' ? handleLeaveChat(confirmDelete.id) : handleDeleteChat(confirmDelete.id)} 
                style={{ background: isDeleting ? 'var(--text-muted)' : (confirmDelete.action === 'leave' ? '#f59e0b' : '#ef4444'), color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' }}
              >
                {confirmDelete.action === 'leave' ? 'Leave' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
