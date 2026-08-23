import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MessageSquare, Zap, Shield } from 'lucide-react';

export default function Landing() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}>
      {/* Navigation Bar */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: isMobile ? '15px 20px' : '20px 40px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: isMobile ? '1.2rem' : '1.5rem', fontWeight: 'bold', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <MessageSquare size={isMobile ? 24 : 28} />
          TreamAI
        </div>
        <div style={{ display: 'flex', gap: isMobile ? '15px' : '30px', alignItems: 'center' }}>
          {!isMobile && <a href="#about" style={{ color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.2s' }} className="hover-text-primary">About</a>}
          <a href="#contact" style={{ color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.2s', fontSize: isMobile ? '0.9rem' : '1rem' }} className="hover-text-primary">Contact</a>
          <Link to="/login" className="btn-primary" style={{ padding: isMobile ? '6px 12px' : '8px 20px', textDecoration: 'none', fontSize: isMobile ? '0.9rem' : '1rem' }}>
            Login
          </Link>
        </div>
      </nav>

      {/* Main Content (Hero Section) */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '20px' : '40px', textAlign: 'center' }}>
        <h1 style={{ fontSize: isMobile ? '2.5rem' : '4rem', fontWeight: 'bold', marginBottom: '20px', lineHeight: '1.2' }}>
          The Smartest Way For Your <br/> <span style={{ color: 'var(--primary)' }}>Team to Collaborate</span>
        </h1>
        <p style={{ fontSize: isMobile ? '1rem' : '1.2rem', color: 'var(--text-muted)', maxWidth: '600px', marginBottom: '40px', lineHeight: '1.6' }}>
          TreamAI is an AI-powered workspace that actively listens, stores your team's decisions, and fetches memories instantly. Never lose context again.
        </p>
        <Link to="/login" className="btn-primary" style={{ fontSize: isMobile ? '1rem' : '1.2rem', padding: isMobile ? '12px 30px' : '15px 40px', display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          Get Started <ArrowRight size={20} />
        </Link>

        {/* Feature Highlights */}
        <div style={{ display: 'flex', gap: '40px', marginTop: '80px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <FeatureCard 
            icon={<Zap size={32} color="var(--primary)" />} 
            title="Instant Retrieval" 
            description="Our advanced LLM pipeline fetches your project memories in milliseconds." 
          />
          <FeatureCard 
            icon={<MessageSquare size={32} color="#10b981" />} 
            title="Smart Agent" 
            description="Have a 1-on-1 private chat with the TreamAI Agent to update or query team knowledge." 
          />
          <FeatureCard 
            icon={<Shield size={32} color="#f59e0b" />} 
            title="Total Privacy" 
            description="Toggle AI listening on or off at the click of a button for private conversations." 
          />
        </div>
      </main>

      {/* Footer */}
      <footer id="contact" style={{ padding: '40px', textAlign: 'center', borderTop: '1px solid var(--border)', color: 'var(--text-muted)' }}>
        <p>&copy; {new Date().getFullYear()} TreamAI. Final Year Project.</p>
        <p style={{ fontSize: '0.9rem', marginTop: '10px' }}>Contact: treamaisupport@gmail.com</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border)', borderRadius: '16px', padding: '30px', width: '300px', textAlign: 'left' }}>
      <div style={{ marginBottom: '20px' }}>{icon}</div>
      <h3 style={{ fontSize: '1.2rem', margin: '0 0 10px 0', color: 'var(--text-main)' }}>{title}</h3>
      <p style={{ color: 'var(--text-muted)', margin: 0, lineHeight: '1.5' }}>{description}</p>
    </div>
  );
}
