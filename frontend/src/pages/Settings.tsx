import { useState, useEffect } from 'react';
import { Bot } from 'lucide-react';

const PREDEFINED_PROMPTS = [
  { 
    id: 'default', 
    title: 'Mentor Directo', 
    content: 'Hablas como un profesional moderno y directo. Nada de rodeos ni formalidades excesivas. Vas al grano con energía y usas analogías prácticas. Evita a toda costa sonar como un asistente virtual o IA; sé un mentor pragmático que da respuestas cortas y útiles.' 
  },
  { 
    id: 'amigo', 
    title: 'Amigo Sincero', 
    content: 'Eres un amigo de confianza y honesto. Hablas con muchísima naturalidad, como si estuvieras en un chat de WhatsApp. Cero introducciones robóticas tipo "¡Claro, te ayudo con eso!". Simplemente responde directo al punto, con calidez y como un humano real.' 
  },
  { 
    id: 'esceptico', 
    title: 'El Escéptico Agudo', 
    content: 'Tienes un tono ligeramente irónico pero muy brillante. Cuestionas las ideas y prefieres la lógica a las emociones. Hablas como alguien experimentado que no se sorprende fácil. Eres conciso, agudo, cero entusiasta, nunca usas emojis y evitas las disculpas.' 
  },
  { 
    id: 'creativo', 
    title: 'Creativo Apasionado', 
    content: 'Tu mente va a mil por hora. Hablas con muchísima pasión y conectas ideas inesperadas. Odias la estructura rígida (nunca uses listas con viñetas aburridas), prefieres dar respuestas fluidas usando metáforas visuales y artísticas. Suenas muy humano e inspirado.' 
  }
];

export default function Settings() {
  const [selectedId, setSelectedId] = useState('default');

  useEffect(() => {
    const saved = localStorage.getItem('system_prompt_id');
    if (saved) {
      setSelectedId(saved);
    } else {
      localStorage.setItem('system_prompt_id', 'default');
      localStorage.setItem('system_prompt_content', PREDEFINED_PROMPTS[0].content);
    }
  }, []);

  const handleSelect = (id: string, content: string) => {
    setSelectedId(id);
    localStorage.setItem('system_prompt_id', id);
    localStorage.setItem('system_prompt_content', content);
  };

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-primary mb-6">Configuración de Agente IA</h1>
      
      <div className="bg-surface p-6 rounded-lg shadow-sm border border-border">
        <h2 className="font-semibold text-primary mb-2 flex items-center gap-2">
          <Bot size={20} className="text-accent" />
          Personalidad del Agente (System Prompt)
        </h2>
        <p className="text-secondary text-sm mb-6">
          Selecciona cómo quieres que la IA se comporte al responder los mensajes en los nuevos chats.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PREDEFINED_PROMPTS.map((prompt) => (
            <button
              key={prompt.id}
              onClick={() => handleSelect(prompt.id, prompt.content)}
              className={`text-left p-4 rounded-lg border-2 transition-all ${
                selectedId === prompt.id 
                  ? 'border-accent bg-blue-50/50' 
                  : 'border-border hover:border-slate-300'
              }`}
            >
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium text-primary">{prompt.title}</h3>
                {selectedId === prompt.id && (
                  <span className="text-xs font-bold text-accent bg-blue-100 px-2 py-1 rounded-full">
                    Activo
                  </span>
                )}
              </div>
              <p className="text-sm text-secondary">"{prompt.content}"</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}