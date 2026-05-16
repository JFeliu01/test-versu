import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Conversation {
  id: number;
  rating: number | null;
  created_at: string;
}

export default function Dashboard() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch(`http://${window.location.hostname}:4000/conversations?limit=1000`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setConversations(json.data || json);
      }
    };
    fetchData();
  }, [token]);

  const totalConversations = conversations.length;
  
  const ratedConversations = conversations.filter(c => c.rating !== null);
  const satisfactoryConversations = ratedConversations.filter(c => c.rating! >= 4).length;
  const satisfactionRate = ratedConversations.length > 0 
    ? Math.round((satisfactoryConversations / ratedConversations.length) * 100) 
    : 0;

  const chartData = Object.values(conversations.reduce((acc, curr) => {
    const date = new Date(curr.created_at).toLocaleDateString('es-CL', { month: 'short', day: 'numeric' });
    acc[date] = acc[date] || { name: date, chats: 0 };
    acc[date].chats += 1;
    return acc;
  }, {} as Record<string, { name: string, chats: number }>)).reverse();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-primary">Resumen</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface p-6 rounded-lg shadow-sm border border-border">
          <h3 className="text-sm font-medium text-secondary">Total de conversaciones</h3>
          <p className="text-3xl font-bold text-primary mt-2">{totalConversations}</p>
        </div>
        <div className="bg-surface p-6 rounded-lg shadow-sm border border-border">
          <h3 className="text-sm font-medium text-secondary">Satisfacción (&gt;= 4⭐)</h3>
          <p className="text-3xl font-bold text-primary mt-2">{satisfactionRate}%</p>
        </div>
        <div className="bg-surface p-6 rounded-lg shadow-sm border border-border">
          <h3 className="text-sm font-medium text-secondary">Tiempo Medio Respuesta</h3>
          <p className="text-3xl font-bold text-primary mt-2">1.4s</p>
        </div>
      </div>

      <div className="bg-surface p-6 rounded-lg shadow-sm border border-border h-96 mt-2 flex flex-col">
        <h2 className="font-semibold text-primary mb-6 shrink-0">Volumen de chats en el tiempo</h2>
        <div className="flex-1 min-h-0 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData.length > 0 ? chartData : [{ name: 'Hoy', chats: 0 }]} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} allowDecimals={false} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)' }}
              />
              <Line 
                type="monotone" 
                dataKey="chats" 
                stroke="#3B82F6" 
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}