import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { MessageSquare, Users, LogOut, Settings, Hash, Bell } from 'lucide-react';

export default function Layout({ user, onLogout, children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Data states
  const [chats, setChats] = useState([]);
  const [friends, setFriends] = useState([]);
  
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8443';

  useEffect(() => {
    if (!user) return;
    
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
        }
      } catch (err) {
        console.error("Failed to fetch sidebar data", err);
      }
    };
    
    fetchData();

    // Listen for manual trigger events from other components
    const handleUpdate = () => fetchData();
    window.addEventListener('sidebar-update', handleUpdate);
    return () => window.removeEventListener('sidebar-update', handleUpdate);
  }, [user, baseUrl, location.pathname]);

  const teamChats = chats.filter(c => c.chat_type === 'team');
  const privateChats = chats.filter(c => c.chat_type === 'private');
  
  const agentChat = privateChats.find(c => c.chat_name === 'Teamora Agent');
  const otherPrivateChats = privateChats.filter(c => c.chat_name !== 'Teamora Agent').slice(0, 3);
  const displayPrivateChats = agentChat ? [agentChat, ...otherPrivateChats] : otherPrivateChats.slice(0, 4);

  const displayTeamChats = teamChats.slice(0, 3);
  const displayFriends = friends.slice(0, 3);

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      
      {/* Sidebar */}
      <div style={{ 
        width: isSidebarOpen ? '280px' : '0px', 
        background: 'rgba(255, 255, 255, 0.03)', 
        borderRight: '1px solid var(--border)',
        display: 'flex', 
        flexDirection: 'column',
        position: 'relative',
        transition: 'width 0.3s ease',
        zIndex: 10
      }}>
        
        {/* Toggle Button */}
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          style={{
            position: 'absolute',
            bottom: '40px',
            right: isSidebarOpen ? '-30px' : '-75px',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: '#191b21',
            border: '1px solid var(--border)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 20,
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            transition: 'right 0.3s ease'
          }}
        >
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            transition: 'transform 0.4s ease',
            transform: isSidebarOpen ? 'rotate(90deg)' : 'rotate(0deg)'
          }}>
            <div style={{ width: '25px', height: '4px', background: 'var(--text-main)', borderRadius: '2px', transition: 'all 0.3s ease' }} />
            <div style={{ width: '25px', height: '4px', background: 'var(--text-main)', borderRadius: '2px', transition: 'all 0.3s ease' }} />
            <div style={{ width: '25px', height: '4px', background: 'var(--text-main)', borderRadius: '2px', transition: 'all 0.3s ease' }} />
          </div>
        </button>

        <div style={{
          width: '280px',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          opacity: isSidebarOpen ? 1 : 0,
          pointerEvents: isSidebarOpen ? 'auto' : 'none',
          transition: 'opacity 0.2s ease',
          padding: '20px 0',
          overflowY: 'hidden'
        }}>
        
          <div style={{ padding: '0 20px', marginBottom: '30px' }}>
            <h2 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--primary)', cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>Teamora</h2>
            <p style={{ margin: '5px 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{user}</p>
          </div>

          {/* Scrollable Lists */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '25px' }}>
            
            {/* Friends Section */}
            <div>
              <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px', letterSpacing: '0.5px' }}>Friends (Most Recent)</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {displayFriends.map((f, i) => (
                  <div key={i} style={{ padding: '8px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255, 255, 255, 0.03)' }}>
                    <Users size={16} color="var(--text-muted)" />
                    <span style={{ fontSize: '0.95rem' }}>{f.username}</span>
                  </div>
                ))}
                {friends.length === 0 && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>No friends yet.</p>}
                {friends.length > 3 && (
                  <Link to="/friends" style={{ fontSize: '0.8rem', color: 'var(--primary)', textDecoration: 'none', marginTop: '5px' }}>Show More...</Link>
                )}
              </div>
            </div>

            {/* Private Chats Section */}
            <div>
              <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px', letterSpacing: '0.5px' }}>Private Chats</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {displayPrivateChats.map(chat => (
                  <div 
                    key={chat.chat_id}
                    onClick={() => navigate(`/chat/${chat.chat_id}`)}
                    style={{ 
                      padding: '8px 12px', 
                      borderRadius: '8px', 
                      cursor: 'pointer', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '10px', 
                      background: chat.chat_name === 'Teamora Agent' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                      border: chat.chat_name === 'Teamora Agent' ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent'
                    }}
                    className="hover-bg"
                  >
                    <MessageSquare size={16} color={chat.chat_name === 'Teamora Agent' ? 'var(--primary)' : 'var(--text-muted)'} />
                    <span style={{ fontSize: '0.95rem', fontWeight: chat.chat_name === 'Teamora Agent' ? '600' : 'normal' }}>{chat.chat_name}</span>
                  </div>
                ))}
                {privateChats.length > 4 && (
                  <Link to="/chats/private" style={{ fontSize: '0.8rem', color: 'var(--primary)', textDecoration: 'none', marginTop: '5px' }}>Show More...</Link>
                )}
              </div>
            </div>

            {/* Team Chats Section */}
            <div>
              <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px', letterSpacing: '0.5px' }}>Team Chats</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {displayTeamChats.map(chat => (
                  <div 
                    key={chat.chat_id}
                    onClick={() => navigate(`/chat/${chat.chat_id}`)}
                    style={{ padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255, 255, 255, 0.05)' }}
                    className="hover-bg"
                  >
                    <Hash size={16} color="var(--text-muted)" />
                    <span style={{ fontSize: '0.95rem' }}>{chat.chat_name}</span>
                  </div>
                ))}
                {teamChats.length === 0 && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>No teams yet.</p>}
                {teamChats.length > 3 && (
                  <Link to="/chats/team" style={{ fontSize: '0.8rem', color: 'var(--primary)', textDecoration: 'none', marginTop: '5px' }}>Show More...</Link>
                )}
              </div>
            </div>

          </div>

          {/* Footer Actions */}
          <div style={{ padding: '20px 20px 0 20px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button onClick={() => navigate('/notifications')} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '8px 0', fontSize: '0.95rem' }}>
              <Bell size={18} /> Notifications
            </button>
            <button onClick={() => navigate('/settings')} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '8px 0', fontSize: '0.95rem' }}>
              <Settings size={18} /> Settings
            </button>
            <button onClick={onLogout} style={{ background: 'transparent', border: 'none', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '8px 0', fontSize: '0.95rem' }}>
              <LogOut size={18} /> Logout
            </button>
          </div>

        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {children}
      </div>

    </div>
  );
}
