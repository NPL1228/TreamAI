import { useState, useEffect } from 'react';
import { User, Lock, ArrowRight, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Login({ onLogin }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = isRegistering ? 'Register | Teamora' : 'Login | Teamora';
  }, [isRegistering]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (isRegistering && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    const endpoint = isRegistering ? '/register' : '/login';
    const payload = isRegistering 
      ? { username, email, password } 
      : { username, password };

    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8443';
      const res = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      
      if (res.ok) {
        if (isRegistering) {
          setIsRegistering(false);
          setError('Registration successful! Please log in.');
        } else {
          onLogin(data.username);
        }
      } else {
        setError(data.detail || 'Authentication failed');
      }
    } catch (err) {
      setError('Cannot connect to server.');
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
        <h1 style={{ marginBottom: '10px', fontSize: '2rem', background: 'linear-gradient(to right, #6366f1, #8b5cf6)', WebkitBackgroundClip: 'text', color: 'transparent' }}>
          Teamora
        </h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>
          {isRegistering ? 'Create your workspace account' : 'Sign in to collaborate'}
        </p>

        {error && <div style={{ color: error.includes('successful') ? '#10b981' : '#ef4444', marginBottom: '20px', fontSize: '0.9rem' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {isRegistering && (
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
          )}
          
          <div style={{ position: 'relative' }}>
            <User size={20} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Username" 
              className="input-field" 
              style={{ paddingLeft: '40px' }}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required 
            />
          </div>

          <div style={{ position: 'relative' }}>
            <Lock size={20} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
            <input 
              type="password" 
              placeholder="Password" 
              className="input-field" 
              style={{ paddingLeft: '40px' }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>

          {isRegistering && (
            <div style={{ position: 'relative' }}>
              <Lock size={20} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
              <input 
                type="password" 
                placeholder="Confirm Password" 
                className="input-field" 
                style={{ paddingLeft: '40px' }}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required 
              />
            </div>
          )}

          {!isRegistering && (
            <div style={{ textAlign: 'right' }}>
              <span 
                onClick={() => navigate('/forgot-password')}
                style={{ color: 'var(--text-muted)', fontSize: '0.85rem', cursor: 'pointer' }}
                onMouseEnter={(e) => e.target.style.color = 'var(--primary)'}
                onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}
              >
                Forgot Password?
              </span>
            </div>
          )}

          <button type="submit" disabled={isLoading} className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginTop: '10px', opacity: isLoading ? 0.7 : 1 }}>
            {isLoading ? <div className="spinner"></div> : (isRegistering ? 'Register' : 'Login')}
            {!isLoading && <ArrowRight size={18} />}
          </button>
        </form>

        <p style={{ marginTop: '30px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          {isRegistering ? 'Already have an account? ' : 'Need an account? '}
          <span 
            onClick={() => { if(!isLoading) { setIsRegistering(!isRegistering); setError(''); } }} 
            style={{ color: 'var(--primary)', cursor: isLoading ? 'default' : 'pointer', fontWeight: 'bold' }}>
            {isRegistering ? 'Log in' : 'Register'}
          </span>
        </p>
      </div>
    </div>
  );
}
