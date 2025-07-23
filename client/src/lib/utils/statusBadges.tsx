import React from 'react';

export type RepairStatus = 'eingegangen' | 'in_reparatur' | 'fertig' | 'abgeholt';

export const getStatusText = (status: string): string => {
  switch (status) {
    case 'eingegangen':
      return 'Eingegangen';
    case 'in_reparatur':
      return 'In Reparatur';
    case 'ersatzteile_bestellen':
      return 'Ersatzteile bestellen';
    case 'warten_auf_ersatzteile':
      return 'Warten auf Ersatzteile';
    case 'ersatzteil_eingetroffen':
      return 'Ersatzteil eingetroffen';
    case 'ausser_haus':
      return 'Außer Haus';
    case 'fertig':
      return 'Fertig';
    case 'abgeholt':
      return 'Abgeholt';
    default:
      return status;
  }
};

export const getStatusBadge = (status: string) => {
  const badgeClasses = 'px-2 py-1 rounded-md text-xs font-normal';
  
  switch (status) {
    case 'eingegangen':
      return <span className={`${badgeClasses} bg-yellow-100 text-amber-700`}>{getStatusText(status)}</span>;
    case 'in_reparatur':
      return <span className={`${badgeClasses} bg-blue-100 text-blue-700`}>{getStatusText(status)}</span>;
    case 'ersatzteile_bestellen':
      return <span className={`${badgeClasses} bg-orange-100 text-orange-700`}>{getStatusText(status)}</span>;
    case 'warten_auf_ersatzteile':
      return <span className={`${badgeClasses} bg-amber-100 text-amber-700`}>{getStatusText(status)}</span>;
    case 'ersatzteil_eingetroffen':
      return <span className={`${badgeClasses} bg-indigo-100 text-indigo-700`}>{getStatusText(status)}</span>;
    case 'ausser_haus':
      return <span className={`${badgeClasses} bg-purple-100 text-purple-700`}>{getStatusText(status)}</span>;
    case 'fertig':
      return <span className={`${badgeClasses} bg-green-100 text-green-700`}>{getStatusText(status)}</span>;
    case 'abgeholt':
      return <span className={`${badgeClasses} bg-gray-100 text-gray-700`}>{getStatusText(status)}</span>;
    default:
      return <span className={`${badgeClasses} bg-gray-100 text-gray-700`}>{getStatusText(status)}</span>;
  }
};
