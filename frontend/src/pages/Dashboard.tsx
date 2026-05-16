import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MessageSquare, ThumbsUp, Clock, CalendarDays } from 'lucide-react';

interface Conversation {
  id: number;
  rating: number | null;
  created_at: string;
  duration_seconds: number;
}

const API = () => `http://${window.location.hostname}:4000`;

export default function Dashboard() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [avgResponseTime, setAvgResponseTime] = useState('0');
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

    const fetchAvgTime = async () => {
      const res = await fetch(`${API()}/analytics/avg-response-time`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setAvgResponseTime(json.avg_seconds);
      }
    };

    fetchData();
    fetchAvgTime();
  }, [token]);

  // Time helpers
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const todayConvs = conversations.filter(c => new Date(c.created_at) >= startOfDay).length;
  const weekConvs = conversations.filter(c => new Date(c.created_at) >= startOfWeek).length;
  const monthConvs = conversations.filter(c => new Date(c.created_at) >= startOfMonth).length;
  const totalConvs = conversations.length;

  // Satisfaction rate
  const rated = conversations.filter(c => c.rating !== null);
  const satisfactory = rated.filter(c => c.rating! >= 4).length;
  const satisfactionRate = rated.length > 0 ? Math.round((satisfactory / rated.length) * 100) : 0;

  // Chart: volume per day (last 14 days)
  const chartData: { name: string; chats: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dayStr = d.toLocaleDateString('es-CL', { month: 'short', day: 'numeric' });
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const count = conversations.filter(c => {
      const ct = new Date(c.created_at);
      return ct >= dayStart && ct < dayEnd;
    }).length;
    chartData.push({ name: dayStr, chats: count });
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-primary">Resumen</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface p-5 rounded-lg shadow-sm border border-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-secondary">Total Conversaciones</h3>
            <div className="p-2 bg-blue-50 rounded-md">
              <MessageSquare size={16} className="text-accent" />
            </div>
          </div>
          <p className="text-3xl font-bold text-primary">{totalConvs}</p>
          <div className="flex gap-3 mt-3 text-xs text-secondary">
            <span className="px-2 py-0.5 bg-slate-100 rounded">Hoy: {todayConvs}</span>
            <span className="px-2 py-0.5 bg-slate-100 rounded">Semana: {weekConvs}</span>
            <span className="px-2 py-0.5 bg-slate-100 rounded">Mes: {monthConvs}</span>
          </div>
        </div>

        <div className="bg-surface p-5 rounded-lg shadow-sm border border-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-secondary">Satisfaccion</h3>
            <div className="p-2 bg-green-50 rounded-md">
              <ThumbsUp size={16} className="text-green-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-primary">{satisfactionRate}%</p>
          <p className="text-xs text-secondary mt-3">
            {satisfactory} de {rated.length} calificadas con 4 o mas estrellas
          </p>
        </div>

        <div className="bg-surface p-5 rounded-lg shadow-sm border border-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-secondary">Tiempo Medio Respuesta</h3>
            <div className="p-2 bg-orange-50 rounded-md">
              <Clock size={16} className="text-orange-500" />
            </div>
          </div>
          <p className="text-3xl font-bold text-primary">{avgResponseTime}s</p>
          <p className="text-xs text-secondary mt-3">
            Promedio que tarda la IA en responder
          </p>
        </div>

        <div className="bg-surface p-5 rounded-lg shadow-sm border border-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-secondary">Periodo Actual</h3>
            <div className="p-2 bg-purple-50 rounded-md">
              <CalendarDays size={16} className="text-purple-500" />
            </div>
          </div>
          <p className="text-lg font-bold text-primary mt-1">
            {now.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}
          </p>
          <p className="text-xs text-secondary mt-3">
            Ultimos 14 dias en el grafico
          </p>
        </div>
      </div>

      {/* Trend Chart */}
      <div className="bg-surface p-6 rounded-lg shadow-sm border border-border h-96 flex flex-col">
        <h2 className="font-semibold text-primary mb-6 shrink-0">Volumen de chats por dia</h2>
        <div className="flex-1 min-h-0 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} dy={10} />
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