import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Printer } from 'lucide-react';
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
}

export function AnimatedRecentOrders({ 
  repairs, 
  isLoading, 
  onPrintClick 
}: AnimatedRecentOrdersProps) {
  return (
    <motion.div
      className="bg-white rounded-lg shadow-sm overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="p-4 border-b border-gray-100">
        <h3 className="font-semibold text-lg">Neueste Aufträge</h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="bg-primary text-white">
              <th className="py-3 px-4 text-left">Nr</th>
              <th className="py-3 px-4 text-left">Kunde</th>
              <th className="py-3 px-4 text-left">Gerät</th>
              <th className="py-3 px-4 text-left">Status</th>
              <th className="py-3 px-4 text-left">Datum</th>
              <th className="py-3 px-4 text-left">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-gray-500">
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
                  <td colSpan={6} className="py-4 text-center text-gray-500">
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
                    className="border-b border-gray-200 hover:bg-blue-50 transition-all"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ 
                      duration: 0.3,
                      delay: index * 0.08,
                      ease: "easeOut"
                    }}
                    whileHover={{ 
                      backgroundColor: "rgba(59, 130, 246, 0.1)" 
                    }}
                  >
                    <td className="py-3 px-4">
                      <motion.div whileHover={{ scale: 1.1 }}>
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
                          className="text-gray-600 hover:text-gray-800 p-1"
                          title="Druckoptionen anzeigen"
                          onClick={() => onPrintClick(repair.id)}
                          whileHover={{ 
                            scale: 1.2 
                          }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <Printer className="h-4 w-4" />
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
    </motion.div>
  );
}