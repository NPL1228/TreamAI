import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Bell, Shield, Palette } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function Settings({ user, onUserUpdate }) {
  const navigate = useNavigate();
  const [newUsername, setNewUsername] = useState(user || '');
  const [email, setEmail] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState({ type: '', msg: '' });

  useEffect(() => {
    document.title = 'Settings | TreamAI';
    if (user) {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8443';
      fetch(`${baseUrl}/api/users/${user}`)
        .then(res => res.json())
        .then(data => {
          if (data.status === 'success') {
            setEmail(data.email);
          }
        })
        .catch(err => console.error('Failed to fetch profile', err));
    }
  }, [user]);

  const handleUpdateUsername = async () => {
    if (!newUsername.trim() || newUsername === user) {
      setIsEditing(false);
      return;
    }
    
    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8443';
      const res = await fetch(`${baseUrl}/api/users/update_username`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ old_username: user, new_username: newUsername.trim() })
      });
      if (res.ok) {
        localStorage.setItem('treamai_user', newUsername.trim());
        if (onUserUpdate) onUserUpdate(newUsername.trim());
        setStatus({ type: 'success', msg: 'Username updated successfully!' });
        setIsEditing(false);
      } else {
        const data = await res.json();
        setStatus({ type: 'error', msg: data.detail || 'Failed to update username' });
      }
    } catch (err) {
      setStatus({ type: 'error', msg: 'Server connection error' });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '40px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'transparent', border: 'none', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={24} />
        </button>
        <h1 style={{ fontSize: '2rem', margin: 0 }}>Settings</h1>
      </div>

      <div className="glass-panel animate-fade-in" style={{ padding: '30px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
          <User size={24} color="var(--primary)" />
          <h2 style={{ margin: 0 }}>Profile</h2>
        </div>
        {status.msg && (
          <div style={{ marginBottom: '15px', padding: '10px', borderRadius: '8px', background: status.type === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)', color: status.type === 'error' ? '#ef4444' : '#10b981' }}>
            {status.msg}
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '15px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'block', marginBottom: '5px' }}>Username</label>
              <input 
                type="text" 
                className="input-field" 
                value={newUsername} 
                onChange={(e) => setNewUsername(e.target.value)}
                disabled={!isEditing}
                style={{ opacity: isEditing ? 1 : 0.7 }}
              />
            </div>
            {isEditing ? (
              <button onClick={handleUpdateUsername} className="btn-primary" style={{ padding: '12px 20px', height: '48px' }}>Save</button>
            ) : (
              <button onClick={() => setIsEditing(true)} className="btn-primary" style={{ background: 'rgba(255,255,255,0.1)', color: 'white', padding: '12px 20px', height: '48px' }}>Edit</button>
            )}
          </div>
          <div>
            <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'block', marginBottom: '5px' }}>Email</label>
            <input type="email" className="input-field" value={email} placeholder="Loading..." disabled style={{ opacity: 0.7 }} />
          </div>
        </div>
      </div>

      <div className="glass-panel animate-fade-in" style={{ padding: '30px', marginBottom: '20px', animationDelay: '0.1s' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
          <Palette size={24} color="var(--secondary)" />
          <h2 style={{ margin: 0 }}>Appearance</h2>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Theme customization coming soon!</p>
      </div>

      <div className="glass-panel animate-fade-in" style={{ padding: '30px', animationDelay: '0.2s' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
          <Shield size={24} color="#10b981" />
          <h2 style={{ margin: 0 }}>Security</h2>
        </div>
        <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '15px', borderRadius: '8px', color: 'var(--text-main)', marginBottom: '20px' }}>
          <strong>Yes, your passwords are encrypted!</strong>
          <p style={{ margin: '5px 0 0 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            We use industry-standard SHA-256 cryptographic hashing before storing anything in our database. This means your raw password is never saved or visible to anyone.
          </p>
        </div>
        <button onClick={() => navigate('/forgot-password')} className="btn-primary" style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)' }}>
          Reset Password
        </button>
      </div>

    </div>
  );
}
