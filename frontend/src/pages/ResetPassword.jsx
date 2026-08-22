import { useState, useEffect } from 'react';
import { Lock, ArrowRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Extract token from URL ?token=...
  const queryParams = new URLSearchParams(location.search);
  const token = queryParams.get('token');

  useEffect(() => {
    document.title = 'Reset Password | TreamAI';
    if (!token) {
      setStatus({ type: 'error', message: 'Invalid or missing reset token.' });
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: '', message: '' });

    if (!token) return;

    if (password !== confirmPassword) {
      setStatus({ type: 'error', message: 'Passwords do not match.' });
      return;
    }

    setIsLoading(true);

    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8443';
      const res = await fetch(`${baseUrl}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: password })
      });

      const data = await res.json();
      
      if (res.ok) {
        setStatus({ type: 'success', message: 'Password updated successfully! Redirecting...' });
        setTimeout(() => navigate('/login'), 2000);
      } else {
        setStatus({ type: 'error', message: data.detail || 'Failed to reset password.' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Cannot connect to server.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', padding: '20px'
    }}>
      <div className="glass-panel animate-fade-in" style={{
        padding: '40px', width: '100%', maxWidth: '400px', textAlign: 'center'
      }}>
        
        <h1 style={{ marginBottom: '10px', fontSize: '1.8rem' }}>
          Create New Password
        </h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '30px', fontSize: '0.9rem' }}>
          Please enter your new password below.
        </p>

        {status.message && (
          <div style={{ color: status.type === 'success' ? '#10b981' : '#ef4444', marginBottom: '20px', fontSize: '0.9rem' }}>
            {status.message}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ position: 'relative' }}>
            <Lock size={20} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
            <input 
              type="password" 
              placeholder="New Password" 
              className="input-field" 
              style={{ paddingLeft: '40px' }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={!token || status.type === 'success'}
              required 
            />
          </div>

          <div style={{ position: 'relative' }}>
            <Lock size={20} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
            <input 
              type="password" 
              placeholder="Confirm New Password" 
              className="input-field" 
              style={{ paddingLeft: '40px' }}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={!token || status.type === 'success'}
              required 
            />
          </div>

          <button type="submit" className="btn-primary" disabled={!token || status.type === 'success' || isLoading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginTop: '10px', opacity: isLoading ? 0.7 : 1 }}>
            {isLoading ? <div className="spinner"></div> : 'Update Password'}
            {!isLoading && <ArrowRight size={18} />}
          </button>
        </form>
      </div>
    </div>
  );
}
