import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { MessageSquare, Users, LogOut, Settings, Hash, Bell } from 'lucide-react';

export default function Layout({ user, onLogout, children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) setIsSidebarOpen(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Data states
  const [chats, setChats] = useState([]);
  const [friends, setFriends] = useState([]);
  
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8443';

  const [isPopupMounted, setIsPopupMounted] = useState(false);
  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const popupRef = useRef(null);

  const closePopup = () => {
    if (isPopupMounted) {
      setIsPopupVisible(false);
      setTimeout(() => setIsPopupMounted(false), 150);
    }
  };

  const togglePopup = () => {
    if (isPopupMounted) {
      closePopup();
    } else {
      setIsPopupMounted(true);
      setTimeout(() => setIsPopupVisible(true), 10);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        closePopup();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isPopupMounted]);

  const handleNavigate = (path) => {
    navigate(path);
    if (isMobile) setIsSidebarOpen(false);
    closePopup();
  };

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
  
  const agentChat = privateChats.find(c => c.chat_name === 'TreamAI Agent');
  const otherPrivateChats = privateChats.filter(c => c.chat_name !== 'TreamAI Agent').slice(0, 3);
  const displayPrivateChats = agentChat ? [agentChat, ...otherPrivateChats] : otherPrivateChats.slice(0, 4);

  const displayTeamChats = teamChats.slice(0, 3);
  const displayFriends = friends.slice(0, 3);

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      
      {/* Sidebar */}
      <div style={{ 
        width: isSidebarOpen ? (isMobile ? '100vw' : '280px') : '0px', 
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
            position: isMobile ? 'fixed' : 'absolute',
            top: '20px',
            right: isMobile ? '20px' : (isSidebarOpen ? '-23px' : '-75px'),
            width: '45px',
            height: '45px',
            borderRadius: '50%',
            background: '#191b21',
            border: '1px solid var(--border)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            transition: isMobile ? 'none' : 'right 0.3s ease'
          }}
        >
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            transition: 'transform 0.4s ease',
            transform: isSidebarOpen ? 'rotate(90deg)' : 'rotate(0deg)'
          }}>
            <div style={{ width: '20px', height: '3px', background: 'var(--text-main)', borderRadius: '2px', transition: 'all 0.3s ease' }} />
            <div style={{ width: '20px', height: '3px', background: 'var(--text-main)', borderRadius: '2px', transition: 'all 0.3s ease' }} />
            <div style={{ width: '20px', height: '3px', background: 'var(--text-main)', borderRadius: '2px', transition: 'all 0.3s ease' }} />
          </div>
        </button>

        <div style={{
          width: isSidebarOpen ? (isMobile ? '100vw' : '280px') : '280px',
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
            <h2 style={{ fontSize: '1.5rem', margin: 0, color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }} onClick={() => handleNavigate('/dashboard')}>
              TreamAI
            </h2>
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
                    onClick={() => handleNavigate(`/chat/${chat.chat_id}`)}
                    style={{ 
                      padding: '8px 12px', 
                      borderRadius: '8px', 
                      cursor: 'pointer', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '10px', 
                      background: chat.chat_name === 'TreamAI Agent' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                      border: chat.chat_name === 'TreamAI Agent' ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent'
                    }}
                    className="hover-bg"
                  >
                    <MessageSquare size={16} color={chat.chat_name === 'TreamAI Agent' ? 'var(--primary)' : 'var(--text-muted)'} />
                    <span style={{ fontSize: '0.95rem', fontWeight: chat.chat_name === 'TreamAI Agent' ? '600' : 'normal' }}>{chat.chat_name}</span>
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
                    onClick={() => handleNavigate(`/chat/${chat.chat_id}`)}
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

          {/* Footer Actions (Popup) */}
          <div ref={popupRef} style={{ position: 'relative', padding: '5px', borderTop: '1px solid var(--border)', marginTop: 'auto', marginBottom: '-15px' }}>
            {isPopupMounted && (
              <div style={{ 
                position: 'absolute', bottom: '70px', left: '20px', right: '20px', 
                background: '#1f2229', border: '1px solid var(--border)', 
                borderRadius: '12px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '5px', 
                zIndex: 30, boxShadow: '0 10px 25px rgba(0,0,0,0.5)', 
                opacity: isPopupVisible ? 1 : 0,
                transform: isPopupVisible ? 'translateY(0)' : 'translateY(10px)',
                transition: 'opacity 0.15s ease-out, transform 0.15s ease-out',
                pointerEvents: isPopupVisible ? 'auto' : 'none'
              }}>
                <button onClick={() => { closePopup(); handleNavigate('/notifications'); }} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '10px', fontSize: '0.95rem', borderRadius: '8px' }} className="hover-bg">
                  <Bell size={18} /> Notifications
                </button>
                <button onClick={() => { closePopup(); handleNavigate('/settings'); }} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '10px', fontSize: '0.95rem', borderRadius: '8px' }} className="hover-bg">
                  <Settings size={18} /> Settings
                </button>
                <button onClick={() => { closePopup(); onLogout(); }} style={{ background: 'transparent', border: 'none', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '10px', fontSize: '0.95rem', borderRadius: '8px' }} className="hover-bg">
                  <LogOut size={18} /> Logout
                </button>
              </div>
            )}
            <div 
              onClick={togglePopup} 
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '10px', borderRadius: '8px', background: isPopupMounted ? 'rgba(255,255,255,0.05)' : 'transparent' }}
              className="hover-bg"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                  {user.charAt(0).toUpperCase()}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '1rem', fontWeight: 'bold' }}>{user}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>My Account</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto',
        paddingLeft: (isMobile || isSidebarOpen) ? '0px' : '80px',
        transition: 'padding-left 0.3s ease'
      }}>
        {children}
      </div>

    </div>
  );
}
