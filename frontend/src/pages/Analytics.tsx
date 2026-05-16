import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Star, TrendingDown } from 'lucide-react';

interface Conversation {
  id: number;
  channel: string;
  rating: number | null;
}

interface WorstPrompt {
  prompt: string;
  rating: number;
  conversation_id: number;
  created_at: string;
}

const CHANNEL_COLORS: Record<string, string> = {
  Web: '#3B82F6',
  WhatsApp: '#10B981',
  Instagram: '#F59E0B',
};

const API = () => `http://${window.location.hostname}:4000`;

export default function Analytics() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [worstPrompts, setWorstPrompts] = useState<WorstPrompt[]>([]);
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch(`${API()}/conversations?limit=1000`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setConversations(json.data || json);
      }
    };

    const fetchWorstPrompts = async () => {
      const res = await fetch(`${API()}/analytics/worst-prompts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setWorstPrompts(await res.json());
      }
    };

    fetchData();
    fetchWorstPrompts();
  }, [token]);

  // Rating histogram data (as percentages)
  const rated = conversations.filter(c => c.rating !== null);
  const ratingData = [1, 2, 3, 4, 5].map(star => {
    const count = rated.filter(c => c.rating === star).length;
    const pct = rated.length > 0 ? Math.round((count / rated.length) * 100) : 0;
    return {
      rating: `${star} Estrella${star > 1 ? 's' : ''}`,
      porcentaje: pct,
      cantidad: count
    };
  });

  // Pie chart: real channel counts from DB
  const channelCounts = conversations.reduce((acc, curr) => {
    const ch = curr.channel || 'Web';
    acc[ch] = (acc[ch] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(channelCounts).map(([name, value]) => ({ name, value }));
  const totalConvs = pieData.reduce((sum, d) => sum + d.value, 0);

  const renderStars = (rating: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} size={14} className={s <= rating ? "text-yellow-400 fill-current" : "text-gray-300"} />
      ))}
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-primary">Analytics</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Rating Distribution Histogram */}
        <div className="bg-surface p-6 rounded-lg shadow-sm border border-border flex flex-col">
          <h2 className="font-semibold text-primary mb-4">Distribucion de Satisfaccion</h2>
          <p className="text-xs text-secondary mb-4">{rated.length} conversaciones calificadas</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ratingData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="rating" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} allowDecimals={false} tick={{ fontSize: 11 }} unit="%" />
                <RechartsTooltip
                  cursor={{ fill: '#F1F5F9' }}
                  formatter={(value: number, name: string, props: any) => [`${value}% (${props.payload.cantidad})`, 'Porcentaje']}
                />
                <Bar dataKey="porcentaje" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Channel Pie Chart */}
        <div className="bg-surface p-6 rounded-lg shadow-sm border border-border flex flex-col">
          <h2 className="font-semibold text-primary mb-4">Distribucion por Canal</h2>
          <p className="text-xs text-secondary mb-4">{totalConvs} conversaciones totales</p>
          <div className="h-72 flex items-center justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={CHANNEL_COLORS[entry.name] || '#94A3B8'} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value: number) => [`${value} conversaciones`, 'Total']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-secondary text-sm">Sin datos de canales</p>
            )}
          </div>
          <div className="flex justify-center gap-4 mt-2 text-sm">
            {pieData.map(entry => (
              <div key={entry.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHANNEL_COLORS[entry.name] || '#94A3B8' }}></div>
                <span className="text-secondary">{entry.name} ({entry.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Worst Prompts Table */}
      <div className="bg-surface rounded-lg shadow-sm border border-border overflow-hidden">
        <div className="p-4 border-b border-border flex items-center gap-2">
          <TrendingDown size={18} className="text-red-500" />
          <h2 className="font-semibold text-primary">Top 5 Prompts con Peor Rating</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50">
                <th className="text-left px-4 py-3 font-medium text-secondary w-8">#</th>
                <th className="text-left px-4 py-3 font-medium text-secondary">Primer Mensaje del Usuario</th>
                <th className="text-left px-4 py-3 font-medium text-secondary">Conversacion</th>
                <th className="text-left px-4 py-3 font-medium text-secondary">Fecha</th>
                <th className="text-left px-4 py-3 font-medium text-secondary">Rating</th>
              </tr>
            </thead>
            <tbody>
              {worstPrompts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-secondary">
                    No hay conversaciones calificadas todavia
                  </td>
                </tr>
              ) : (
                worstPrompts.map((wp, idx) => (
                  <tr key={wp.conversation_id} className="border-b border-border hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 text-secondary font-medium">{idx + 1}</td>
                    <td className="px-4 py-3 text-primary max-w-xs truncate">{wp.prompt}</td>
                    <td className="px-4 py-3 text-secondary font-medium">CONV-{String(wp.conversation_id).padStart(3, '0')}</td>
                    <td className="px-4 py-3 text-secondary">
                      {new Date(wp.created_at).toLocaleDateString('es-CL', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                    </td>
                    <td className="px-4 py-3">{renderStars(wp.rating)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}