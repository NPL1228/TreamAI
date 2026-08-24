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
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8443';
  const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8443';

  const [isPopupMounted, setIsPopupMounted] = useState(false);
  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const popupRef = useRef(null);
  const globalWs = useRef(null);

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
        const chatsRes = await fetch(`${baseUrl}/api/chats/${user}`);
        if (chatsRes.ok) {
          const data = await chatsRes.json();
          setChats(data.chats);
        }
        const notifsRes = await fetch(`${baseUrl}/api/notifications/unread/${user}`);
        if (notifsRes.ok) {
          const data = await notifsRes.json();
          setUnreadNotifs(data.unread);
        }
      } catch (err) {
        console.error("Failed to fetch sidebar data", err);
      }
    };
    
    fetchData();

    // Setup global websocket for real-time updates
    globalWs.current = new WebSocket(`${wsUrl}/ws/global/${user}`);
    globalWs.current.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'new_message' || msg.type === 'new_notification') {
          fetchData(); // Just refresh the data to get latest unread counts & sort order
        }
      } catch (e) {}
    };

    // Listen for manual trigger events from other components
    const handleUpdate = () => fetchData();
    window.addEventListener('sidebar-update', handleUpdate);
    return () => {
      window.removeEventListener('sidebar-update', handleUpdate);
      if (globalWs.current) globalWs.current.close();
    };
  }, [user, baseUrl, wsUrl, location.pathname]);

  const teamChats = chats.filter(c => c.chat_type === 'team');
  const privateChats = chats.filter(c => c.chat_type === 'private');
  
  const agentChat = privateChats.find(c => c.chat_name === 'TreamAI Agent');
  const otherPrivateChats = privateChats.filter(c => c.chat_name !== 'TreamAI Agent').slice(0, 3);
  const displayPrivateChats = agentChat ? [agentChat, ...otherPrivateChats] : otherPrivateChats.slice(0, 4);

  const displayTeamChats = teamChats.slice(0, 3);

  return (
    <div style={{ display: 'flex', height: '100dvh', width: '100vw', overflow: 'hidden' }}>
      
      {/* Sidebar */}
      <div style={{ 
        width: isSidebarOpen ? (isMobile ? '100vw' : '280px') : '0px', 
        flexShrink: 0,
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
        
          <div style={{ flexShrink: 0, padding: '0 20px', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.5rem', margin: 0, color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }} onClick={() => handleNavigate('/dashboard')}>
              TreamAI
            </h2>
          </div>

          {/* Scrollable Lists */}
          <div className="custom-scrollbar" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '25px' }}>
            
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
                      background: location.pathname === `/chat/${chat.chat_id}` ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                      color: location.pathname === `/chat/${chat.chat_id}` ? 'white' : 'var(--text-main)',
                      position: 'relative'
                    }}
                    className="hover-bg"
                  >
                    <MessageSquare size={16} color={location.pathname === `/chat/${chat.chat_id}` ? "var(--primary)" : "var(--text-muted)"} />
                    <span style={{ fontSize: '0.95rem', fontWeight: chat.chat_name === 'TreamAI Agent' ? '600' : 'normal' }}>{chat.chat_name}</span>
                    {chat.unread > 0 && (
                      <div style={{ position: 'absolute', right: '10px', background: '#ef4444', color: 'white', borderRadius: '50%', minWidth: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 'bold', padding: '0 4px' }}>
                        {chat.unread > 99 ? '99+' : chat.unread}
                      </div>
                    )}
                  </div>
                ))}
                {privateChats.length > 4 && (
                  <span onClick={() => handleNavigate('/chats/private')} style={{ fontSize: '0.8rem', color: 'var(--primary)', cursor: 'pointer', marginTop: '5px' }}>Show More...</span>
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
                    style={{ 
                      padding: '8px 12px', 
                      borderRadius: '8px', 
                      cursor: 'pointer',
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '10px',
                      background: location.pathname === `/chat/${chat.chat_id}` ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                      color: location.pathname === `/chat/${chat.chat_id}` ? 'white' : 'var(--text-main)',
                      position: 'relative'
                    }}
                    className="hover-bg"
                  >
                    <Hash size={16} color={location.pathname === `/chat/${chat.chat_id}` ? "var(--primary)" : "var(--text-muted)"} />
                    <span style={{ fontSize: '0.95rem' }}>{chat.chat_name}</span>
                    {chat.unread > 0 && (
                      <div style={{ position: 'absolute', right: '10px', background: '#ef4444', color: 'white', borderRadius: '50%', minWidth: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 'bold', padding: '0 4px' }}>
                        {chat.unread > 99 ? '99+' : chat.unread}
                      </div>
                    )}
                  </div>
                ))}
                {teamChats.length === 0 && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>No teams yet.</p>}
                {teamChats.length > 3 && (
                  <span onClick={() => handleNavigate('/chats/team')} style={{ fontSize: '0.8rem', color: 'var(--primary)', cursor: 'pointer', marginTop: '5px' }}>Show More...</span>
                )}
              </div>
            </div>

          </div>

          {/* Footer Actions (Popup) */}
          <div ref={popupRef} style={{ flexShrink: 0, position: 'relative', padding: '15px 20px 0 20px', borderTop: '1px solid var(--border)', marginTop: '20px' }}>
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
                <button onClick={() => { closePopup(); handleNavigate('/friends'); }} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '10px', fontSize: '0.95rem', borderRadius: '8px' }} className="hover-bg">
                  <Users size={18} /> All Friends
                </button>
                <button onClick={() => { closePopup(); handleNavigate('/notifications'); }} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '10px', fontSize: '0.95rem', borderRadius: '8px', width: '100%' }} className="hover-bg">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Bell size={18} /> Notifications
                  </div>
                  {unreadNotifs > 0 && (
                    <div style={{ background: '#ef4444', color: 'white', borderRadius: '50%', minWidth: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 'bold', padding: '0 4px' }}>
                      {unreadNotifs > 99 ? '99+' : unreadNotifs}
                    </div>
                  )}
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
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '10px', borderRadius: '8px', background: isPopupMounted ? 'rgba(255,255,255,0.05)' : 'transparent', position: 'relative' }}
              className="hover-bg"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', position: 'relative' }}>
                  {user.charAt(0).toUpperCase()}
                  {unreadNotifs > 0 && (
                    <div style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#ef4444', border: '2px solid #191b21', borderRadius: '50%', width: '14px', height: '14px' }} />
                  )}
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
