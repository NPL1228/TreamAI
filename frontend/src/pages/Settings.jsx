import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Bell, Shield, Palette } from 'lucide-react';
import { useEffect } from 'react';

export default function Settings({ user }) {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Settings | Teamora';
  }, []);

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'block', marginBottom: '5px' }}>Username</label>
            <input type="text" className="input-field" value={user || ''} disabled style={{ opacity: 0.7 }} />
          </div>
          <div>
            <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'block', marginBottom: '5px' }}>Email</label>
            <input type="email" className="input-field" placeholder="Stored securely in backend" disabled style={{ opacity: 0.7 }} />
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
        <button onClick={() => navigate('/forgot-password')} className="btn-primary" style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)' }}>
          Reset Password
        </button>
      </div>

    </div>
  );
}
