import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Users, UserPlus, Check, MoreVertical, MessageSquare, Trash2, X } from 'lucide-react';

export default function FriendsList({ user }) {
  const navigate = useNavigate();
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [nicknames, setNicknames] = useState({});
  const [editingNickname, setEditingNickname] = useState(null);
  const [tempNickname, setTempNickname] = useState('');
  
  const [search, setSearch] = useState('');
  const [friendUsername, setFriendUsername] = useState('');
  const [friendStatus, setFriendStatus] = useState('');
  
  const [activeMenu, setActiveMenu] = useState(null);
  const [menuPosition, setMenuPosition] = useState('bottom');
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [isLoadingAction, setIsLoadingAction] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8443';

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
      const outRes = await fetch(`${baseUrl}/api/friends/outgoing/${user}`);
      if (outRes.ok) {
        const outData = await outRes.json();
        setOutgoingRequests(outData.outgoing_requests);
      }
      const nickRes = await fetch(`${baseUrl}/api/friends/nicknames/${user}`);
      if (nickRes.ok) {
        const nickData = await nickRes.json();
        setNicknames(nickData.nicknames);
      }
    } catch (err) {
      console.error("Failed to fetch friends data", err);
    }
  };

  const handleSendFriendRequest = async (e) => {
    e.preventDefault();
    if (isLoadingAction) return;
    setFriendStatus('');
    if (!friendUsername.trim()) return;

    setIsLoadingAction(true);
    try {
      const res = await fetch(`${baseUrl}/api/friends/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from_user: user, to_user: friendUsername.trim() })
      });
      if (res.ok) {
        setFriendStatus('Friend request sent!');
        setFriendUsername('');
        fetchData();
      } else {
        setFriendStatus('Could not send request.');
      }
    } catch (err) {
      setFriendStatus('Server error');
    } finally {
      setIsLoadingAction(false);
    }
  };

  const handleAcceptRequest = async (requester) => {
    if (isLoadingAction) return;
    setIsLoadingAction(true);
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
    } finally {
      setIsLoadingAction(false);
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

  const handleRemoveFriend = async (friendUsername) => {
    if (isLoadingAction) return;
    setIsLoadingAction(true);
    try {
      const res = await fetch(`${baseUrl}/api/friends/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user1: user, user2: friendUsername })
      });
      if (res.ok) {
        setConfirmRemove(null);
        setActiveMenu(null);
        fetchData();
        window.dispatchEvent(new Event('sidebar-update'));
      }
    } catch (err) {
      console.error("Failed to remove friend", err);
    } finally {
      setIsLoadingAction(false);
    }
  };

  const handleSaveNickname = async (friendUsername) => {
    if (isLoadingAction) return;
    setIsLoadingAction(true);
    try {
      const res = await fetch(`${baseUrl}/api/friends/nickname`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_name: user, friend_name: friendUsername, nickname: tempNickname })
      });
      if (res.ok) {
        setEditingNickname(null);
        setTempNickname('');
        fetchData();
        window.dispatchEvent(new Event('sidebar-update'));
      }
    } catch (err) {
      console.error("Failed to save nickname", err);
    } finally {
      setIsLoadingAction(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = () => setActiveMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const filteredFriends = friends.filter(f => f.username.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '40px', maxWidth: '1000px', margin: '0 auto', height: '100%' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '40px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'transparent', border: 'none', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={24} />
        </button>
        <h1 style={{ fontSize: '2rem', margin: 0 }}>All Friends</h1>
      </div>

      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '20px', alignItems: 'stretch', flex: 1 }}>
        
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: isMobile ? 'none' : '0 0 350px', width: isMobile ? '100%' : 'auto' }}>
          <div className="glass-panel animate-fade-in" style={{ padding: '30px' }}>
            <h2 style={{ marginBottom: '20px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <UserPlus size={20} color="#10b981" /> Add a Friend
            </h2>
            <form onSubmit={handleSendFriendRequest} style={{ display: 'flex', gap: '10px' }}>
              <input type="text" className="input-field" placeholder="Username" value={friendUsername} onChange={(e) => setFriendUsername(e.target.value)} required />
              <button type="submit" className="btn-primary" style={{ background: '#10b981' }}>Add</button>
            </form>
            {friendStatus && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '8px' }}>{friendStatus}</p>}
          </div>

          {outgoingRequests.length > 0 && (
            <div className="glass-panel animate-fade-in" style={{ padding: '30px', animationDelay: '0.15s' }}>
              <h2 style={{ marginBottom: '20px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                Outgoing Requests
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {outgoingRequests.map((req, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '8px' }}>
                    <span style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>{req.username}</span>
                    <button disabled={isLoadingAction} onClick={() => handleRemoveFriend(req.username)} style={{ background: 'transparent', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.5)', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>
                      Cancel
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="glass-panel animate-fade-in" style={{ padding: '30px', flex: 1, animationDelay: '0.2s', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: 1, minWidth: 0, marginRight: '15px' }}>
                <Users size={20} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '1.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {nicknames[f.username] || f.username}
                  {nicknames[f.username] && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '8px' }}>({f.username})</span>}
                </span>
              </div>
              <div style={{ position: 'relative' }}>
                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    if (activeMenu === f.username) {
                      setActiveMenu(null);
                    } else {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const spaceBelow = window.innerHeight - rect.bottom;
                      setMenuPosition(spaceBelow < 170 ? 'top' : 'bottom');
                      setActiveMenu(f.username);
                    }
                  }}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '5px' }}
                >
                  <MoreVertical size={20} />
                </button>
                {activeMenu === f.username && (
                  <div className="animate-fade-in" style={{ 
                    position: 'absolute', 
                    right: 0, 
                    ...(menuPosition === 'top' ? { bottom: '35px' } : { top: '35px' }),
                    background: '#1f2229', 
                    border: '1px solid var(--border)', 
                    borderRadius: '8px', 
                    padding: '5px', 
                    zIndex: 10, 
                    width: '150px', 
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)' 
                  }}>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleChatNow(f.username); }}
                      style={{ width: '100%', background: 'transparent', border: 'none', color: 'white', padding: '10px', textAlign: 'left', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}
                      className="hover-bg"
                    >
                      <MessageSquare size={16} /> Chat Now
                    </button>
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setEditingNickname(f.username); 
                        setTempNickname(nicknames[f.username] || ''); 
                        setActiveMenu(null); 
                      }}
                      style={{ width: '100%', background: 'transparent', border: 'none', color: '#60a5fa', padding: '10px', textAlign: 'left', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}
                      className="hover-bg"
                    >
                      Edit Nickname
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setConfirmRemove(f.username); setActiveMenu(null); }}
                      style={{ width: '100%', background: 'transparent', border: 'none', color: '#ef4444', padding: '10px', textAlign: 'left', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}
                      className="hover-bg"
                    >
                      <Trash2 size={16} /> Remove
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {filteredFriends.length === 0 && (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '20px' }}>No friends found.</p>
          )}
        </div>
      </div>
      </div>

      {confirmRemove && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-panel animate-fade-in" style={{ padding: '30px', maxWidth: '400px', width: '90%', position: 'relative' }}>
            <button onClick={() => setConfirmRemove(null)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <X size={20} />
            </button>
            <h2 style={{ margin: '0 0 15px 0', fontSize: '1.4rem' }}>Remove Friend?</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '25px', lineHeight: '1.5' }}>
              Are you sure you want to remove <strong>{confirmRemove}</strong> from your friends list?
            </p>
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmRemove(null)} style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
              <button disabled={isLoadingAction} onClick={() => handleRemoveFriend(confirmRemove)} style={{ background: isLoadingAction ? 'var(--text-muted)' : '#ef4444', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' }}>Remove</button>
            </div>
          </div>
        </div>
      )}

      {editingNickname && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-panel animate-fade-in" style={{ padding: '30px', maxWidth: '400px', width: '90%', position: 'relative' }}>
            <button onClick={() => setEditingNickname(null)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <X size={20} />
            </button>
            <h2 style={{ margin: '0 0 15px 0', fontSize: '1.4rem' }}>Set Nickname</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '15px', fontSize: '0.9rem' }}>
              Set a nickname for <strong>{editingNickname}</strong>. This name will appear in all your chats. Leave blank to clear.
            </p>
            <input 
              type="text" 
              value={tempNickname} 
              onChange={(e) => setTempNickname(e.target.value)} 
              placeholder={`Nickname for ${editingNickname}`} 
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)', color: 'white', marginBottom: '25px', outline: 'none' }} 
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSaveNickname(editingNickname)}
            />
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
              <button onClick={() => setEditingNickname(null)} style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
              <button disabled={isLoadingAction} onClick={() => handleSaveNickname(editingNickname)} style={{ background: isLoadingAction ? 'var(--text-muted)' : 'var(--primary)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' }}>Save</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
