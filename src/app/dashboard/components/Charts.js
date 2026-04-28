'use client';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

export default function AnalyticsChart({ type = 'bar', data, title, xKey, series = [], height = 300 }) {
  if (!data || data.length === 0) {
    return (
      <div className='bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-center items-center h-64'>
        <h3 className='text-sm font-semibold text-slate-700 mb-2'>{title}</h3>
        <p className='text-slate-400 text-sm'>No data available for visualization.</p>
      </div>
    );
  }

  const ChartComponent = type === 'line' ? LineChart : BarChart;
  const DataComponent = type === 'line' ? Line : Bar;

  return (
    <div className='bg-white p-4 rounded-lg border border-slate-500 shadow-sm'>
      <h3 className='text-md font-semibold text-slate-800 mb-4'>{title}</h3>
      <div style={{ width: '100%', height: height }}>
        <ResponsiveContainer>
          <ChartComponent data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray='3 3' stroke='#f1f5f9' vertical={false} />
            <XAxis dataKey={xKey} tick={{ fill: '#64748b', fontSize: 12 }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} />
            <Tooltip 
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '13px' }} />
            
            {series.map((s, idx) => (
              <DataComponent
                key={idx}
                type='monotone' // for line
                dataKey={s.dataKey}
                name={s.name || s.dataKey}
                fill={s.color}
                stroke={s.color}
                activeBar={{ fill: `${s.color}dd` }}
                radius={type === 'bar' ? [4, 4, 0, 0] : 0}
                strokeWidth={2}
                dot={{ strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
            ))}
          </ChartComponent>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
