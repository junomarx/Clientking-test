// Druckvorlagen-Komponente für Kostenvoranschläge
import React from 'react';

interface CostEstimateItem {
  id?: number;
  description: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
}

interface CostEstimatePrintTemplateProps {
  companyName: string;
  companyAddress: string;
  companyCity: string;
  companyPhone: string;
  companyEmail: string;
  customerName: string;
  customerAddress1?: string;
  customerAddress2?: string;
  referenceNumber: string;
  brand: string;
  model: string;
  serialNumber?: string;
  issue: string;
  items: CostEstimateItem[];
  subtotal: string;
  taxRate: string;
  taxAmount: string;
  total: string;
  validUntil?: string;
  notes?: string;
  companyLogo?: string;
}

export const CostEstimatePrintTemplate: React.FC<CostEstimatePrintTemplateProps> = ({
  companyName,
  companyAddress,
  companyCity,
  companyPhone,
  companyEmail,
  customerName,
  customerAddress1,
  customerAddress2,
  referenceNumber,
  brand,
  model,
  serialNumber,
  issue,
  items,
  subtotal,
  taxRate,
  taxAmount,
  total,
  validUntil,
  notes,
  companyLogo,
}) => {
  // Datum formatieren für "Gültig bis"
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'unbegrenzt';
    try {
      const date = new Date(dateString);
      return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getFullYear()}`;
    } catch (error) {
      return 'unbegrenzt';
    }
  };

  // Heutiges Datum für die Erstellung
  const today = new Date();
  const todayFormatted = `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getFullYear()}`;

  return (
    <div className="print-container" style={{ fontFamily: 'Arial, sans-serif', width: '100%', maxWidth: '210mm', margin: '0 auto', padding: '20mm', color: '#333', backgroundColor: 'white' }}>
      <div className="header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px' }}>
        <div className="logo-container" style={{ width: '200px', border: companyLogo ? 'none' : '1px dashed #ccc', padding: '10px', textAlign: 'center', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontStyle: 'italic', color: '#999' }}>
          {companyLogo ? <img src={companyLogo} alt="Firmenlogo" style={{ maxWidth: '100%', maxHeight: '100%' }} /> : 'Firmenlogo'}
        </div>
        <div className="company-info" style={{ textAlign: 'right', fontSize: '12px', color: '#666' }}>
          <p className="company-name" style={{ fontWeight: 'bold', fontSize: '16px', color: '#333', marginBottom: '5px' }}>{companyName}</p>
          <p>
            {companyAddress}<br />
            {companyCity}<br />
            {companyPhone}<br />
            {companyEmail}
          </p>
        </div>
      </div>

      <div className="customer-info" style={{ marginBottom: '30px' }}>
        <div className="section-title" style={{ fontWeight: 'bold', marginBottom: '10px', fontSize: '14px', color: '#333' }}>Kundeninformationen</div>
        <p className="customer-name" style={{ fontWeight: 'bold', fontSize: '16px', margin: '3px 0' }}>{customerName}</p>
        {customerAddress1 && <p style={{ margin: '3px 0' }}>{customerAddress1}</p>}
        {customerAddress2 && <p style={{ margin: '3px 0' }}>{customerAddress2}</p>}
      </div>

      <div className="document-title" style={{ textAlign: 'center', fontSize: '24px', fontWeight: 'bold', margin: '30px 0 10px 0', color: '#222' }}>Kostenvoranschlag</div>
      <div className="auftragsnummer" style={{ textAlign: 'center', fontSize: '18px', margin: '0 0 20px 0', color: '#222' }}>{referenceNumber}</div>
      <div style={{ textAlign: 'center', fontSize: '14px', margin: '0 0 40px 0', color: '#666' }}>Erstellt am: {todayFormatted}</div>

      {/* Geräteinformationen (einziger Abschnitt mit Rahmen) */}
      <div className="device-info-box" style={{ display: 'flex', justifyContent: 'space-between', gap: '40px', marginBottom: '30px', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
        <div className="info-column" style={{ flex: 1 }}>
          <div className="info-item" style={{ marginBottom: '15px' }}>
            <div className="info-label" style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Hersteller</div>
            <div className="info-value" style={{ fontSize: '14px', fontWeight: 'bold', color: '#222' }}>{brand}</div>
          </div>
        </div>
        <div className="info-column" style={{ flex: 1 }}>
          <div className="info-item" style={{ marginBottom: '15px' }}>
            <div className="info-label" style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Modell</div>
            <div className="info-value" style={{ fontSize: '14px', fontWeight: 'bold', color: '#222' }}>{model}</div>
          </div>
        </div>
        <div className="info-column" style={{ flex: 1 }}>
          <div className="info-item" style={{ marginBottom: '15px' }}>
            <div className="info-label" style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Seriennummer</div>
            <div className="info-value" style={{ fontSize: '14px', fontWeight: 'bold', color: '#222' }}>{serialNumber || '-'}</div>
          </div>
        </div>
      </div>

      {/* Fehlerbeschreibung */}
      <div className="section" style={{ marginBottom: '20px' }}>
        <div className="section-title" style={{ fontWeight: 'bold', marginBottom: '10px', fontSize: '14px', color: '#333' }}>Fehlerbeschreibung</div>
        <div className="box-content" style={{ whiteSpace: 'pre-line', fontSize: '13px', color: '#333', marginTop: '5px' }}>{issue}</div>
      </div>

      {/* Durchzuführende Arbeiten - Jetzt mit Positionen-Tabelle */}
      <div className="section" style={{ marginBottom: '20px' }}>
        <div className="section-title" style={{ fontWeight: 'bold', marginBottom: '10px', fontSize: '14px', color: '#333' }}>Positionen</div>
        
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
              <th style={{ padding: '8px', textAlign: 'left', fontWeight: 'bold', fontSize: '12px' }}>#</th>
              <th style={{ padding: '8px', textAlign: 'left', fontWeight: 'bold', fontSize: '12px' }}>Beschreibung</th>
              <th style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', fontSize: '12px' }}>Menge</th>
              <th style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', fontSize: '12px' }}>Einzelpreis</th>
              <th style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', fontSize: '12px' }}>Gesamtpreis</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.id || index} style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: '8px', fontSize: '12px' }}>{index + 1}</td>
                <td style={{ padding: '8px', fontSize: '12px' }}>{item.description}</td>
                <td style={{ padding: '8px', textAlign: 'right', fontSize: '12px' }}>{item.quantity}</td>
                <td style={{ padding: '8px', textAlign: 'right', fontSize: '12px' }}>{item.unitPrice} €</td>
                <td style={{ padding: '8px', textAlign: 'right', fontSize: '12px' }}>{item.totalPrice} €</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginTop: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '200px', marginBottom: '5px' }}>
            <span style={{ fontSize: '12px', color: '#666' }}>Zwischensumme:</span>
            <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{subtotal} €</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '200px', marginBottom: '5px' }}>
            <span style={{ fontSize: '12px', color: '#666' }}>MwSt ({taxRate}%):</span>
            <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{taxAmount} €</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '200px', borderTop: '1px solid #ddd', paddingTop: '5px', marginTop: '5px' }}>
            <span style={{ fontSize: '14px', fontWeight: 'bold' }}>Gesamtbetrag:</span>
            <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{total} €</span>
          </div>
        </div>
      </div>

      {/* Hinweise */}
      <div className="section" style={{ marginBottom: '20px' }}>
        <div className="section-title" style={{ fontWeight: 'bold', marginBottom: '10px', fontSize: '14px', color: '#333' }}>Hinweise zum Kostenvoranschlag</div>
        <p style={{ margin: '5px 0', fontSize: '12px' }}><strong>1.</strong> Der Kostenvoranschlag basiert auf einer ersten Diagnose und kann sich bei tatsächlicher Durchführung ändern.</p>
        <p style={{ margin: '5px 0', fontSize: '12px' }}><strong>2.</strong> Sollte sich während der Reparatur ein erweiterter Schaden zeigen, wird der Kunde vorab kontaktiert.</p>
        <p style={{ margin: '5px 0', fontSize: '12px' }}><strong>3.</strong> Die im Kostenvoranschlag genannten Preise verstehen sich inkl. MwSt., sofern nicht anders angegeben.</p>
        <p style={{ margin: '5px 0', fontSize: '12px' }}><strong>4.</strong> Eine Bearbeitungsgebühr kann fällig werden, falls keine Reparatur beauftragt wird.</p>
        <p style={{ margin: '5px 0', fontSize: '12px' }}><strong>5.</strong> Dieser Kostenvoranschlag ist bis {validUntil ? formatDate(validUntil) : 'unbegrenzt'} gültig.</p>
      </div>

      {notes && (
        <div className="section" style={{ marginBottom: '20px' }}>
          <div className="section-title" style={{ fontWeight: 'bold', marginBottom: '10px', fontSize: '14px', color: '#333' }}>Zusätzliche Notizen</div>
          <div className="box-content" style={{ whiteSpace: 'pre-line', fontSize: '13px', color: '#333', marginTop: '5px' }}>{notes}</div>
        </div>
      )}
    </div>
  );
};

export default CostEstimatePrintTemplate;