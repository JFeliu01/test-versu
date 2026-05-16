import { useState, useEffect, useRef } from 'react';
import { Plus, Send, User, Bot, Star } from 'lucide-react';

interface Conversation {
  id: number;
  status: string;
  rating: number | null;
  created_at: string;
}

interface Message {
  id?: number;
  role: string;
  content: string;
}

export default function Conversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const token = localStorage.getItem('token');

  const fetchConversations = async () => {
    const res = await fetch('http://localhost:4000/conversations', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) setConversations(await res.json());
  };

  const fetchMessages = async (id: number) => {
    const res = await fetch(`http://localhost:4000/conversations/${id}/messages`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) setMessages(await res.json());
  };

  const createConversation = async () => {
    const res = await fetch('http://localhost:4000/conversations', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const newConv = await res.json();
      setConversations([newConv, ...conversations]);
      setSelectedId(newConv.id);
    }
  };

  const rateConversation = async (rating: number) => {
    if (!selectedId) return;
    await fetch(`http://localhost:4000/conversations/${selectedId}/rating`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ rating })
    });
    fetchConversations();
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (selectedId) {
      fetchMessages(selectedId);
      
      wsRef.current = new WebSocket('ws://localhost:4000');
      
      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'chunk') {
          setMessages(prev => {
            const lastMsg = prev[prev.length - 1];
            if (lastMsg && lastMsg.role === 'assistant' && !lastMsg.id) {
              return [...prev.slice(0, -1), { ...lastMsg, content: lastMsg.content + data.content }];
            } else {
              return [...prev, { role: 'assistant', content: data.content }];
            }
          });
        } else if (data.type === 'done') {
          setIsStreaming(false);
          fetchMessages(selectedId);
        } else if (data.type === 'error') {
          alert(`Error del backend: ${data.content}`);
          setIsStreaming(false);
        }
      };

      return () => {
        wsRef.current?.close();
      };
    }
  }, [selectedId]);


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedId || isStreaming) return;

    setMessages(prev => [...prev, { role: 'user', content: inputText }]);
    setIsStreaming(true);
    
    const systemPrompt = localStorage.getItem('system_prompt_content') || 'Responde conciso. Máximo 2 párrafos.';
    
    wsRef.current?.send(JSON.stringify({
      conversationId: selectedId,
      text: inputText,
      token,
      systemPrompt
    }));
    
    setInputText('');
  };

  const currentConv = conversations.find(c => c.id === selectedId);
  const currentRating = currentConv?.rating || 0;

  return (
    <div className="h-[calc(100vh-4rem)] flex gap-6">
      <div className="w-1/3 bg-surface rounded-lg shadow-sm border border-border flex flex-col overflow-hidden">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h2 className="font-semibold text-primary">Historial</h2>
          <button 
            onClick={createConversation}
            className="p-2 bg-accent/10 text-accent hover:bg-accent/20 rounded-md transition-colors"
          >
            <Plus size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {conversations.map(conv => (
            <button
              key={conv.id}
              onClick={() => setSelectedId(conv.id)}
              className={`w-full text-left p-3 mb-2 rounded-md transition-colors ${
                selectedId === conv.id ? 'bg-primary text-white' : 'hover:bg-slate-50 text-secondary'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="font-medium">Chat #{conv.id}</span>
                <span className="text-xs opacity-70">
                  {new Date(conv.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between items-center mt-2 text-sm">
                <span>{conv.status}</span>
                {conv.rating && <span className="flex items-center gap-1"><Star size={14} className="fill-current"/> {conv.rating}</span>}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="w-2/3 bg-surface rounded-lg shadow-sm border border-border flex flex-col overflow-hidden">
        {selectedId ? (
          <>
            <div className="p-4 border-b border-border flex justify-between items-center bg-slate-50">
              <h2 className="font-semibold text-primary">Chat #{selectedId}</h2>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <button 
                    key={star} 
                    onClick={() => rateConversation(star)}
                    className="text-yellow-400 hover:scale-110 transition-transform"
                  >
                    <Star size={20} className={star <= currentRating ? "fill-current" : ""} />
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-secondary mt-10">Envía un mensaje para comenzar la simulación.</div>
              )}
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-accent text-white' : 'bg-primary text-white'}`}>
                    {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div className={`max-w-[75%] p-3 rounded-lg ${msg.role === 'user' ? 'bg-accent text-white rounded-tr-none' : 'bg-slate-100 text-primary rounded-tl-none'}`}>
                    <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={sendMessage} className="p-4 border-t border-border bg-white flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Escribe un mensaje..."
                disabled={isStreaming}
                className="flex-1 px-4 py-2 border border-border rounded-md focus:outline-none focus:border-accent disabled:opacity-50"
              />
              <button 
                type="submit"
                disabled={isStreaming || !inputText.trim()}
                className="px-4 py-2 bg-accent text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                <Send size={20} />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-secondary">
            Selecciona o crea una conversación en el panel izquierdo.
          </div>
        )}
      </div>
    </div>
  );
}