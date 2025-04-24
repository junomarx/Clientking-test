import React from 'react';

interface StatCardProps {
  title: string;
  value: number;
  type?: 'primary' | 'warning' | 'success' | 'info';
}

export function StatCard({ title, value, type = 'primary' }: StatCardProps) {
  const getBorderClass = () => {
    switch (type) {
      case 'warning':
        return 'border-l-4 border-warning';
      case 'success':
        return 'border-l-4 border-success';
      case 'info':
        return 'border-l-4 border-primary-light';
      default:
        return 'border-l-4 border-primary';
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm p-5 ${getBorderClass()}`}>
      <h3 className="text-gray-500 text-sm font-medium mb-2">{title}</h3>
      <div className="text-3xl font-bold">{value}</div>
    </div>
  );
}
