import React from 'react';

interface StatCardProps {
  title: string;
  value: number;
  type?: 'primary' | 'warning' | 'success' | 'info';
  onClick?: () => void;
}

export function StatCard({ title, value, type = 'primary', onClick }: StatCardProps) {
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
    <div 
      className={`bg-white rounded-lg shadow-sm p-5 ${getBorderClass()} ${onClick ? 'cursor-pointer hover:shadow-md transition-all transform hover:-translate-y-1' : ''}`}
      onClick={onClick}
    >
      <h3 className="text-gray-500 text-sm font-medium mb-2">{title}</h3>
      <div className="text-3xl font-bold">{value}</div>
    </div>
  );
}
