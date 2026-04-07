import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#6366f1', '#22d3ee', '#f59e0b', '#10b981', '#f43f5e', '#8b5cf6', '#ef4444'];

interface BarChartProps {
  data: Array<{ name: string; value: number }>;
  title: string;
  color?: string;
}

export function SimpleBarChart({ data, title, color = '#6366f1' }: BarChartProps) {
  return (
    <div>
      <h3 className="text-sm font-medium text-slate-400 mb-3">{title}</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9' }}
          />
          <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface PieChartProps {
  data: Array<{ name: string; value: number }>;
  title: string;
}

export function SimplePieChart({ data, title }: PieChartProps) {
  const filteredData = data.filter(d => d.value > 0);
  return (
    <div>
      <h3 className="text-sm font-medium text-slate-400 mb-3">{title}</h3>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={filteredData}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={3}
            dataKey="value"
          >
            {filteredData.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9' }}
          />
          <Legend
            formatter={(value) => <span style={{ color: '#94a3b8', fontSize: '12px' }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
