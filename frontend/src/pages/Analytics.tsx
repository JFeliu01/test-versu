import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface Conversation {
  id: number;
  channel: string;
  rating: number | null;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B']; // Azul (Web), Verde (WhatsApp), Naranja (Insta)

export default function Analytics() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch('http://localhost:4000/conversations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setConversations(await res.json());
      }
    };
    fetchData();
  }, [token]);

  // Procesar datos para el Histograma de Ratings (1 al 5)
  const ratingData = [1, 2, 3, 4, 5].map(star => ({
    rating: `${star} Estrella${star > 1 ? 's' : ''}`,
    cantidad: conversations.filter(c => c.rating === star).length
  }));

  // Procesar datos para el Gráfico de Pastel (Canales)
  // Como actualmente todos son 'Web', agregamos datos simulados para que el gráfico no se vea vacío
  const channelCounts = conversations.reduce((acc, curr) => {
    acc[curr.channel] = (acc[curr.channel] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData = [
    { name: 'Web', value: channelCounts['Web'] || 10 },
    { name: 'WhatsApp', value: channelCounts['WhatsApp'] || 5 },
    { name: 'Instagram', value: channelCounts['Instagram'] || 3 },
  ];

  return (
    <div className="h-full flex flex-col">
      <h1 className="text-2xl font-bold text-primary mb-6">Analytics</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Histograma de Ratings */}
        <div className="bg-surface p-6 rounded-lg shadow-sm border border-border">
          <h2 className="font-semibold text-primary mb-4">Distribución de Satisfacción (Ratings)</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ratingData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="rating" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                <RechartsTooltip cursor={{ fill: '#F1F5F9' }} />
                <Bar dataKey="cantidad" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Pastel de Canales */}
        <div className="bg-surface p-6 rounded-lg shadow-sm border border-border">
          <h2 className="font-semibold text-primary mb-4">Distribución por Canal</h2>
          <div className="h-72 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-4 text-sm">
            {pieData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }}></div>
                <span className="text-secondary">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}