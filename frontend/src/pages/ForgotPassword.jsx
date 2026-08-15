import { useState, useEffect } from 'react';
import { Mail, ArrowLeft, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Forgot Password | Teamora';
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: '', message: '' });
    setIsLoading(true);

    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8443';
      const res = await fetch(`${baseUrl}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await res.json();
      
      if (res.ok) {
        setStatus({ type: 'success', message: 'If that email exists, a reset link has been sent!' });
        setEmail('');
      } else {
        setStatus({ type: 'error', message: data.detail || 'Failed to process request.' });
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
        padding: '40px', width: '100%', maxWidth: '400px', textAlign: 'center', position: 'relative'
      }}>
        
        <button onClick={() => navigate('/login')} style={{ position: 'absolute', top: '20px', left: '20px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
          <ArrowLeft size={24} />
        </button>

        <h1 style={{ marginBottom: '10px', fontSize: '1.8rem', marginTop: '10px' }}>
          Reset Password
        </h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '30px', fontSize: '0.9rem' }}>
          Enter your email and we'll send you a secure link to reset your password.
        </p>

        {status.message && (
          <div style={{ color: status.type === 'success' ? '#10b981' : '#ef4444', marginBottom: '20px', fontSize: '0.9rem' }}>
            {status.message}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ position: 'relative' }}>
            <Mail size={20} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
            <input 
              type="email" 
              placeholder="Email Address" 
              className="input-field" 
              style={{ paddingLeft: '40px' }}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>

          <button type="submit" disabled={isLoading} className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', opacity: isLoading ? 0.7 : 1 }}>
            {isLoading ? <div className="spinner"></div> : 'Send Reset Link'}
            {!isLoading && <Send size={18} />}
          </button>
        </form>
      </div>
    </div>
  );
}
