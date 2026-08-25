import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, ArrowLeft, Bot, Info } from 'lucide-react';

export default function ChatRoom({ user }) {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const ws = useRef(null);
  const messagesEndRef = useRef(null);
  const [chatInfo, setChatInfo] = useState(null);
  const [nicknames, setNicknames] = useState({});
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isWaitingForAgent, setIsWaitingForAgent] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    document.title = chatInfo ? `${chatInfo.chat_name} | TreamAI` : `Chat: ${chatId} | TreamAI`;
  }, [chatId, chatInfo]);

  useEffect(() => {
    const fetchChatInfo = async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8443';
        
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
        }
      } catch (err) {
        console.error("Failed to fetch chat info", err);
      }
    };
    fetchChatInfo();
  }, [chatId, user]);

  useEffect(() => {
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8443';
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8443';
    
    let isMounted = true;
    setIsLoading(true);

    // Fetch message history first
    fetch(`${baseUrl}/api/chats/${chatId}/messages?username=${encodeURIComponent(user)}`)
      .then(res => res.json())
      .then(data => {
        if (isMounted && data.messages) {
          setMessages(data.messages);
        }
        if (isMounted) setIsLoading(false);
        
        // Mark as read
        fetch(`${baseUrl}/api/chats/${chatId}/read`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: user })
        }).then(() => window.dispatchEvent(new Event('sidebar-update')));
        
        // Then establish WebSocket connection for live messages
        if (isMounted) {
          ws.current = new WebSocket(`${wsUrl}/ws/${chatId}/${user}`);
          ws.current.onmessage = (event) => {
            const msgData = JSON.parse(event.data);
            setMessages(prev => [...prev, msgData]);
            if (msgData.sender === 'TreamAI Agent') {
              setIsWaitingForAgent(false);
            }
            fetch(`${baseUrl}/api/chats/${chatId}/read`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username: user })
            });
          };
        }
      })
      .catch(err => {
        console.error("Failed to load chat history", err);
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
      if (ws.current) ws.current.close();
    };
  }, [chatId, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!input.trim() || !ws.current) return;
    
    const isExpectingReply = (chatInfo?.chat_type === 'private' && chatInfo?.chat_name === 'TreamAI Agent') ||
                             input.includes('@agent') || 
                             input.startsWith('?');
    if (isExpectingReply) {
      setIsWaitingForAgent(true);
    }
    
    ws.current.send(input);
    setInput('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: isMobile ? '10px' : '20px', maxWidth: '1000px', margin: '0 auto', height: '100%' }}>
      
      <header style={{ padding: isMobile ? '60px 10px 15px 10px' : '15px 25px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '20px' }}>
          <button onClick={() => navigate('/dashboard')} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 style={{ fontSize: isMobile ? '1.2rem' : '1.4rem', margin: 0, wordBreak: 'break-word', maxWidth: isMobile ? '180px' : 'auto' }}>{chatInfo ? chatInfo.chat_name : `#${chatId}`}</h2>
          </div>
        </div>
        <button 
          onClick={() => navigate(`/chat/${chatId}/info`)}
          style={{ 
            background: 'rgba(255, 255, 255, 0.1)', 
            border: 'none', 
            color: 'white', 
            cursor: 'pointer', 
            borderRadius: '50%', 
            width: '40px', 
            height: '40px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
        >
          <Info size={20} />
        </button>
      </header>

      <div className="animate-fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* Messages Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '50px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
              <div className="spinner" style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
              <p>Loading conversation...</p>
              <style>{`
                @keyframes spin {
                  to { transform: rotate(360deg); }
                }
              `}</style>
            </div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '50px' }}>
              <Bot size={48} style={{ opacity: 0.5, marginBottom: '15px' }} />
              <h3>Welcome to #{chatInfo ? chatInfo.chat_name : `#${chatId}`}</h3>
              <p>Ready to collaborate? Send your first message to get started.</p>
            </div>
          ) : messages.map((msg, idx) => {
            if (msg.sender === 'system') {
              return (
                <div key={idx} style={{ textAlign: 'center', margin: '15px 0' }}>
                  <span style={{ background: 'rgba(255,255,255,0.1)', padding: '5px 12px', borderRadius: '12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {msg.text}
                  </span>
                </div>
              );
            }

            const isMe = msg.sender === user;
            const isAgent = msg.sender === 'TreamAI Agent';

            return (
              <div key={idx} style={{
                alignSelf: isMe ? 'flex-end' : 'flex-start',
                maxWidth: '70%',
                animation: 'fadeIn 0.3s ease'
              }}>
                <div style={{ fontSize: '0.75rem', color: isMe || isAgent ? 'var(--text-muted)' : (msg.color || 'var(--text-muted)'), marginBottom: '4px', marginLeft: '4px', textAlign: isMe ? 'right' : 'left' }}>
                  {nicknames[msg.sender] || msg.sender}
                </div>
                <div style={{
                  padding: '12px 18px',
                  borderRadius: '16px',
                  background: isMe ? 'linear-gradient(135deg, var(--primary), var(--secondary))' : 
                             isAgent ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.3)',
                  border: isAgent ? '1px solid var(--secondary)' : 'none',
                  color: 'white',
                  borderBottomRightRadius: isMe ? '4px' : '16px',
                  borderBottomLeftRadius: !isMe ? '4px' : '16px',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                  wordBreak: 'break-word',
                  whiteSpace: 'pre-wrap'
                }}>
                  {(() => {
                    const parts = msg.text.split(/(\[\[.*?\|.*?\]\])/g);
                    return parts.map((part, i) => {
                      const match = part.match(/\[\[(.*?)\|(.*?)\]\]/);
                      if (match) {
                        return (
                          <button 
                            key={i} 
                            onClick={() => {
                              const action = match[2];
                              if (action.includes('@agent') || action.startsWith('?')) {
                                setIsWaitingForAgent(true);
                              }
                              ws.current && ws.current.send(action);
                            }}
                            className="hover-bg"
                            style={{
                              display: 'inline-block',
                              margin: '4px',
                              padding: '6px 12px',
                              background: 'rgba(255,255,255,0.15)',
                              border: '1px solid rgba(255,255,255,0.3)',
                              borderRadius: '6px',
                              color: 'white',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                              transition: 'all 0.2s'
                            }}
                          >
                            {match[1]}
                          </button>
                        );
                      }
                      return <span key={i}>{part}</span>;
                    });
                  })()}
                </div>
              </div>
            );
          })}
          
          {isWaitingForAgent && (
            <div style={{
              alignSelf: 'flex-start',
              maxWidth: '70%',
              animation: 'fadeIn 0.3s ease'
            }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', marginLeft: '4px', textAlign: 'left' }}>
                TreamAI Agent
              </div>
              <div style={{
                padding: '12px 18px',
                borderRadius: '16px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid var(--secondary)',
                color: 'white',
                borderBottomLeftRadius: '4px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                display: 'flex',
                gap: '4px',
                alignItems: 'center'
              }}>
                <span className="dot-anim" style={{ animationDelay: '0s' }}>.</span>
                <span className="dot-anim" style={{ animationDelay: '0.2s' }}>.</span>
                <span className="dot-anim" style={{ animationDelay: '0.4s' }}>.</span>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div style={{ padding: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'transparent' }}>
          {chatInfo?.members && !chatInfo.members.some(m => m.username === user && m.role !== 'left') ? (
            <div style={{ textAlign: 'center', padding: '15px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
              You are no longer an active member of this chat. You cannot send new messages.
            </div>
          ) : (
            <form onSubmit={sendMessage} style={{ display: 'flex', gap: '10px' }}>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(e);
                  }
                }}
                placeholder="Message this chat... (use @agent to ask TreamAI)"
                className="input-field"
                rows={1}
                style={{ 
                  flex: 1, 
                  borderRadius: '24px', 
                  padding: '16px 25px', 
                  fontSize: '1.1rem',
                  minHeight: '56px',
                  maxHeight: '120px',
                  resize: 'none',
                  wordBreak: 'break-word',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'inherit',
                  overflowY: 'auto',
                  lineHeight: '1.5'
                }}
              />
              <button type="submit" className="btn-primary" style={{ borderRadius: '50%', width: '56px', height: '56px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Send size={24} style={{ marginLeft: '-2px' }} />
              </button>
            </form>
          )}
        </div>
      </div>

    </div>
  );
}
