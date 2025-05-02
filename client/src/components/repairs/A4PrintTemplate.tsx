import React from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Repair, Customer, BusinessSettings } from '@shared/schema';
import { QRCodeSVG } from 'qrcode.react';

interface A4TemplateProps {
  repair: Repair | null;
  customer: Customer | null;
  businessSettings: BusinessSettings | null;
  qrCodeSettings: any;
}

// A4 Template Component
export const A4PrintTemplate: React.FC<A4TemplateProps> = ({
  repair,
  customer,
  businessSettings,
  qrCodeSettings
}) => {
  return (
    <div className="a4-print-container">
      {/* Header mit Firmeninformationen */}
      <div className="a4-header">
        <div className="a4-company-info">
          <div className="a4-company-name">
            {businessSettings?.businessName || "Handyshop Verwaltung"}
          </div>
          <div className="a4-company-details">
            {businessSettings?.streetAddress}<br />
            {businessSettings?.zipCode} {businessSettings?.city}<br />
            Tel: {businessSettings?.phone}<br />
            E-Mail: {businessSettings?.email}<br />
            {businessSettings?.website}
          </div>
        </div>
        <div className="a4-logo-container">
          {businessSettings?.logoImage && (
            <img
              src={businessSettings.logoImage}
              alt={businessSettings.businessName || "Firmenlogo"}
              className="a4-logo"
            />
          )}
        </div>
      </div>
      
      {/* Dokumentinformationen */}
      <div className="a4-document-info">
        <div>Datum: {repair && format(new Date(repair.createdAt), 'dd.MM.yyyy', { locale: de })}</div>
      </div>
      
      {/* Reparaturauftrag Titel */}
      <div className="a4-document-title">
        Reparaturauftrag
        <span className="a4-order-number">
          {repair?.orderCode || `#${repair?.id}`}
        </span>
      </div>
      
      {/* Kundeninformationen */}
      <div className="a4-section">
        <div className="a4-section-title">
          Kundendaten
        </div>
        <div className="a4-info-grid">
          <div className="a4-info-item">
            <span className="a4-info-label">Name:</span>
            {customer?.firstName} {customer?.lastName}
          </div>
          <div className="a4-info-item">
            <span className="a4-info-label">Telefon:</span>
            {customer?.phone}
          </div>
          {customer?.email && (
            <div className="a4-info-item">
              <span className="a4-info-label">E-Mail:</span>
              {customer.email}
            </div>
          )}
          {(customer?.address || customer?.zipCode || customer?.city) && (
            <div className="a4-info-item">
              <span className="a4-info-label">Adresse:</span>
              {customer?.address}{customer?.address && (customer?.zipCode || customer?.city) ? ', ' : ''}
              {customer?.zipCode} {customer?.city}
            </div>
          )}
        </div>
      </div>
      
      {/* Gerätedaten */}
      <div className="a4-section">
        <div className="a4-section-title">
          Gerätedaten
        </div>
        <div className="a4-info-grid">
          <div className="a4-info-item">
            <span className="a4-info-label">Hersteller:</span>
            {repair?.brand ? repair.brand.charAt(0).toUpperCase() + repair.brand.slice(1) : ''}
          </div>
          <div className="a4-info-item">
            <span className="a4-info-label">Modell:</span>
            {repair?.model}
          </div>
          {repair?.serialNumber && (
            <div className="a4-info-item">
              <span className="a4-info-label">Seriennummer:</span>
              {repair.serialNumber}
            </div>
          )}
          {repair?.imei && (
            <div className="a4-info-item">
              <span className="a4-info-label">IMEI:</span>
              {repair.imei}
            </div>
          )}
        </div>
      </div>
      
      {/* Reparaturdetails */}
      <div className="a4-section">
        <div className="a4-section-title">
          Reparaturdetails
        </div>
        
        <div className="a4-highlight-box">
          <div className="a4-info-item">
            <span className="a4-info-label">Problem:</span>
            <span className="a4-whitespace-pre-wrap">
              {repair?.issue ? repair.issue.split(',').join('\n') : ''}
            </span>
          </div>
        </div>
        
        {repair?.estimatedCost && (
          <div className="a4-highlight-box">
            <div className="a4-info-item">
              <span className="a4-info-label">Preis:</span>
              {repair.estimatedCost} €
            </div>
          </div>
        )}
        
        {repair?.depositAmount && (
          <div className="a4-highlight-box">
            <div className="a4-important-text">
              WICHTIG: Gerät beim Kunden / bei Kundin!
            </div>
            <div className="a4-info-item">
              <span className="a4-info-label">Anzahlung:</span>
              {repair.depositAmount} €
            </div>
          </div>
        )}
        
        {repair?.notes && (
          <div className="a4-highlight-box">
            <div className="a4-info-item">
              <span className="a4-info-label">Notizen:</span>
              {repair.notes}
            </div>
          </div>
        )}
      </div>
      
      {/* Unterschrift bei Geräteabgabe */}
      {repair?.dropoffSignature && (
        <div className="a4-signature-section">
          <div className="a4-section-title">
            Unterschrift bei Geräteabgabe
          </div>
          <div className="a4-signature-container">
            <img
              src={repair.dropoffSignature}
              alt="Unterschrift bei Abgabe"
              className="a4-signature-image"
            />
          </div>
          {repair.dropoffSignedAt && (
            <div className="a4-signature-date">
              Unterschrieben am {format(new Date(repair.dropoffSignedAt), 'dd.MM.yyyy HH:mm', { locale: de })} Uhr
            </div>
          )}
          <div className="a4-signature-text">
            Hiermit bestätige ich, {customer?.firstName} {customer?.lastName}, dass ich mit den Reparaturbedingungen 
            einverstanden bin und die oben genannten Angaben zu meinem Gerät korrekt sind.
          </div>
        </div>
      )}
      
      {/* QR-Code */}
      {qrCodeSettings?.qrCodeEnabled && (
        <div className="a4-qr-code">
          <div className="a4-qr-code-image">
            <QRCodeSVG
              value={`${qrCodeSettings.qrCodeBaseUrl || window.location.origin}/status/${repair?.id}?code=${repair?.accessCode}`}
              size={94}
              level="M"
            />
          </div>
          <div className="a4-qr-code-text">
            {qrCodeSettings.qrCodeText || 'Scannen Sie den QR-Code, um den Status Ihrer Reparatur zu überprüfen'}
          </div>
        </div>
      )}
      
      {/* Footer */}
      <div className="a4-footer">
        <div>
          {businessSettings?.businessName} • {businessSettings?.streetAddress} • 
          {businessSettings?.zipCode} {businessSettings?.city}
        </div>
        {businessSettings?.vatNumber && (
          <div>
            USt-IdNr: {businessSettings.vatNumber} 
            {businessSettings?.companySlogan && ` • ${businessSettings.companySlogan}`}
          </div>
        )}
        {businessSettings?.customFooter && (
          <div>{businessSettings.customFooter}</div>
        )}
      </div>
    </div>
  );
};
