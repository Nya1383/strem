import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../../context/ChatContext';
import { useStream } from '../../context/StreamContext';

export const ChatPanel: React.FC = () => {
  const { messages, isChatOpen, setIsChatOpen } = useChat();
  const { sendChat, role } = useStream();
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isChatOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isChatOpen]);

  if (!isChatOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      sendChat(inputText.trim());
      setInputText('');
    }
  };

  return (
    <div
      className="glass-panel"
      style={{
        width: '320px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 0,
        borderLeft: '1px solid var(--border-color)',
        borderTop: 'none',
        borderBottom: 'none',
        borderRight: 'none',
        zIndex: 50
      }}
    >
      <div
        style={{
          padding: '16px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Stream Chat</h3>
        <button
          onClick={() => setIsChatOpen(false)}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
        >
          ✕
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {messages.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', marginTop: '40px' }}>
            No messages yet. Say hello in chat!
          </div>
        ) : (
          messages.map((msg) => {
            const timeStr = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return (
              <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                  <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{msg.fromName}</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>{timeStr}</span>
                </div>
                <div
                  style={{
                    fontSize: '13px',
                    color: 'var(--text-main)',
                    background: 'var(--bg-panel)',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    wordBreak: 'break-word'
                  }}
                >
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} style={{ padding: '12px', borderTop: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder="Send a chat message..."
            className="input-field"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={role === 'idle'}
            style={{ fontSize: '13px', padding: '8px 12px' }}
          />
          <button type="submit" className="btn btn-primary" disabled={role === 'idle' || !inputText.trim()} style={{ padding: '8px 12px' }}>
            Send
          </button>
        </div>
      </form>
    </div>
  );
};
