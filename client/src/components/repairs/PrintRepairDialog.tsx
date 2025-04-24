import React, { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Repair, Customer } from '@/lib/types';
import { getStatusText } from '@/lib/utils/statusBadges';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface PrintRepairDialogProps {
  open: boolean;
  onClose: () => void;
  repairId: number | null;
}

export function PrintRepairDialog({ open, onClose, repairId }: PrintRepairDialogProps) {
  const printRef = useRef<HTMLDivElement>(null);
  
  const { data: repairs } = useQuery<Repair[]>({
    queryKey: ['/api/repairs']
  });
  
  const { data: customers } = useQuery<Customer[]>({
    queryKey: ['/api/customers']
  });
  
  // Find the current repair
  const repair = repairs?.find(r => r.id === repairId);
  
  // Find the associated customer
  const customer = repair ? customers?.find(c => c.id === repair.customerId) : null;
  
  const handlePrint = () => {
    if (printRef.current) {
      const content = printRef.current;
      const printWindow = window.open('', '_blank');
      
      if (!printWindow) {
        alert('Bitte erlauben Sie Pop-ups für diese Webseite, um den Ausdruck zu ermöglichen.');
        return;
      }
      
      printWindow.document.write(`
        <html>
          <head>
            <title>Reparaturauftrag #${repair?.id}</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                margin: 0;
                padding: 20px;
              }
              .print-container {
                max-width: 800px;
                margin: 0 auto;
              }
              .header {
                text-align: center;
                margin-bottom: 30px;
                padding-bottom: 10px;
                border-bottom: 2px solid #333;
              }
              .section {
                margin-bottom: 20px;
              }
              .section-title {
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 10px;
                padding-bottom: 5px;
                border-bottom: 1px solid #ddd;
              }
              .row {
                display: flex;
                margin-bottom: 8px;
              }
              .label {
                font-weight: bold;
                width: 180px;
              }
              .value {
                flex: 1;
              }
              .signature-area {
                margin-top: 50px;
                display: flex;
                justify-content: space-between;
              }
              .signature-line {
                border-top: 1px solid #333;
                margin-top: 40px;
                width: 200px;
                text-align: center;
              }
              @media print {
                body {
                  padding: 0;
                  margin: 0;
                }
                button {
                  display: none;
                }
              }
            </style>
          </head>
          <body>
            ${content.innerHTML}
            <div class="print-container">
              <div style="text-align: center; margin-top: 30px;">
                <button onclick="window.print(); window.close();" style="padding: 10px 15px; background: #4a85bd; color: white; border: none; border-radius: 4px; cursor: pointer;">
                  Drucken
                </button>
              </div>
            </div>
          </body>
        </html>
      `);
      
      printWindow.document.close();
    }
  };
  
  if (!repair || !customer) {
    return null;
  }
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };
  
  const formatCurrency = (amount?: number) => {
    if (amount === undefined) return '---';
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-primary">Reparaturauftrag drucken</DialogTitle>
          <DialogDescription>
            Vorschau des Drucks - klicken Sie auf "Drucken" um den Reparaturauftrag auszudrucken
          </DialogDescription>
        </DialogHeader>
        
        <div className="print-preview" ref={printRef}>
          <div className="print-container">
            <div className="header">
              <h1 style={{ fontSize: "24px", marginBottom: "5px" }}>Reparaturauftrag #{repair.id}</h1>
              <div>Ausstellungsdatum: {formatDate(repair.createdAt)}</div>
              <div>Status: {getStatusText(repair.status)}</div>
            </div>
            
            <div className="section">
              <div className="section-title">Kundeninformationen</div>
              <div className="row">
                <div className="label">Name:</div>
                <div className="value">{customer.firstName} {customer.lastName}</div>
              </div>
              <div className="row">
                <div className="label">Telefon:</div>
                <div className="value">{customer.phone}</div>
              </div>
              {customer.email && (
                <div className="row">
                  <div className="label">E-Mail:</div>
                  <div className="value">{customer.email}</div>
                </div>
              )}
              <div className="row">
                <div className="label">Kunde seit:</div>
                <div className="value">{formatDate(customer.createdAt)}</div>
              </div>
            </div>
            
            <div className="section">
              <div className="section-title">Geräteinformationen</div>
              <div className="row">
                <div className="label">Geräteart:</div>
                <div className="value">
                  {repair.deviceType === 'smartphone' ? 'Smartphone' : 
                   repair.deviceType === 'tablet' ? 'Tablet' : 'Laptop'}
                </div>
              </div>
              <div className="row">
                <div className="label">Marke:</div>
                <div className="value">{repair.brand}</div>
              </div>
              <div className="row">
                <div className="label">Modell:</div>
                <div className="value">{repair.model}</div>
              </div>
              {repair.serialNumber && (
                <div className="row">
                  <div className="label">Seriennummer:</div>
                  <div className="value">{repair.serialNumber}</div>
                </div>
              )}
            </div>
            
            <div className="section">
              <div className="section-title">Reparaturdetails</div>
              <div className="row">
                <div className="label">Fehlerbeschreibung:</div>
                <div className="value">{repair.issue}</div>
              </div>
              <div className="row">
                <div className="label">Kostenvoranschlag:</div>
                <div className="value">{formatCurrency(repair.estimatedCost !== null ? repair.estimatedCost : undefined)}</div>
              </div>
              {repair.notes && (
                <div className="row">
                  <div className="label">Notizen:</div>
                  <div className="value">{repair.notes}</div>
                </div>
              )}
              <div className="row">
                <div className="label">Auftragsdatum:</div>
                <div className="value">{formatDate(repair.createdAt)}</div>
              </div>
              <div className="row">
                <div className="label">Letzte Aktualisierung:</div>
                <div className="value">{formatDate(repair.updatedAt)}</div>
              </div>
            </div>
            
            <div className="signature-area">
              <div>
                <div className="signature-line">Unterschrift Kunde</div>
              </div>
              <div>
                <div className="signature-line">Unterschrift Mitarbeiter</div>
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={onClose}>
            Schließen
          </Button>
          <Button onClick={handlePrint}>
            Drucken
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}