import React from 'react';

export type RepairStatus = 'eingegangen' | 'in_reparatur' | 'fertig' | 'abgeholt';

export const getStatusText = (status: string): string => {
  switch (status) {
    case 'eingegangen':
      return 'Eingegangen';
    case 'in_reparatur':
      return 'In Reparatur';
    case 'fertig':
      return 'Fertig';
    case 'abgeholt':
      return 'Abgeholt';
    default:
      return status;
  }
};

export const getStatusBadge = (status: string) => {
  return (
    <span className={`status-badge status-${status}`}>
      {getStatusText(status)}
    </span>
  );
};
