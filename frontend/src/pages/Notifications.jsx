import { useState, useEffect } from 'react';
import { Bell, UserPlus, Check, X, CheckCheck } from 'lucide-react';

export default function Notifications({ user }) {
  const [activeTab, setActiveTab] = useState('system');
  const [notifications, setNotifications] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8443';

  useEffect(() => {
    document.title = 'Notifications | Teamora';
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const [notifsRes, friendsRes] = await Promise.all([
        fetch(`${baseUrl}/api/notifications/${user}`),
        fetch(`${baseUrl}/api/friends/${user}`)
      ]);
      
      if (notifsRes.ok) {
        const data = await notifsRes.json();
        setNotifications(data.notifications);
      }
      
      if (friendsRes.ok) {
        const data = await friendsRes.json();
        setPendingRequests(data.pending);
      }
    } catch (err) {
      console.error("Failed to fetch notifications data", err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch(`${baseUrl}/api/notifications/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user })
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      }
    } catch (err) {
      console.error("Failed to mark read", err);
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
        fetchData(); // Refresh lists
        window.dispatchEvent(new Event('sidebar-update'));
      }
    } catch (err) {
      console.error("Error accepting request", err);
    }
  };

  if (loading) return <div style={{ padding: '40px', color: 'white' }}>Loading notifications...</div>;

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '40px', maxWidth: '800px', margin: '0 auto', height: '100%' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '30px' }}>
        <h1 style={{ fontSize: '2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '15px' }}>
          <Bell size={32} color="var(--primary)" /> Notifications
        </h1>
        {activeTab === 'system' && unreadCount > 0 && (
          <button 
            onClick={handleMarkAllRead}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text)', cursor: 'pointer', padding: '8px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}
            className="hover-bg"
          >
            <CheckCheck size={18} /> Mark all as read
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '30px' }}>
        <button 
          onClick={() => setActiveTab('system')}
          style={{ 
            background: 'transparent', 
            border: 'none', 
            color: activeTab === 'system' ? 'var(--primary)' : 'var(--text-muted)', 
            borderBottom: activeTab === 'system' ? '2px solid var(--primary)' : '2px solid transparent',
            padding: '10px 20px', 
            fontSize: '1.1rem', 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
        >
          System {unreadCount > 0 && <span style={{ background: '#ef4444', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem' }}>{unreadCount}</span>}
        </button>
        <button 
          onClick={() => setActiveTab('friends')}
          style={{ 
            background: 'transparent', 
            border: 'none', 
            color: activeTab === 'friends' ? 'var(--primary)' : 'var(--text-muted)', 
            borderBottom: activeTab === 'friends' ? '2px solid var(--primary)' : '2px solid transparent',
            padding: '10px 20px', 
            fontSize: '1.1rem', 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
        >
          Friend Requests {pendingRequests.length > 0 && <span style={{ background: '#ef4444', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem' }}>{pendingRequests.length}</span>}
        </button>
      </div>

      <div className="animate-fade-in" style={{ flex: 1, overflowY: 'auto' }}>
        
        {activeTab === 'system' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {notifications.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
                <Bell size={48} style={{ opacity: 0.5, marginBottom: '15px' }} />
                <p>No system notifications right now.</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div key={notif.id} style={{ 
                  background: 'rgba(255,255,255,0.03)', 
                  padding: '20px', 
                  borderRadius: '12px',
                  borderLeft: notif.is_read ? '4px solid transparent' : '4px solid var(--primary)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: notif.is_read ? 'normal' : 'bold', color: notif.is_read ? 'var(--text)' : 'white' }}>
                      {notif.title}
                    </h3>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {new Date(notif.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p style={{ margin: 0, color: 'var(--text-muted)', lineHeight: '1.5' }}>
                    {notif.message}
                  </p>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'friends' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {pendingRequests.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
                <UserPlus size={48} style={{ opacity: 0.5, marginBottom: '15px' }} />
                <p>No pending friend requests.</p>
              </div>
            ) : (
              pendingRequests.map((req, idx) => (
                <div key={idx} style={{ 
                  background: 'rgba(255,255,255,0.03)', 
                  padding: '20px', 
                  borderRadius: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                      {req.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{req.username}</h3>
                      <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>Wants to be friends</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                      onClick={() => handleAcceptRequest(req.username)}
                      className="btn-primary" 
                      style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      <Check size={18} /> Accept
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </div>
  );
}
