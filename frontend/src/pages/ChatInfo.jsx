import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Info, Users, Hash, Edit3, Check, X, Copy } from 'lucide-react';

export default function ChatInfo({ user }) {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const [chatInfo, setChatInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [editDescValue, setEditDescValue] = useState('');
  const [copied, setCopied] = useState(false);
  const [aiListening, setAiListening] = useState(true);

  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8443';

  useEffect(() => {
    document.title = `Chat Info | Teamora`;
    fetchChatInfo();
  }, [chatId]);

  const fetchChatInfo = async () => {
    try {
      const res = await fetch(`${baseUrl}/api/chats/info/${chatId}`);
      if (res.ok) {
        const data = await res.json();
        setChatInfo(data.info);
        setEditDescValue(data.info.description || '');
        setAiListening(data.info.ai_listening !== false); // default to true if undefined
      }
    } catch (err) {
      console.error("Failed to fetch chat info", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDescription = async () => {
    try {
      const res = await fetch(`${baseUrl}/api/chats/description`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, description: editDescValue })
      });
      if (res.ok) {
        setChatInfo(prev => ({ ...prev, description: editDescValue }));
        setIsEditingDesc(false);
      }
    } catch (err) {
      console.error("Failed to save description", err);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(chatInfo.chat_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleAI = async () => {
    const newStatus = !aiListening;
    // Optimistic update
    setAiListening(newStatus);
    try {
      const res = await fetch(`${baseUrl}/api/chats/${chatId}/ai_listening`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ai_listening: newStatus })
      });
      if (!res.ok) {
        // Revert if failed
        setAiListening(!newStatus);
      }
    } catch (err) {
      console.error("Failed to toggle AI", err);
      setAiListening(!newStatus);
    }
  };

  if (loading) return <div style={{ padding: '40px', color: 'white' }}>Loading...</div>;
  if (!chatInfo) return <div style={{ padding: '40px', color: 'white' }}>Chat not found</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '40px', maxWidth: '800px', margin: '0 auto', height: '100%' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '40px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'transparent', border: 'none', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={24} />
        </button>
        <h1 style={{ fontSize: '2rem', margin: 0 }}>Chat Information</h1>
      </div>

      <div className="animate-fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '30px' }}>
        
        {/* Basic Info Section */}
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '30px', borderRadius: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
            <div style={{ background: 'rgba(99, 102, 241, 0.15)', padding: '15px', borderRadius: '50%', color: 'var(--primary)' }}>
              <Info size={32} />
            </div>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.8rem', margin: 0, fontWeight: 'bold' }}>{chatInfo.chat_name}</h2>
                <p style={{ color: 'var(--text-muted)', margin: '5px 0 0 0', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Hash size={14} /> Code: <span style={{ color: 'white', fontWeight: 'bold', letterSpacing: '1px' }}>{chatInfo.chat_id}</span>
                </p>
              </div>
              <button 
                onClick={handleCopy}
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: copied ? '#10b981' : 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px', transition: 'all 0.2s' }}
                className="hover-bg"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                <span>{copied ? 'Copied' : 'Copy Code'}</span>
              </button>
            </div>
          </div>
          
          <div style={{ marginTop: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--text-muted)' }}>Description</h3>
              {!isEditingDesc && (
                <button 
                  onClick={() => setIsEditingDesc(true)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                  <Edit3 size={16} /> Edit
                </button>
              )}
            </div>
            
            {isEditingDesc ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <textarea 
                  className="input-field" 
                  value={editDescValue}
                  onChange={e => setEditDescValue(e.target.value)}
                  placeholder="Add a description for this chat..."
                  style={{ minHeight: '100px', resize: 'vertical' }}
                />
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button onClick={() => { setIsEditingDesc(false); setEditDescValue(chatInfo.description || ''); }} className="btn-secondary" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <X size={16} /> Cancel
                  </button>
                  <button onClick={handleSaveDescription} className="btn-primary" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Check size={16} /> Save
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '8px', minHeight: '80px', color: chatInfo.description ? 'var(--text)' : 'var(--text-muted)' }}>
                {chatInfo.description || "No description provided."}
              </div>
            )}
          </div>

          <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', margin: '0 0 5px 0' }}>AI Agent Listening</h3>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>When enabled, Teamora will listen to generate memories and assist you.</p>
            </div>
            
            {/* Custom Toggle Switch */}
            <div 
              onClick={handleToggleAI}
              style={{ 
                width: '50px', 
                height: '26px', 
                background: aiListening ? 'var(--primary)' : 'rgba(255,255,255,0.1)', 
                borderRadius: '13px',
                position: 'relative',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
            >
              <div style={{
                width: '22px',
                height: '22px',
                background: 'white',
                borderRadius: '50%',
                position: 'absolute',
                top: '2px',
                left: aiListening ? '26px' : '2px',
                transition: 'all 0.3s'
              }} />
            </div>
          </div>
        </div>

        {/* Members Section */}
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '30px', borderRadius: '16px' }}>
          <h2 style={{ fontSize: '1.4rem', margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={24} color="var(--primary)" /> Members ({chatInfo.members?.length || 0})
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {chatInfo.members?.map((member, idx) => (
              <div key={idx} style={{ padding: '15px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: member.username === user ? 'bold' : 'normal', color: member.username === 'Teamora Agent' ? 'var(--primary)' : 'var(--text)' }}>
                  {member.username} {member.username === user && '(You)'}
                </span>
                <span style={{ fontSize: '0.85rem', padding: '4px 12px', background: member.role === 'owner' ? 'rgba(234, 179, 8, 0.2)' : 'rgba(255,255,255,0.1)', color: member.role === 'owner' ? '#eab308' : 'var(--text-muted)', borderRadius: '20px', textTransform: 'capitalize' }}>
                  {member.role}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
