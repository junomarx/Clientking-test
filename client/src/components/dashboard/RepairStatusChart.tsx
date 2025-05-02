import React from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  Tooltip, Legend 
} from 'recharts';
import { motion } from 'framer-motion';

interface RepairStatusChartProps {
  stats: {
    inRepair: number;
    readyForPickup: number;
    outsourced: number;
    completed: number;
  };
}

const COLORS = ['#3b82f6', '#10b981', '#6366f1', '#8b5cf6'];
const STATUS_LABELS = {
  inRepair: 'In Reparatur',
  readyForPickup: 'Abholbereit',
  outsourced: 'Außer Haus',
  completed: 'Abgeschlossen'
};

export function RepairStatusChart({ stats }: RepairStatusChartProps) {
  const data = [
    { name: STATUS_LABELS.inRepair, value: stats.inRepair },
    { name: STATUS_LABELS.readyForPickup, value: stats.readyForPickup },
    { name: STATUS_LABELS.outsourced, value: stats.outsourced },
    { name: STATUS_LABELS.completed, value: stats.completed },
  ].filter(item => item.value > 0);

  const hasData = data.some(item => item.value > 0);

  // Formatiere die Zahlen für das Tooltip
  const formatTooltip = (value: number) => {
    return `${value} Aufträge`;
  };

  return (
    <motion.div 
      className="bg-white rounded-lg shadow-sm p-5 h-[300px]"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h3 className="text-gray-700 font-semibold mb-4">Auftragsverteilung</h3>
      
      {hasData ? (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              innerRadius={40}
              fill="#8884d8"
              dataKey="value"
              animationBegin={200}
              animationDuration={1500}
              isAnimationActive={true}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={formatTooltip} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-full items-center justify-center text-gray-400">
          Keine Daten verfügbar
        </div>
      )}
    </motion.div>
  );
}