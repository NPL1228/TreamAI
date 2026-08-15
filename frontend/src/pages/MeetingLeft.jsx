import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { PhoneOff, ArrowLeft } from 'lucide-react';

export default function MeetingLeft() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Meeting Ended | Teamora';
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', background: 'var(--bg-dark)', alignItems: 'center', justifyContent: 'center' }}>
      
      <div className="glass-panel animate-fade-in" style={{ padding: '50px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', maxWidth: '400px', textAlign: 'center' }}>
        
        <div style={{ background: 'rgba(239, 68, 68, 0.15)', padding: '20px', borderRadius: '50%', color: '#ef4444' }}>
          <PhoneOff size={48} />
        </div>
        
        <h1 style={{ fontSize: '1.8rem', margin: 0 }}>You left the meeting</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem', margin: 0 }}>
          The video call has ended. You can safely close this window or return to your dashboard.
        </p>

        <button 
          onClick={() => navigate('/')} 
          className="btn-primary" 
          style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '20px', width: '100%', justifyContent: 'center' }}
        >
          <ArrowLeft size={18} /> Back to Dashboard
        </button>

      </div>
      
    </div>
  );
}
