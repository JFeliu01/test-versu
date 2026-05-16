export default function Dashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-primary mb-6">Resumen</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface p-6 rounded-lg shadow-sm border border-border">
          <h3 className="text-sm font-medium text-secondary">Total de conversaciones</h3>
          <p className="text-3xl font-bold text-primary mt-2">0</p>
        </div>
        <div className="bg-surface p-6 rounded-lg shadow-sm border border-border">
          <h3 className="text-sm font-medium text-secondary">Satisfacción Promedio</h3>
          <p className="text-3xl font-bold text-primary mt-2">0%</p>
        </div>
        <div className="bg-surface p-6 rounded-lg shadow-sm border border-border">
          <h3 className="text-sm font-medium text-secondary">Tiempo de Respuesta</h3>
          <p className="text-3xl font-bold text-primary mt-2">0s</p>
        </div>
      </div>
    </div>
  );
}