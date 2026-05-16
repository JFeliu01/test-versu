import { useState, useEffect } from 'react';
import { Bot, Key, User, Building2, Mail, Plus, Trash2, Zap } from 'lucide-react';

interface ApiInfo {
  provider: string;
  model: string;
  endpoint: string;
  apiKey: string;
  status: string;
}

interface UserInfo {
  id: number;
  name: string;
  email: string;
  org_name: string;
}

interface Prompt {
  id: string;
  title: string;
  content: string;
  isCustom?: boolean;
}

const PREDEFINED_PROMPTS: Prompt[] = [
  {
    id: 'default',
    title: 'Mentor Directo',
    content: 'Hablas como un profesional moderno y directo. Nada de rodeos ni formalidades excesivas. Vas al grano con energia y usas analogias practicas. Evita a toda costa sonar como un asistente virtual o IA; se un mentor pragmatico que da respuestas cortas y utiles.'
  },
  {
    id: 'amigo',
    title: 'Amigo Sincero',
    content: 'Eres un amigo de confianza y honesto. Hablas con muchisima naturalidad, como si estuvieras en un chat de WhatsApp. Cero introducciones roboticas tipo "Claro, te ayudo con eso!". Simplemente responde directo al punto, con calidez y como un humano real.'
  },
  {
    id: 'esceptico',
    title: 'El Esceptico Agudo',
    content: 'Tienes un tono ligeramente ironico pero muy brillante. Cuestionas las ideas y prefieres la logica a las emociones. Hablas como alguien experimentado que no se sorprende facil. Eres conciso, agudo, cero entusiasta, nunca usas emojis y evitas las disculpas.'
  },
  {
    id: 'creativo',
    title: 'Creativo Apasionado',
    content: 'Tu mente va a mil por hora. Hablas con muchisima pasion y conectas ideas inesperadas. Odias la estructura rigida (nunca uses listas con vinetas aburridas), prefieres dar respuestas fluidas usando metaforas visuales y artisticas. Suenas muy humano e inspirado.'
  }
];

const API = () => `http://${window.location.hostname}:4000`;

export default function Settings() {
  const [selectedId, setSelectedId] = useState('default');
  const [apiInfo, setApiInfo] = useState<ApiInfo | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [customPrompts, setCustomPrompts] = useState<Prompt[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');

  const token = localStorage.getItem('token');
  const allPrompts = [...PREDEFINED_PROMPTS, ...customPrompts];

  useEffect(() => {
    const saved = localStorage.getItem('system_prompt_id');
    if (saved) {
      setSelectedId(saved);
    } else {
      localStorage.setItem('system_prompt_id', 'default');
      localStorage.setItem('system_prompt_content', PREDEFINED_PROMPTS[0].content);
    }

    const savedCustom = localStorage.getItem('custom_prompts');
    if (savedCustom) {
      setCustomPrompts(JSON.parse(savedCustom));
    }

    fetch(`${API()}/settings/api-info`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.ok ? r.json() : null).then(setApiInfo);

    fetch(`${API()}/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.ok ? r.json() : null).then(setUserInfo);
  }, []);

  const handleSelect = (id: string, content: string) => {
    setSelectedId(id);
    localStorage.setItem('system_prompt_id', id);
    localStorage.setItem('system_prompt_content', content);
  };

  const handleAddPrompt = () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    const newPrompt: Prompt = {
      id: `custom_${Date.now()}`,
      title: newTitle.trim(),
      content: newContent.trim(),
      isCustom: true
    };
    const updated = [...customPrompts, newPrompt];
    setCustomPrompts(updated);
    localStorage.setItem('custom_prompts', JSON.stringify(updated));
    setNewTitle('');
    setNewContent('');
    setShowAddForm(false);
  };

  const handleDeletePrompt = (id: string) => {
    const updated = customPrompts.filter(p => p.id !== id);
    setCustomPrompts(updated);
    localStorage.setItem('custom_prompts', JSON.stringify(updated));
    if (selectedId === id) {
      handleSelect('default', PREDEFINED_PROMPTS[0].content);
    }
  };

  return (
    <div className="max-w-4xl flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-primary">Configuracion</h1>

      {/* User Details */}
      <div className="bg-surface p-6 rounded-lg shadow-sm border border-border">
        <h2 className="font-semibold text-primary mb-4 flex items-center gap-2">
          <User size={18} className="text-accent" />
          Detalles del Usuario
        </h2>
        {userInfo ? (
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center text-accent text-xl font-bold shrink-0">
              {userInfo.name.charAt(0).toUpperCase()}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 flex-1">
              <div>
                <span className="text-xs text-secondary block">Nombre</span>
                <span className="text-sm text-primary font-medium">{userInfo.name}</span>
              </div>
              <div>
                <span className="text-xs text-secondary block">Email</span>
                <span className="text-sm text-primary font-medium flex items-center gap-1">
                  <Mail size={14} className="text-secondary" />
                  {userInfo.email}
                </span>
              </div>
              <div>
                <span className="text-xs text-secondary block">Organizacion</span>
                <span className="text-sm text-primary font-medium flex items-center gap-1">
                  <Building2 size={14} className="text-secondary" />
                  {userInfo.org_name}
                </span>
              </div>
              <div>
                <span className="text-xs text-secondary block">ID</span>
                <span className="text-sm text-primary font-medium">#{userInfo.id}</span>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-secondary text-sm">Cargando informacion del usuario...</p>
        )}
      </div>

      {/* API Connection Info */}
      <div className="bg-surface p-6 rounded-lg shadow-sm border border-border">
        <h2 className="font-semibold text-primary mb-4 flex items-center gap-2">
          <Key size={18} className="text-accent" />
          Conexion a la API de IA
        </h2>
        {apiInfo ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="text-xs text-secondary block mb-1">Proveedor</span>
              <div className="px-3 py-2 bg-slate-50 border border-border rounded-md text-sm text-primary">{apiInfo.provider}</div>
            </div>
            <div>
              <span className="text-xs text-secondary block mb-1">Modelo</span>
              <div className="px-3 py-2 bg-slate-50 border border-border rounded-md text-sm text-primary">{apiInfo.model}</div>
            </div>
            <div>
              <span className="text-xs text-secondary block mb-1">Endpoint</span>
              <div className="px-3 py-2 bg-slate-50 border border-border rounded-md text-sm text-primary truncate">{apiInfo.endpoint}</div>
            </div>
            <div>
              <span className="text-xs text-secondary block mb-1">API Key</span>
              <div className="px-3 py-2 bg-slate-50 border border-border rounded-md text-sm text-primary font-mono">{apiInfo.apiKey}</div>
            </div>
            <div className="sm:col-span-2">
              <span className="text-xs text-secondary block mb-1">Estado</span>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${apiInfo.status === 'Conectado' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm text-primary font-medium">{apiInfo.status}</span>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-secondary text-sm">Cargando informacion de la API...</p>
        )}
      </div>

      {/* Personality Selection */}
      <div className="bg-surface p-6 rounded-lg shadow-sm border border-border">
        <div className="flex justify-between items-start mb-2">
          <h2 className="font-semibold text-primary flex items-center gap-2">
            <Bot size={18} className="text-accent" />
            Personalidad del Agente (System Prompt)
          </h2>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-accent/10 text-accent rounded-md hover:bg-accent/20 transition-colors"
          >
            <Plus size={14} />
            Agregar
          </button>
        </div>
        <p className="text-secondary text-sm mb-6">
          Selecciona como quieres que la IA se comporte al responder los mensajes en los nuevos chats.
        </p>

        {/* Add custom prompt form */}
        {showAddForm && (
          <div className="mb-6 p-4 border-2 border-dashed border-accent/30 rounded-lg bg-blue-50/30">
            <h3 className="text-sm font-medium text-primary mb-3">Nueva personalidad</h3>
            <input
              type="text"
              placeholder="Titulo de la personalidad"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md text-sm mb-3 focus:outline-none focus:border-accent"
            />
            <textarea
              placeholder="Describe como debe comportarse la IA..."
              value={newContent}
              onChange={e => setNewContent(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-md text-sm mb-3 focus:outline-none focus:border-accent resize-none"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setShowAddForm(false); setNewTitle(''); setNewContent(''); }}
                className="px-3 py-1.5 text-sm text-secondary hover:text-primary transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddPrompt}
                disabled={!newTitle.trim() || !newContent.trim()}
                className="px-3 py-1.5 text-sm bg-accent text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                Guardar
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {allPrompts.map((prompt) => (
            <div
              key={prompt.id}
              onClick={() => handleSelect(prompt.id, prompt.content)}
              className={`text-left p-4 rounded-lg border-2 transition-all cursor-pointer relative group ${
                selectedId === prompt.id
                  ? 'border-accent bg-blue-50/50'
                  : 'border-border hover:border-slate-300'
              }`}
            >
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium text-primary flex items-center gap-2">
                  {prompt.title}
                  {prompt.isCustom && (
                    <span className="text-xs text-secondary bg-slate-100 px-1.5 py-0.5 rounded">Custom</span>
                  )}
                </h3>
                <div className="flex items-center gap-1">
                  {prompt.isCustom && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeletePrompt(prompt.id); }}
                      className="p-1 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                  {selectedId === prompt.id && (
                    <span className="text-xs font-bold text-accent bg-blue-100 px-2 py-1 rounded-full flex items-center gap-1">
                      <Zap size={10} />
                      Activo
                    </span>
                  )}
                </div>
              </div>
              <p className="text-sm text-secondary">"{prompt.content}"</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}