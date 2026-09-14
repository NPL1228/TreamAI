import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Info, Users, Hash, Edit3, Check, X, Copy, Bot, MessageSquare } from 'lucide-react';

export default function ChatInfo({ user }) {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const [chatInfo, setChatInfo] = useState(null);
  const [nicknames, setNicknames] = useState({});
  const [loading, setLoading] = useState(true);
  
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [editDescValue, setEditDescValue] = useState('');
  const [copied, setCopied] = useState(false);
  const [aiListening, setAiListening] = useState(true);

  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8443';

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    document.title = `Chat Info | TreamAI`;
    fetchChatInfo();
  }, [chatId]);

  const fetchChatInfo = async () => {
    try {
      let nickMap = {};
      const nickRes = await fetch(`${baseUrl}/api/friends/nicknames/${user}`);
      if (nickRes.ok) {
        const nickData = await nickRes.json();
        nickMap = nickData.nicknames;
        setNicknames(nickMap);
      }

      const res = await fetch(`${baseUrl}/api/chats/info/${chatId}`);
      if (res.ok) {
        const data = await res.json();
        let info = data.info;
        if (info.chat_type === 'private' && info.chat_name !== 'TreamAI Agent' && info.members) {
          const other = info.members.find(m => m.username !== user);
          if (other) info.chat_name = nickMap[other.username] || other.username;
        }
        setChatInfo(info);
        setEditDescValue(info.description || '');
        setAiListening(info.ai_listening !== false);
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

  if (loading) return <div style={{ padding: '40px', color: 'var(--text-main)' }}>Loading...</div>;
  if (!chatInfo) return <div style={{ padding: '40px', color: 'var(--text-main)' }}>Chat not found</div>;

  const isOwner = chatInfo?.members?.find(m => m.username === user)?.role === 'owner';

  return (
    <div style={{ padding: isMobile ? '20px 15px' : '40px', maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={24} />
        </button>
        <h1 style={{ fontSize: '2rem', margin: 0 }}>Chat Info</h1>
      </div>

      <div className="glass-panel animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
        
        {/* Header Section */}
        <div style={{ background: 'var(--input-bg)', padding: isMobile ? '20px' : '30px', borderRadius: '16px' }}>
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: '15px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', width: '100%' }}>
              <div style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))', padding: '15px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {chatInfo.chat_type === 'private' ? <MessageSquare size={32} color="white" /> : <Hash size={32} color="white" />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={{ margin: 0, fontSize: '1.6rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px', wordBreak: 'break-word' }}>
                  {chatInfo.chat_name}
                  <span style={{ fontSize: '0.8rem', padding: '2px 8px', background: 'rgba(99, 102, 241, 0.2)', color: 'var(--primary)', borderRadius: '10px', textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
                    {chatInfo.chat_type}
                  </span>
                </h2>
                {chatInfo.chat_type === 'team' && (
                  <p style={{ margin: '5px 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Hash size={14} /> Code: <span style={{ color: 'var(--text-main)', fontWeight: 'bold', letterSpacing: '1px' }}>{chatInfo.chat_id}</span>
                  </p>
                )}
              </div>
            </div>
            
            {chatInfo.chat_type === 'team' && (
              <button 
                onClick={handleCopy}
                style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: copied ? '#10b981' : 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px', transition: 'background 0.2s', alignSelf: isMobile ? 'flex-start' : 'auto', marginTop: isMobile ? '10px' : '0' }}
                className="hover-bg"
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
                {copied ? 'Copied' : 'Invite'}
              </button>
            )}
          </div>

          <div style={{ padding: '20px', background: 'var(--bg-dark)', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '1rem', margin: '0 0 10px 0', color: 'var(--text-muted)' }}>Description</h3>
            {isEditingDesc ? (
              <div>
                <textarea 
                  className="input-field" 
                  value={editDescValue} 
                  onChange={(e) => setEditDescValue(e.target.value)} 
                  rows={3} 
                  style={{ marginBottom: '10px', resize: 'vertical' }}
                  placeholder="Add a description for this chat..."
                />
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button onClick={() => { setIsEditingDesc(false); setEditDescValue(chatInfo.description || ''); }} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '8px 15px' }}>Cancel</button>
                  <button onClick={handleSaveDescription} className="btn-primary" style={{ padding: '8px 15px' }}>Save</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px' }}>
                <p style={{ margin: 0, color: chatInfo.description ? 'var(--text-main)' : 'var(--text-muted)', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                  {chatInfo.description || 'No description provided.'}
                </p>
                {isOwner && (
                  <button onClick={() => setIsEditingDesc(true)} style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', padding: '5px' }}>
                    <Edit3 size={16} /> Edit
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* AI Agent Toggles */}
        {chatInfo.chat_type === 'team' && isOwner && (
          <div style={{ padding: '0 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px', background: 'var(--input-bg)', border: '1px solid var(--primary)', borderRadius: '12px', boxShadow: '0 0 15px var(--primary-glow)' }}>
              <div>
                <h3 style={{ margin: '0 0 5px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Bot size={20} color="var(--primary)" /> TreamAI Agent
                </h3>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Allow the AI agent to listen and respond in this team.
                </p>
              </div>
              <button 
                onClick={handleToggleAI}
                style={{ 
                  width: isMobile ? '80px' : '50px', 
                  height: '26px', 
                  marginRight: isMobile ? '-5px' : '0px',
                  background: aiListening ? 'var(--primary)' : 'var(--border)', 
                  borderRadius: '13px',
                  position: 'relative',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background 0.3s'
                }}
              >
                <div style={{ 
                  width: '20px', 
                  height: '20px', 
                  background: 'white',
                  borderRadius: '50%',
                  position: 'absolute',
                  top: '3px',
                  left: aiListening ? '27px' : '3px',
                  transition: 'left 0.3s'
                }} />
              </button>
            </div>
          </div>
        )}

        {/* Members Section */}
        <div style={{ background: 'var(--input-bg)', padding: '30px', borderRadius: '16px' }}>
          <h2 style={{ fontSize: '1.4rem', margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={24} color="var(--primary)" /> Members ({chatInfo.members?.filter(m => m.role !== 'left').length || 0})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {chatInfo.members?.filter(m => m.role !== 'left').map((member, idx) => (
              <div key={idx} style={{ padding: '15px', background: 'var(--bg-dark)', border: '1px solid var(--border)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: member.color || 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
                    {member.username === 'TreamAI Agent' ? <Bot size={20} /> : member.username.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontSize: '1.1rem', fontWeight: member.username === user ? 'bold' : 'normal', color: member.username === 'TreamAI Agent' ? 'var(--primary)' : 'var(--text-main)' }}>
                    {nicknames[member.username] || member.username} {member.username === user && '(You)'}
                  </span>
                </div>
                <span style={{ fontSize: '0.85rem', padding: '4px 12px', background: member.role === 'owner' ? 'var(--role-owner-bg)' : 'var(--input-bg)', color: member.role === 'owner' ? 'var(--role-owner-text)' : 'var(--text-muted)', borderRadius: '20px', textTransform: 'capitalize' }}>
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
