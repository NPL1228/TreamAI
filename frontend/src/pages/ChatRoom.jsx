import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, ArrowLeft, Bot, Info } from 'lucide-react';

export default function ChatRoom({ user }) {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const ws = useRef(null);
  const messagesEndRef = useRef(null);
  const [chatInfo, setChatInfo] = useState(null);

  useEffect(() => {
    document.title = chatInfo ? `${chatInfo.chat_name} | TreamAI` : `Chat: ${chatId} | TreamAI`;
  }, [chatId, chatInfo]);

  useEffect(() => {
    const fetchChatInfo = async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8443';
        const res = await fetch(`${baseUrl}/api/chats/info/${chatId}`);
        if (res.ok) {
          const data = await res.json();
          setChatInfo(data.info);
        }
      } catch (err) {
        console.error("Failed to fetch chat info", err);
      }
    };
    fetchChatInfo();
  }, [chatId]);

  useEffect(() => {
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8443';
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8443';
    
    let isMounted = true;

    // Fetch message history first
    fetch(`${baseUrl}/api/chats/${chatId}/messages`)
      .then(res => res.json())
      .then(data => {
        if (isMounted && data.messages) {
          setMessages(data.messages);
        }
        
        // Then establish WebSocket connection for live messages
        if (isMounted) {
          ws.current = new WebSocket(`${wsUrl}/ws/${chatId}/${user}`);
          ws.current.onmessage = (event) => {
            const msgData = JSON.parse(event.data);
            setMessages(prev => [...prev, msgData]);
          };
        }
      })
      .catch(err => console.error("Failed to load chat history", err));

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
    
    ws.current.send(input);
    setInput('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '20px', maxWidth: '1000px', margin: '0 auto', height: '100%' }}>
      
      <header style={{ padding: '15px 25px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button onClick={() => navigate(-1)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 style={{ fontSize: '1.4rem', margin: 0 }}>{chatInfo ? chatInfo.chat_name : `#${chatId}`}</h2>
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
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '50px' }}>
              <Bot size={48} style={{ opacity: 0.5, marginBottom: '15px' }} />
              <h3>Welcome to #{chatInfo ? chatInfo.chat_name : `#${chatId}`}</h3>
              <p>Ready to collaborate? Send your first message to get started.</p>
            </div>
          )}
          
          {messages.map((msg, idx) => {
            const isMe = msg.sender === user;
            const isAgent = msg.sender === 'TreamAI Agent';

            return (
              <div key={idx} style={{
                alignSelf: isMe ? 'flex-end' : 'flex-start',
                maxWidth: '70%',
                animation: 'fadeIn 0.3s ease'
              }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', marginLeft: '4px', textAlign: isMe ? 'right' : 'left' }}>
                  {msg.sender}
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
                  boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                }}>
                  {msg.text}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div style={{ padding: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'transparent' }}>
          <form onSubmit={sendMessage} style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message this chat... (use @agent to ask TreamAI)"
              className="input-field"
              style={{ flex: 1, borderRadius: '24px', padding: '20px 25px', fontSize: '1.1rem' }}
            />
            <button type="submit" className="btn-primary" style={{ borderRadius: '50%', width: '56px', height: '56px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Send size={24} style={{ marginLeft: '-2px' }} />
            </button>
          </form>
        </div>
      </div>

    </div>
  );
}
