import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Info, Users, Hash, Edit3, Check, X, Copy, Bot, MessageSquare, Trash2 } from 'lucide-react';

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

  const handleDeleteChat = async () => {
    const isAgent = chatInfo?.chat_name === 'TreamAI Agent';
    const msg = isAgent 
      ? "Are you sure you want to clear the AI message history?" 
      : "Are you sure you want to delete this chat from your list?";
      
    if (window.confirm(msg)) {
      try {
        const res = await fetch(`${baseUrl}/api/chats/${chatId}?username=${encodeURIComponent(user)}`, {
          method: 'DELETE'
        });
        if (res.ok) {
          navigate('/dashboard');
        } else {
          alert('Failed to delete chat');
        }
      } catch (err) {
        console.error(err);
      }
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
        <div style={{ background: 'transparent', padding: isMobile ? '20px' : '30px', borderRadius: '16px' }}>
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: '15px', marginBottom: chatInfo.chat_type === 'team' ? '20px' : '0' }}>
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

          {chatInfo.chat_type === 'team' && (
            <div style={{ padding: '20px', background: 'var(--bg-dark)', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '1rem', margin: '0 0 10px 0', color: 'var(--text-muted)' }}>Description</h3>
              
              {isEditingDesc ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <textarea 
                    value={editDescValue} 
                    onChange={(e) => setEditDescValue(e.target.value)}
                    style={{ width: '100%', minHeight: '80px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', color: 'white', padding: '12px', borderRadius: '8px', resize: 'vertical' }}
                  />
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button onClick={() => setIsEditingDesc(false)} style={{ background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer' }}>Cancel</button>
                    <button onClick={handleSaveDescription} style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '6px 16px', borderRadius: '6px', cursor: 'pointer' }}>Save</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <p style={{ margin: 0, color: 'var(--text-main)', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                    {chatInfo.description || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No description set.</span>}
                  </p>
                  {isOwner && (
                    <button onClick={() => { setEditDescValue(chatInfo.description || ''); setIsEditingDesc(true); }} style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '4px' }}>
                      <Edit3 size={18} />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {chatInfo.chat_name === 'TreamAI Agent' ? (
          <div style={{ padding: '0 20px' }}>
            <div style={{ padding: '30px', background: 'transparent', borderRadius: '16px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                <div style={{ padding: '12px', background: 'rgba(99, 102, 241, 0.2)', borderRadius: '12px', color: 'var(--primary)' }}>
                  <Bot size={28} />
                </div>
                <h2 style={{ fontSize: '1.4rem', margin: 0 }}>About TreamAI Agent</h2>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <Check size={18} color="#10b981" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <p style={{ margin: 0, color: 'var(--text-main)', lineHeight: '1.5' }}>
                    <strong>Answering Questions:</strong> Ask me anything, and I'll do my best to provide a helpful and accurate answer based on my knowledge base.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <Check size={18} color="#10b981" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <p style={{ margin: 0, color: 'var(--text-main)', lineHeight: '1.5' }}>
                    <strong>Summarizing History:</strong> I can read through your chat history and provide concise summaries of long conversations.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <X size={18} color="#ef4444" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <p style={{ margin: 0, color: 'var(--text-main)', lineHeight: '1.5' }}>
                    <strong>Proactive Messaging:</strong> I will only respond when explicitly spoken to. I cannot initiate conversations on my own.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <X size={18} color="#ef4444" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <p style={{ margin: 0, color: 'var(--text-main)', lineHeight: '1.5' }}>
                    <strong>Reading Private Chats:</strong> If the AI Listening toggle is turned off in a chat, I am completely blind to those messages.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* AI Assistant Section */}
            <div style={{ padding: '0 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px', background: 'transparent', border: '1px solid var(--primary)', borderRadius: '12px', boxShadow: '0 0 15px var(--primary-glow)', opacity: (!isOwner && chatInfo.chat_type === 'team') ? 0.6 : 1 }}>
                <div>
                <h2 style={{ fontSize: '1.2rem', margin: '0 0 5px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Bot size={20} color="var(--primary)" /> TreamAI Listening
                </h2>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  {chatInfo.chat_type === 'team' && !isOwner 
                    ? 'Only the team owner can change this setting.'
                    : 'Allow the AI agent to read and respond to messages in this chat.'}
                </p>
              </div>
              <div 
                onClick={() => {
                  if (chatInfo.chat_type === 'team' && !isOwner) return;
                  handleToggleAI();
                }}
                style={{ 
                  width: '50px', height: '26px', background: aiListening ? 'var(--primary)' : 'rgba(255,255,255,0.1)', 
                  borderRadius: '13px', position: 'relative', cursor: (chatInfo.chat_type === 'team' && !isOwner) ? 'not-allowed' : 'pointer',
                  transition: 'background 0.3s', flexShrink: 0, opacity: (chatInfo.chat_type === 'team' && !isOwner) ? 0.5 : 1
                }}
              >
                <div style={{ 
                  width: '20px', height: '20px', background: 'white', borderRadius: '50%',
                  position: 'absolute', top: '3px', left: aiListening ? '27px' : '3px', transition: 'left 0.3s'
                }} />
              </div>
              </div>
            </div>

            {/* Members Section */}
            <div style={{ background: 'transparent', padding: '30px', borderRadius: '16px' }}>
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
          </>
        )}

      </div>

      {/* Danger Zone */}
      <div className="animate-fade-in" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '25px', borderRadius: '16px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: '20px', marginTop: isMobile ? '-15px' : '0' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', margin: '0 0 5px 0', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Trash2 size={20} /> Danger Zone
          </h2>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {chatInfo.chat_name === 'TreamAI Agent' 
              ? 'Wipe the message history for this AI chat. The chat itself will remain in your sidebar.'
              : 'Remove this chat from your list. You will lose access to the message history.'}
          </p>
        </div>
        <button 
          onClick={handleDeleteChat}
          style={{ background: '#ef4444', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', flexShrink: 0, width: isMobile ? '100%' : 'auto' }}
        >
          {chatInfo.chat_name === 'TreamAI Agent' ? 'Clear History' : 'Delete Chat'}
        </button>
      </div>

    </div>
  );
}
