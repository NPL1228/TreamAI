import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, ArrowLeft, Bot, Info, Paperclip, FileText, X } from 'lucide-react';

export default function ChatRoom({ user }) {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [fileUpload, setFileUpload] = useState(null);    // { file, previewUrl, uploading, error }
  const fileInputRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const ws = useRef(null);
  const messagesEndRef = useRef(null);
  const [chatInfo, setChatInfo] = useState(null);
  const [nicknames, setNicknames] = useState({});
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isWaitingForAgent, setIsWaitingForAgent] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      if (!input) {
        textareaRef.current.style.height = '48px';
      } else {
        textareaRef.current.style.height = '48px';
        const scrollHeight = textareaRef.current.scrollHeight;
        textareaRef.current.style.height = Math.min(Math.max(scrollHeight, 48), 120) + 'px';
      }
    }
  }, [input]);

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

  const ALLOWED_TYPES = ['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.openxmlformats-officedocument.presentationml.presentation','text/plain','text/csv','application/zip','image/png','image/jpeg'];
  const ALLOWED_EXT = ['.pdf','.docx','.xlsx','.pptx','.txt','.csv','.zip','.png','.jpg','.jpeg'];
  const MAX_SIZE = 25 * 1024 * 1024;

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      setFileUpload({ error: `File type "${ext}" is not allowed.` });
      return;
    }
    if (file.size > MAX_SIZE) {
      setFileUpload({ error: 'File exceeds the 25 MB size limit.' });
      return;
    }
    const previewUrl = ['image/png','image/jpeg'].includes(file.type) ? URL.createObjectURL(file) : null;
    setFileUpload({ file, previewUrl, uploading: false, error: null });
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!ws.current) return;
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8443';

    // If there is a pending file, upload it first then send
    if (fileUpload?.file) {
      setFileUpload(prev => ({ ...prev, uploading: true }));
      const formData = new FormData();
      formData.append('file', fileUpload.file);
      try {
        const res = await fetch(`${baseUrl}/api/upload/${chatId}?username=${encodeURIComponent(user)}`, {
          method: 'POST', body: formData
        });
        if (!res.ok) {
          const err = await res.json();
          setFileUpload(prev => ({ ...prev, uploading: false, error: err.detail || 'Upload failed.' }));
          return;
        }
        const data = await res.json();
        const msgPayload = JSON.stringify({
          text: input.trim() || '',
          file_url: data.file_url,
          file_name: data.file_name
        });
        const isExpectingReply = input.includes('@agent') || input.startsWith('?');
        if (isExpectingReply) setIsWaitingForAgent(true);
        ws.current.send(msgPayload);
        setInput('');
        setFileUpload(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch {
        setFileUpload(prev => ({ ...prev, uploading: false, error: 'Upload failed. Please try again.' }));
      }
      return;
    }

    if (!input.trim()) return;
    const isExpectingReply = (chatInfo?.chat_type === 'private' && chatInfo?.chat_name === 'TreamAI Agent') ||
                             input.includes('@agent') || 
                             input.startsWith('?');
    if (isExpectingReply) setIsWaitingForAgent(true);
    ws.current.send(input);
    setInput('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: isMobile ? '10px' : '20px', maxWidth: '1000px', margin: '0 auto', height: '100%' }}>
      
      <header style={{ padding: isMobile ? '15px 20px 15px 10px' : '15px 25px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '20px', flex: 1, minWidth: 0 }}>
          <button onClick={() => navigate('/dashboard')} style={{ marginTop: '5px', background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', flexShrink: 0 }}>
            <ArrowLeft size={24} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: isMobile ? '1.2rem' : '1.4rem', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: isMobile ? '180px' : '400px' }}>
              {chatInfo ? chatInfo.chat_name : `#${chatId}`}
            </h2>
          </div>
        </div>
        <button 
          onClick={() => navigate(`/chat/${chatId}/info`)}
          style={{ 
            background: 'var(--input-bg)', 
            border: 'none', 
            color: 'var(--text-main)', 
            cursor: 'pointer', 
            borderRadius: '50%', 
            width: '40px', 
            height: '40px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            transition: 'background 0.2s ease',
            flexShrink: 0,
            marginRight: '50px'
          }}
          className="hover-bg"
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
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '50px', padding: '0 20px' }}>
              <Bot size={48} style={{ opacity: 0.5, marginBottom: '15px' }} />
              <h3 style={{ margin: '0 auto 10px auto', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                Welcome to {chatInfo ? chatInfo.chat_name : `#${chatId}`}
              </h3>
              <p>Ready to collaborate? Send your first message to get started.</p>
            </div>
          ) : messages.map((msg, idx) => {
            if (msg.sender === 'system') {
              return (
                <div key={idx} style={{ textAlign: 'center', margin: '15px 0' }}>
                  <span style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', padding: '5px 12px', borderRadius: '12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {msg.text}
                  </span>
                </div>
              );
            }

            const isMe = msg.sender === user;
            const isAgent = msg.sender === 'TreamAI Agent';

            return (
              <div key={idx} style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: isMe ? 'flex-end' : 'flex-start',
                marginBottom: '15px',
                animation: 'fadeIn 0.3s ease'
              }}>
                <div style={{
                  padding: '12px 18px',
                  borderRadius: '16px',
                  background: isMe ? 'var(--bubble-me)' : 
                             (isAgent ? 'rgba(99, 102, 241, 0.1)' : 'var(--input-bg)'),
                  border: isAgent ? '1px solid var(--secondary)' : '1px solid var(--border)',
                  color: isMe ? 'var(--bubble-text)' : 'var(--text-main)',
                  borderBottomRightRadius: isMe ? '4px' : '16px',
                  borderBottomLeftRadius: !isMe ? '4px' : '16px',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                  wordBreak: 'break-word',
                  whiteSpace: 'pre-wrap'
                }}>
                  {/* Render the sender name inside the bubble */}
                  {!isMe && (
                    <div style={{ fontSize: '0.75rem', color: isAgent ? 'var(--text-main)' : (msg.color || 'var(--primary)'), marginBottom: '6px', fontWeight: 'bold' }}>
                      {isAgent ? 'TreamAI Agent' : (nicknames[msg.sender] || msg.sender)}
                    </div>
                  )}
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
                              background: 'var(--input-bg)',
                              border: '1px solid var(--border)',
                              borderRadius: '6px',
                              color: 'var(--text-main)',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                              transition: 'background 0.2s'
                            }}
                          >
                            {match[1]}
                          </button>
                        );
                      }
                      return <span key={i}>{part}</span>;
                    });
                  })()}
                  {/* File Attachment Rendering */}
                  {msg.file_url && (() => {
                    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8443';
                    const fullUrl = `${baseUrl}${msg.file_url}`;
                    const isImage = msg.file_url.match(/\.(png|jpg|jpeg)$/i);
                    if (isImage) {
                      return (
                        <div style={{ marginTop: msg.text ? '10px' : '0' }}>
                          <a href={fullUrl} target="_blank" rel="noreferrer">
                            <img src={fullUrl} alt={msg.file_name} style={{ maxWidth: '220px', maxHeight: '180px', borderRadius: '8px', display: 'block' }} />
                          </a>
                        </div>
                      );
                    }
                    return (
                      <div style={{ marginTop: msg.text ? '10px' : '0' }}>
                        <a href={fullUrl} download={msg.file_name} target="_blank" rel="noreferrer" className="hover-bg" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: isMe ? 'rgba(255, 255, 255, 0.15)' : 'var(--bg-dark)', borderRadius: '12px', border: isMe ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid var(--border)', color: isMe ? 'var(--bubble-text)' : 'var(--text-main)', textDecoration: 'none', fontSize: '0.9rem', width: 'fit-content' }}>
                          <div style={{ background: isMe ? 'rgba(255, 255, 255, 0.2)' : 'var(--input-bg)', padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <FileText size={18} color={isMe ? 'white' : 'var(--primary)'} />
                          </div>
                          <span style={{ fontWeight: '500', wordBreak: 'break-all' }}>{msg.file_name}</span>
                        </a>
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })}
          
          {isWaitingForAgent && (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'flex-start',
              marginBottom: '15px',
              animation: 'fadeIn 0.3s ease'
            }}>
              <div style={{
                padding: '12px 18px',
                borderRadius: '16px',
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid var(--secondary)',
                color: 'var(--text-main)',
                borderBottomRightRadius: '16px',
                borderBottomLeftRadius: '4px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                wordBreak: 'break-word',
                whiteSpace: 'pre-wrap'
              }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-main)', marginBottom: '6px', fontWeight: 'bold' }}>
                  TreamAI Agent
                </div>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <span className="dot-anim" style={{ animationDelay: '0s' }}>.</span>
                  <span className="dot-anim" style={{ animationDelay: '0.2s' }}>.</span>
                  <span className="dot-anim" style={{ animationDelay: '0.4s' }}>.</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div style={{ padding: '5px 0', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'transparent' }}>
          {chatInfo?.chat_type === 'private' && chatInfo.chat_name !== 'TreamAI Agent' && chatInfo.is_friend === false ? (
            <div style={{ textAlign: 'center', padding: '15px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
              You are no longer friends with this user. You cannot send new messages.
            </div>
          ) : chatInfo?.members && !chatInfo.members.some(m => m.username === user && m.role !== 'left') ? (
            <div style={{ textAlign: 'center', padding: '15px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
              You are no longer an active member of this chat. You cannot send new messages.
            </div>
          ) : (
            <form onSubmit={sendMessage} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* File preview banner */}
              {fileUpload && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '0.85rem' }}>
                  {fileUpload.error ? (
                    <span style={{ color: '#ff6b6b', flex: 1 }}>{fileUpload.error}</span>
                  ) : fileUpload.previewUrl ? (
                    <img src={fileUpload.previewUrl} alt="preview" style={{ height: '40px', width: '40px', objectFit: 'cover', borderRadius: '6px' }} />
                  ) : (
                    <FileText size={20} style={{ color: 'var(--secondary)' }} />
                  )}
                  {!fileUpload.error && <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileUpload.file?.name}</span>}
                  {fileUpload.uploading && <span style={{ color: 'var(--text-muted)' }}>Uploading…</span>}
                  <button type="button" onClick={() => { setFileUpload(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, marginTop: '10px' }}>
                    <X size={16} />
                  </button>
                </div>
              )}
              <div style={{ 
                display: 'flex', 
                alignItems: 'flex-end', 
                background: 'var(--input-bg)', 
                border: '1px solid var(--border)', 
                borderRadius: '28px',
                padding: '4px'
              }}>
                {/* Hidden file input */}
                <input ref={fileInputRef} type="file" accept=".pdf,.docx,.xlsx,.pptx,.txt,.csv,.zip,.png,.jpg,.jpeg" style={{ display: 'none' }} onChange={handleFileSelect} />
                
                {/* Paperclip button */}
                <button type="button" onClick={() => fileInputRef.current?.click()} className="hover-bg" style={{ background: 'transparent', border: 'none', borderRadius: '50%', width: '48px', height: '48px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0 }}>
                  <Paperclip size={22} />
                </button>
                
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage(e);
                    }
                  }}
                  placeholder="Message (@agent to ask TreamAI)"
                  className="hide-scrollbar"
                  rows={1}
                  style={{ 
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: 'var(--text-main)',
                    padding: '12px 10px',
                    fontSize: isMobile ? '0.9rem' : '1.1rem',
                    minHeight: '48px',
                    maxHeight: '120px',
                    resize: 'none',
                    wordBreak: 'break-word',
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'inherit',
                    overflowY: 'auto',
                    lineHeight: '1.5'
                  }}
                />
                <button type="submit" className="btn-primary" disabled={fileUpload?.uploading} style={{ borderRadius: '50%', width: '48px', height: '48px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Send size={20} style={{ marginLeft: '-2px' }} />
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

    </div>
  );
}
