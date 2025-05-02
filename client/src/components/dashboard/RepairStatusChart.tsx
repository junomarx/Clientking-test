import React from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  Tooltip, Legend 
} from 'recharts';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';

interface RepairStatusChartProps {
  stats: {
    inRepair: number;
    readyForPickup: number;
    outsourced: number;
    completed: number;
  };
  variant?: 'default' | 'modern';
}

const COLORS = ['#3b82f6', '#10b981', '#6366f1', '#8b5cf6'];
const STATUS_LABELS = {
  inRepair: 'In Reparatur',
  readyForPickup: 'Abholbereit',
  outsourced: 'Außer Haus',
  completed: 'Abgeschlossen'
};

// Moderne Version des Reparaturstatus-Diagramms mit farbigem Rand
export function ModernRepairStatusChart({ total }: { total: number }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Reparaturen nach Status</CardTitle>
        <CardDescription>Übersicht der aktuellen Aufträge</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-center p-6">
        <div className="flex flex-col items-center">
          <div className="relative w-64 h-64">
            {/* Kreisdiagramm mit farbigem Verlauf-Rand */}
            <div 
              className="w-full h-full rounded-full border-[16px]"
              style={{
                borderImage: 'linear-gradient(to bottom, #86efac, #93c5fd, #fef08a, #93c5fd) 1',
              }}
            ></div>
            
            {/* Zentrierter Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <div className="text-5xl font-bold">{total}</div>
              <div className="text-gray-500 text-lg mt-2">Gesamt</div>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="justify-center pt-0 pb-6">
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-blue-200 mr-2"></div>
            <span>In Bearbeitung: 1</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-green-200 mr-2"></div>
            <span>Fertig: 1</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-yellow-200 mr-2"></div>
            <span>Neu: 2</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-purple-200 mr-2"></div>
            <span>Abgeholt: 1</span>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}

export function RepairStatusChart({ stats, variant = 'default' }: RepairStatusChartProps) {
  const data = [
    { name: STATUS_LABELS.inRepair, value: stats.inRepair },
    { name: STATUS_LABELS.readyForPickup, value: stats.readyForPickup },
    { name: STATUS_LABELS.outsourced, value: stats.outsourced },
    { name: STATUS_LABELS.completed, value: stats.completed },
  ].filter(item => item.value > 0);

  const hasData = data.some(item => item.value > 0);
  const total = data.reduce((sum, item) => sum + item.value, 0);

  // Wenn die moderne Variante gewünscht ist, verwenden wir das neue Design
  if (variant === 'modern') {
    return <ModernRepairStatusChart total={total} />;
  }

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