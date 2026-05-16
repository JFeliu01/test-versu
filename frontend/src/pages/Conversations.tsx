import { useState, useEffect, useRef } from 'react';
import { Plus, Send, User, Bot, Star, ArrowLeft, ChevronLeft, ChevronRight, Filter } from 'lucide-react';

interface Conversation {
  id: number;
  channel: string;
  status: string;
  rating: number | null;
  created_at: string;
  duration_seconds: number;
}

interface Message {
  id?: number;
  role: string;
  content: string;
}

const API = () => `http://${window.location.hostname}:4000`;
const WS = () => `ws://${window.location.hostname}:4000`;

export default function Conversations() {
  // Table state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 10;

  // Filters
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [filterRating, setFilterRating] = useState('Todos');
  const [filterChannel, setFilterChannel] = useState('Todos');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  // Chat detail state
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const token = localStorage.getItem('token');

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const fetchConversations = async (p = page) => {
    const params = new URLSearchParams({ page: String(p), limit: String(limit) });
    if (filterStatus !== 'Todos') params.append('status', filterStatus);
    if (filterRating !== 'Todos') params.append('rating_min', filterRating);
    if (filterChannel !== 'Todos') params.append('channel', filterChannel);
    if (filterDateFrom) params.append('date_from', filterDateFrom);
    if (filterDateTo) params.append('date_to', filterDateTo);

    const res = await fetch(`${API()}/conversations?${params}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const json = await res.json();
      setConversations(json.data);
      setTotal(json.total);
    }
  };

  const fetchMessages = async (id: number) => {
    const res = await fetch(`${API()}/conversations/${id}/messages`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) setMessages(await res.json());
  };

  const createConversation = async () => {
    const res = await fetch(`${API()}/conversations`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const newConv = await res.json();
      setSelectedId(newConv.id);
    }
  };

  const rateConversation = async (rating: number) => {
    if (!selectedId) return;
    await fetch(`${API()}/conversations/${selectedId}/rating`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ rating })
    });
    fetchConversations(page);
  };

  // Fetch conversations on mount and when filters/page change
  useEffect(() => {
    fetchConversations(page);
  }, [page, filterStatus, filterRating, filterChannel, filterDateFrom, filterDateTo]);

  // Real-time WebSocket listener for new conversations from other tabs/users
  useEffect(() => {
    const ws = new WebSocket(WS());
    wsRef.current = ws;

    ws.onopen = () => {
      // Send a ping with token so server tags this connection with orgId
      ws.send(JSON.stringify({ type: 'register', token }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'new_conversation') {
        // A new conversation appeared in the org, refresh the table
        fetchConversations(page);
      }

      // Chat streaming handlers
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
        if (selectedId) fetchMessages(selectedId);
      } else if (data.type === 'error') {
        alert(`Error del backend: ${data.content}`);
        setIsStreaming(false);
      }
    };

    return () => ws.close();
  }, [page, selectedId]);

  // Load messages when a conversation is selected
  useEffect(() => {
    if (selectedId) fetchMessages(selectedId);
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

  const applyFilters = () => {
    setPage(1);
    fetchConversations(1);
  };

  const formatDuration = (s: number) => {
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}m ${sec}s`;
  };

  const renderStars = (rating: number | null) => {
    if (!rating) return <span className="text-secondary text-sm">-</span>;
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(s => (
          <Star key={s} size={14} className={s <= rating ? "text-yellow-400 fill-current" : "text-gray-300"} />
        ))}
      </div>
    );
  };

  const currentConv = conversations.find(c => c.id === selectedId);
  const currentRating = currentConv?.rating || 0;

  // If a conversation is selected, show the chat detail view
  if (selectedId) {
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => { setSelectedId(null); fetchConversations(page); }}
            className="p-2 hover:bg-slate-100 rounded-md transition-colors text-secondary"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold text-primary">Chat #{selectedId}</h1>
          <div className="flex gap-1 ml-auto">
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

        <div className="flex-1 bg-surface rounded-lg shadow-sm border border-border flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-secondary mt-10">Envia un mensaje para comenzar la simulacion.</div>
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
        </div>
      </div>
    );
  }

  // Table view (default)
  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-primary">Conversaciones</h1>
          <p className="text-secondary text-sm mt-1">Gestiona y analiza todas las conversaciones</p>
        </div>
        <button
          onClick={createConversation}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          <Plus size={18} />
          Crear nueva conversacion
        </button>
      </div>

      {/* Filters */}
      <div className="bg-surface p-5 rounded-lg shadow-sm border border-border">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={16} className="text-secondary" />
          <h2 className="font-semibold text-primary text-sm">Filtros</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <label className="text-xs text-secondary block mb-1">Estado</label>
            <select
              value={filterStatus}
              onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:border-accent bg-white"
            >
              <option>Todos</option>
              <option>Abierta</option>
              <option>Cerrada</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-secondary block mb-1">Rating minimo</label>
            <select
              value={filterRating}
              onChange={e => { setFilterRating(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:border-accent bg-white"
            >
              <option>Todos</option>
              <option value="1">1+</option>
              <option value="2">2+</option>
              <option value="3">3+</option>
              <option value="4">4+</option>
              <option value="5">5</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-secondary block mb-1">Canal</label>
            <select
              value={filterChannel}
              onChange={e => { setFilterChannel(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:border-accent bg-white"
            >
              <option>Todos</option>
              <option>Web</option>
              <option>WhatsApp</option>
              <option>Instagram</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-secondary block mb-1">Desde</label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={e => { setFilterDateFrom(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:border-accent bg-white"
            />
          </div>
          <div>
            <label className="text-xs text-secondary block mb-1">Hasta</label>
            <input
              type="date"
              value={filterDateTo}
              onChange={e => { setFilterDateTo(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:border-accent bg-white"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-lg shadow-sm border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold text-primary">Lista de Conversaciones</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50">
                <th className="text-left px-4 py-3 font-medium text-secondary">ID</th>
                <th className="text-left px-4 py-3 font-medium text-secondary">Fecha de inicio</th>
                <th className="text-left px-4 py-3 font-medium text-secondary">Duracion</th>
                <th className="text-left px-4 py-3 font-medium text-secondary">Estado</th>
                <th className="text-left px-4 py-3 font-medium text-secondary">Canal</th>
                <th className="text-left px-4 py-3 font-medium text-secondary">Rating</th>
                <th className="text-left px-4 py-3 font-medium text-secondary">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {conversations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-secondary">No se encontraron conversaciones</td>
                </tr>
              ) : (
                conversations.map(conv => (
                  <tr key={conv.id} className="border-b border-border hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-primary">CONV-{String(conv.id).padStart(3, '0')}</td>
                    <td className="px-4 py-3 text-secondary">{new Date(conv.created_at).toLocaleString('es-CL', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="px-4 py-3 text-secondary">{formatDuration(conv.duration_seconds)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        conv.status === 'Abierta'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {conv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        conv.channel === 'Web' ? 'bg-blue-100 text-blue-700' :
                        conv.channel === 'WhatsApp' ? 'bg-green-100 text-green-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {conv.channel}
                      </span>
                    </td>
                    <td className="px-4 py-3">{renderStars(conv.rating)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelectedId(conv.id)}
                        className="text-accent hover:underline text-sm font-medium"
                      >
                        Ver detalles
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-slate-50">
          <span className="text-sm text-secondary">
            Mostrando {conversations.length} de {total} conversaciones
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm text-primary font-medium px-2">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}