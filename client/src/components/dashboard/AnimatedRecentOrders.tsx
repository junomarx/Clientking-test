import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Printer, Info, Trash2 } from 'lucide-react';
import { getStatusBadge } from '@/lib/utils';
import { DashboardRepairDetailsDialog } from '@/components/dashboard/DashboardRepairDetailsDialog';
import { RepairDetailsDialog } from '@/components/repairs/RepairDetailsDialog';

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
}

export function AnimatedRecentOrders({ 
  repairs, 
  isLoading, 
  onPrintClick,
  onStatusChange,
  onEdit
}: AnimatedRecentOrdersProps) {
  // State für den Detaildialog
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedRepairId, setSelectedRepairId] = useState<number | null>(null);
  
  // Funktion zum Öffnen des Detaildialogs
  const openDetailsDialog = (repairId: number) => {
    setSelectedRepairId(repairId);
    setShowDetailsDialog(true);
  };
  
  // Funktion zum Schließen des Detaildialogs
  const closeDetailsDialog = () => {
    setShowDetailsDialog(false);
    setTimeout(() => setSelectedRepairId(null), 300); // Verzögerung für die Animation
  };
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
      
      {/* Desktop Tabelle (nur auf größeren Bildschirmen anzeigen) */}
      <div className="hidden md:block overflow-x-auto">
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
                    className="border-b border-gray-200 hover:bg-blue-50 transition-all cursor-pointer"
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
                    onClick={() => openDetailsDialog(repair.id)}
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
                          onClick={(e) => {
                            e.stopPropagation(); // Verhindert, dass der Klick auf die TR öffnet
                            onPrintClick(repair.id);
                          }}
                          whileHover={{ 
                            scale: 1.2 
                          }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <Printer className="h-4 w-4" />
                        </motion.button>
                        <motion.button 
                          className="text-blue-600 hover:text-blue-800 p-1"
                          title="Details anzeigen"
                          onClick={(e) => {
                            e.stopPropagation(); // Verhindert, dass der Klick auf die TR öffnet
                            openDetailsDialog(repair.id);
                          }}
                          whileHover={{ 
                            scale: 1.2 
                          }}
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
      
      {/* Mobile Karten-Ansicht (nur auf kleineren Bildschirmen anzeigen) */}
      <div className="md:hidden space-y-4 px-4 py-2">
        {isLoading ? (
          <div className="py-4 text-center text-gray-500 bg-white rounded-lg shadow-sm">Lädt Daten...</div>
        ) : repairs.length === 0 ? (
          <div className="py-4 text-center text-gray-500 bg-white rounded-lg shadow-sm">Keine Reparaturen vorhanden</div>
        ) : (
          repairs.map((repair, index) => (
            <motion.div 
              key={repair.id} 
              className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden cursor-pointer" 
              onClick={() => openDetailsDialog(repair.id)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                duration: 0.3,
                delay: index * 0.08
              }}
            >
              <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50">
                <div className="font-medium">{repair.orderCode || `#${repair.id}`}</div>
                <div>{getStatusBadge(repair.status)}</div>
              </div>
              <div className="p-4 space-y-2">
                <div className="flex justify-between">
                  <div className="text-sm text-gray-500">Kunde:</div>
                  <div className="font-medium">{repair.customerName}</div>
                </div>
                <div className="flex justify-between">
                  <div className="text-sm text-gray-500">Gerät:</div>
                  <div>{repair.model}</div>
                </div>
                <div className="flex justify-between">
                  <div className="text-sm text-gray-500">Datum:</div>
                  <div>{new Date(repair.createdAt).toLocaleDateString('de-DE')}</div>
                </div>
              </div>
              <div className="flex justify-center gap-8 p-3 bg-gray-50 border-t border-gray-100">
                <motion.button 
                  className="text-gray-600 hover:text-gray-800 p-2 rounded-full hover:bg-white transition-colors"
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
                  className="text-blue-600 hover:text-blue-800 p-2 rounded-full hover:bg-white transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => {
                    e.stopPropagation(); 
                    openDetailsDialog(repair.id);
                  }}
                >
                  <Info className="h-5 w-5" />
                </motion.button>
              </div>
            </motion.div>
          ))
        )}
      </div>
      
      {/* Dashboard-spezifischer Repair Details Dialog */}
      <DashboardRepairDetailsDialog
        open={showDetailsDialog}
        onClose={closeDetailsDialog}
        repairId={selectedRepairId}
        repair={repairs?.find(r => r.id === selectedRepairId)}
        customers={undefined} /* Customers werden im Dialog via API abgefragt */
        onPrint={(id) => {
          console.log('Druckoptionen für Auftrag anzeigen:', id);
          onPrintClick(id);
        }}
      />
    </motion.div>
  );
}