import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Printer, Info } from 'lucide-react';
import { getStatusBadge } from '@/lib/utils';

interface RepairWithCustomer {
  id: number;
  orderCode?: string | null;
  customerName: string;
  model: string;
  status: string;
  createdAt: string;
}

interface AnimatedRecentOrdersProps {
  repairs: RepairWithCustomer[];
  isLoading: boolean;
  onPrintClick: (repairId: number) => void;
  onStatusChange?: (id: number, currentStatus: string) => void;
  onEdit?: (id: number) => void;
  onRepairClick?: (repairId: number) => void;
}

export function AnimatedRecentOrders({ 
  repairs, 
  isLoading, 
  onPrintClick,
  onStatusChange,
  onEdit,
  onRepairClick
}: AnimatedRecentOrdersProps) {
  // Funktion zum Öffnen der Reparaturseite mit Details
  const handleRepairClick = (repairId: number) => {
    if (onRepairClick) {
      onRepairClick(repairId);
    }
  };
  return (
    <motion.div
      className="bg-white overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Moderne Tabelle mit Superadmin-Stil für Desktop */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="py-3 px-4 text-left font-medium text-muted-foreground">Auftrag</th>
              <th className="py-3 px-4 text-left font-medium text-muted-foreground">Kunde</th>
              <th className="py-3 px-4 text-left font-medium text-muted-foreground">Gerät</th>
              <th className="py-3 px-4 text-left font-medium text-muted-foreground">Status</th>
              <th className="py-3 px-4 text-left font-medium text-muted-foreground">Datum</th>
              <th className="py-3 px-4 text-left font-medium text-muted-foreground">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-muted-foreground">
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      Lädt Daten...
                    </motion.div>
                  </td>
                </tr>
              ) : repairs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-muted-foreground">
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      Keine Reparaturen vorhanden
                    </motion.div>
                  </td>
                </tr>
              ) : (
                repairs.map((repair, index) => (
                  <motion.tr 
                    key={repair.id} 
                    className="border-b hover:bg-muted/30 transition-all cursor-pointer"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ 
                      duration: 0.3,
                      delay: index * 0.05,
                      ease: "easeOut"
                    }}
                    onClick={() => handleRepairClick(repair.id)}
                  >
                    <td className="py-3 px-4 font-medium">
                      <motion.div whileHover={{ scale: 1.05 }}>
                        {repair.orderCode || `#${repair.id}`}
                      </motion.div>
                    </td>
                    <td className="py-3 px-4">{repair.customerName}</td>
                    <td className="py-3 px-4">{repair.model}</td>
                    <td className="py-3 px-4">
                      {getStatusBadge(repair.status)}
                    </td>
                    <td className="py-3 px-4">
                      {new Date(repair.createdAt).toLocaleDateString('de-DE')}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex space-x-2">
                        <motion.button 
                          className="text-gray-600 hover:text-gray-800 p-1 rounded-full hover:bg-muted"
                          title="Druckoptionen anzeigen"
                          onClick={(e) => {
                            e.stopPropagation();
                            onPrintClick(repair.id);
                          }}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <Printer className="h-4 w-4" />
                        </motion.button>
                        <motion.button 
                          className="text-blue-600 hover:text-blue-800 p-1 rounded-full hover:bg-blue-50"
                          title="Details anzeigen"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRepairClick(repair.id);
                          }}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <Info className="h-4 w-4" />
                        </motion.button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
      
      {/* Mobile Karten-Ansicht im Superadmin-Stil */}
      <div className="md:hidden space-y-3 px-4 py-3">
        {isLoading ? (
          <div className="py-4 text-center text-muted-foreground">Lädt Daten...</div>
        ) : repairs.length === 0 ? (
          <div className="py-4 text-center text-muted-foreground">Keine Reparaturen vorhanden</div>
        ) : (
          repairs.map((repair, index) => (
            <motion.div 
              key={repair.id} 
              className="border rounded-lg overflow-hidden cursor-pointer" 
              onClick={() => handleRepairClick(repair.id)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                duration: 0.3,
                delay: index * 0.05
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex justify-between items-center p-3 border-b bg-muted/30">
                <div className="font-medium">{repair.orderCode || `#${repair.id}`}</div>
                <div>{getStatusBadge(repair.status)}</div>
              </div>
              <div className="p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <div className="text-muted-foreground">Kunde:</div>
                  <div className="font-medium">{repair.customerName}</div>
                </div>
                <div className="flex justify-between text-sm">
                  <div className="text-muted-foreground">Gerät:</div>
                  <div>{repair.model}</div>
                </div>
                <div className="flex justify-between text-sm">
                  <div className="text-muted-foreground">Datum:</div>
                  <div>{new Date(repair.createdAt).toLocaleDateString('de-DE')}</div>
                </div>
              </div>
              <div className="flex justify-center gap-6 p-2 border-t">
                <motion.button 
                  className="text-muted-foreground hover:text-foreground p-2 rounded-full hover:bg-muted"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onPrintClick(repair.id);
                  }}
                >
                  <Printer className="h-5 w-5" />
                </motion.button>
                <motion.button 
                  className="text-primary hover:text-primary/80 p-2 rounded-full hover:bg-muted"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => {
                    e.stopPropagation(); 
                    handleRepairClick(repair.id);
                  }}
                >
                  <Info className="h-5 w-5" />
                </motion.button>
              </div>
            </motion.div>
          ))
        )}
      </div>

    </motion.div>
  );
}