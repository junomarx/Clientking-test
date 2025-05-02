/**
 * Template für DIN A4-Drucklayout
 * Diese Datei enthält ein professionelles DIN A4-Layout für Reparaturaufträge
 */

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

export const generateA4PrintContent = ({
  repair,
  customer,
  businessSettings,
  qrCodeSettings
}: A4TemplateProps) => {
  return (
    <>
      {/* Header mit Firmeninformationen */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '15mm',
        borderBottom: '1px solid #333',
        paddingBottom: '5mm'
      }}>
        <div style={{ flex: 2 }}>
          <div style={{ fontSize: '18pt', fontWeight: 'bold', marginBottom: '3mm' }}>
            {businessSettings?.businessName || "Handyshop Verwaltung"}
          </div>
          <div style={{ fontSize: '10pt', lineHeight: '1.4' }}>
            {businessSettings?.streetAddress}<br />
            {businessSettings?.zipCode} {businessSettings?.city}<br />
            Tel: {businessSettings?.phone}<br />
            E-Mail: {businessSettings?.email}<br />
            {businessSettings?.website}
          </div>
        </div>
        <div style={{ flex: 1, textAlign: 'right' }}>
          {businessSettings?.logoImage && (
            <img
              src={businessSettings.logoImage}
              alt={businessSettings.businessName || "Firmenlogo"}
              style={{ maxHeight: '30mm', maxWidth: '60mm' }}
            />
          )}
        </div>
      </div>
      
      {/* Dokumentinformationen */}
      <div style={{ textAlign: 'right', marginBottom: '10mm' }}>
        <div>Datum: {repair && format(new Date(repair.createdAt), 'dd.MM.yyyy', { locale: de })}</div>
      </div>
      
      {/* Reparaturauftrag Titel */}
      <div style={{ fontSize: '16pt', fontWeight: 'bold', marginBottom: '5mm', display: 'flex', alignItems: 'center' }}>
        Reparaturauftrag 
        <span style={{ 
          display: 'inline-block',
          border: '1px solid #333',
          padding: '2mm 4mm',
          fontWeight: 'bold',
          marginLeft: '4mm'
        }}>
          {repair?.orderCode || `#${repair?.id}`}
        </span>
      </div>
      
      {/* Kundeninformationen */}
      <div style={{ marginBottom: '10mm' }}>
        <div style={{ 
          fontSize: '12pt', 
          fontWeight: 'bold', 
          marginBottom: '3mm', 
          paddingBottom: '1mm', 
          borderBottom: '1px solid #333' 
        }}>
          Kundendaten
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridGap: '5mm' }}>
          <div style={{ marginBottom: '2mm' }}>
            <span style={{ fontWeight: 'bold', display: 'inline-block', minWidth: '30mm' }}>Name:</span>
            {customer?.firstName} {customer?.lastName}
          </div>
          <div style={{ marginBottom: '2mm' }}>
            <span style={{ fontWeight: 'bold', display: 'inline-block', minWidth: '30mm' }}>Telefon:</span>
            {customer?.phone}
          </div>
          {customer?.email && (
            <div style={{ marginBottom: '2mm' }}>
              <span style={{ fontWeight: 'bold', display: 'inline-block', minWidth: '30mm' }}>E-Mail:</span>
              {customer?.email}
            </div>
          )}
          {(customer?.address || customer?.zipCode || customer?.city) && (
            <div style={{ marginBottom: '2mm' }}>
              <span style={{ fontWeight: 'bold', display: 'inline-block', minWidth: '30mm' }}>Adresse:</span>
              {customer?.address}{customer?.address && (customer?.zipCode || customer?.city) ? ', ' : ''}
              {customer?.zipCode} {customer?.city}
            </div>
          )}
        </div>
      </div>
      
      {/* Gerätedaten */}
      <div style={{ marginBottom: '10mm' }}>
        <div style={{ 
          fontSize: '12pt', 
          fontWeight: 'bold', 
          marginBottom: '3mm', 
          paddingBottom: '1mm', 
          borderBottom: '1px solid #333' 
        }}>
          Gerätedaten
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridGap: '5mm' }}>
          <div style={{ marginBottom: '2mm' }}>
            <span style={{ fontWeight: 'bold', display: 'inline-block', minWidth: '30mm' }}>Hersteller:</span>
            {repair?.brand ? repair.brand.charAt(0).toUpperCase() + repair.brand.slice(1) : ''}
          </div>
          <div style={{ marginBottom: '2mm' }}>
            <span style={{ fontWeight: 'bold', display: 'inline-block', minWidth: '30mm' }}>Modell:</span>
            {repair?.model}
          </div>
          {repair?.serialNumber && (
            <div style={{ marginBottom: '2mm' }}>
              <span style={{ fontWeight: 'bold', display: 'inline-block', minWidth: '30mm' }}>Seriennummer:</span>
              {repair.serialNumber}
            </div>
          )}
          {repair?.imei && (
            <div style={{ marginBottom: '2mm' }}>
              <span style={{ fontWeight: 'bold', display: 'inline-block', minWidth: '30mm' }}>IMEI:</span>
              {repair.imei}
            </div>
          )}
        </div>
      </div>
      
      {/* Reparaturdetails */}
      <div style={{ marginBottom: '10mm' }}>
        <div style={{ 
          fontSize: '12pt', 
          fontWeight: 'bold', 
          marginBottom: '3mm', 
          paddingBottom: '1mm', 
          borderBottom: '1px solid #333' 
        }}>
          Reparaturdetails
        </div>
        
        <div style={{ 
          border: '1px solid #333',
          borderLeftWidth: '4px',
          padding: '3mm',
          marginBottom: '4mm'
        }}>
          <div style={{ marginBottom: '2mm' }}>
            <span style={{ fontWeight: 'bold', display: 'inline-block', minWidth: '30mm' }}>Problem:</span>
            <span style={{ whiteSpace: 'pre-wrap' }}>{repair?.issue ? repair.issue.split(',').join('\n') : ''}</span>
          </div>
        </div>
        
        {repair?.estimatedCost && (
          <div style={{ 
            border: '1px solid #333',
            borderLeftWidth: '4px',
            padding: '3mm',
            marginBottom: '4mm'
          }}>
            <div style={{ marginBottom: '2mm' }}>
              <span style={{ fontWeight: 'bold', display: 'inline-block', minWidth: '30mm' }}>Preis:</span>
              {repair.estimatedCost} €
            </div>
          </div>
        )}
        
        {repair?.depositAmount && (
          <div style={{ 
            border: '1px solid #333',
            borderLeftWidth: '4px',
            padding: '3mm',
            marginBottom: '4mm'
          }}>
            <div style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '2mm' }}>
              WICHTIG: Gerät beim Kunden / bei Kundin!
            </div>
            <div style={{ marginBottom: '2mm' }}>
              <span style={{ fontWeight: 'bold', display: 'inline-block', minWidth: '30mm' }}>Anzahlung:</span>
              {repair.depositAmount} €
            </div>
          </div>
        )}
        
        {repair?.notes && (
          <div style={{ 
            border: '1px solid #333',
            borderLeftWidth: '4px',
            padding: '3mm',
            marginBottom: '4mm'
          }}>
            <div style={{ marginBottom: '2mm' }}>
              <span style={{ fontWeight: 'bold', display: 'inline-block', minWidth: '30mm' }}>Notizen:</span>
              {repair.notes}
            </div>
          </div>
        )}
      </div>
      
      {/* Unterschrift bei Geräteabgabe */}
      {repair?.dropoffSignature && (
        <div style={{ 
          marginTop: '15mm',
          borderTop: '1px solid #333',
          paddingTop: '5mm'
        }}>
          <div style={{ 
            fontSize: '12pt', 
            fontWeight: 'bold', 
            marginBottom: '3mm'
          }}>
            Unterschrift bei Geräteabgabe
          </div>
          <div style={{ 
            border: '1px solid #333',
            height: '20mm',
            marginBottom: '3mm',
            position: 'relative'
          }}>
            <img
              src={repair.dropoffSignature}
              alt="Unterschrift bei Abgabe"
              style={{
                position: 'absolute',
                maxHeight: '18mm',
                maxWidth: '80%',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)'
              }}
            />
          </div>
          {repair.dropoffSignedAt && (
            <div style={{ fontSize: '9pt', textAlign: 'center', marginBottom: '3mm' }}>
              Unterschrieben am {format(new Date(repair.dropoffSignedAt), 'dd.MM.yyyy HH:mm', { locale: de })} Uhr
            </div>
          )}
          <div style={{ fontSize: '9pt', textAlign: 'center' }}>
            Hiermit bestätige ich, {customer?.firstName} {customer?.lastName}, dass ich mit den Reparaturbedingungen 
            einverstanden bin und die oben genannten Angaben zu meinem Gerät korrekt sind.
          </div>
        </div>
      )}
      
      {/* QR-Code */}
      {qrCodeSettings?.qrCodeEnabled && (
        <div style={{ textAlign: 'center', marginTop: '10mm' }}>
          <div style={{ width: '25mm', height: '25mm', margin: '0 auto' }}>
            <QRCodeSVG
              value={`${qrCodeSettings.qrCodeBaseUrl || window.location.origin}/status/${repair?.id}?code=${repair?.accessCode}`}
              size={94}
              level="M"
            />
          </div>
          <div style={{ fontSize: '9pt', marginTop: '2mm' }}>
            {qrCodeSettings.qrCodeText || 'Scannen Sie den QR-Code, um den Status Ihrer Reparatur zu überprüfen'}
          </div>
        </div>
      )}
      
      {/* Footer */}
      <div style={{ 
        marginTop: '15mm',
        borderTop: '1px solid #333',
        paddingTop: '3mm',
        fontSize: '9pt',
        textAlign: 'center'
      }}>
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
    </>
  );
};

/**
 * Template für Thermobon-Drucklayout
 */
export const generateThermoPrintContent = ({
  repair,
  customer,
  businessSettings,
  qrCodeSettings
}: A4TemplateProps) => {
  return (
    <>
      {/* Logo und Unternehmensdaten */}
      <div className="print-header">
        <div className="flex flex-col items-center justify-center">
          {/* Logo anzeigen, wenn vorhanden */}
          {businessSettings?.logoImage && (
            <div className="mb-2">
              <img 
                src={businessSettings.logoImage} 
                alt={businessSettings.businessName || "Firmenlogo"}
                className="max-h-16 max-w-[200px] object-contain"
              />
            </div>
          )}
          
          <h2>{businessSettings?.businessName || "Handyshop Verwaltung"}</h2>
          <p className="text-xs">
            {businessSettings ? (
              `${businessSettings.streetAddress}, ${businessSettings.zipCode} ${businessSettings.city}`
            ) : (
              "Adresse nicht verfügbar"
            )}
          </p>
          {businessSettings?.phone && <p className="text-xs">Tel: {businessSettings.phone}</p>}
          {businessSettings?.email && <p className="text-xs">E-Mail: {businessSettings.email}</p>}
          {businessSettings?.website && <p className="text-xs">{businessSettings.website}</p>}
        </div>
      </div>
      
      {/* Datum */}
      <div className="text-sm text-center mb-2">
        <p>
          <span className="font-medium">Datum:</span> 
          {repair && format(new Date(repair.createdAt), 'dd.MM.yyyy', { locale: de })}
        </p>
      </div>
      
      {/* Reparaturauftrag Nummer */}
      <div className="print-section mb-3">
        <div className="flex items-center justify-center">
          <h3 className="font-semibold text-lg">Reparaturauftrag</h3>
          <span className="receipt-number">{repair?.orderCode || `#${repair?.id}`}</span>
        </div>
      </div>
      
      {/* Kundendaten */}
      <div className="print-section mb-3">
        <h3 className="font-semibold mb-1">Kundendaten</h3>
        <div className="grid grid-cols-1 gap-1 text-sm">
          <p><span className="font-medium">Name:</span> {customer?.firstName} {customer?.lastName}</p>
          <p><span className="font-medium">Telefon:</span> {customer?.phone}</p>
          {customer?.email && <p><span className="font-medium">E-Mail:</span> {customer?.email}</p>}
          {(customer?.address || customer?.zipCode || customer?.city) && (
            <p>
              <span className="font-medium">Adresse:</span> 
              {customer?.address}{customer?.address && (customer?.zipCode || customer?.city) ? ', ' : ''}
              {customer?.zipCode} {customer?.city}
            </p>
          )}
        </div>
      </div>
      
      {/* Gerätedaten - ohne Typ */}
      <div className="print-section mb-3">
        <h3 className="font-semibold mb-1">Gerätedaten</h3>
        <div className="grid grid-cols-1 gap-1 text-sm">
          <p><span className="font-medium">Hersteller:</span> {repair?.brand ? repair.brand.charAt(0).toUpperCase() + repair.brand.slice(1) : ''}</p>
          <p><span className="font-medium">Modell:</span> {repair?.model}</p>
          {repair?.serialNumber && <p><span className="font-medium">Seriennummer:</span> {repair.serialNumber}</p>}
        </div>
      </div>
      
      {/* Reparaturdetails */}
      <div className="print-section mb-3">
        <h3 className="font-semibold mb-1">Reparaturdetails</h3>
        <div className="grid grid-cols-1 gap-2 text-sm">
          <div className="highlight-box">
            <p>
              <span className="font-medium">Problem:</span> 
              <span className="whitespace-pre-wrap">{repair?.issue ? repair.issue.split(',').join('\n') : ''}</span>
            </p>
          </div>
          
          {repair?.estimatedCost && (
            <div className="highlight-box">
              <p><span className="font-medium">Preis:</span> {repair.estimatedCost} €</p>
            </div>
          )}
          
          {repair?.depositAmount && (
            <div className="highlight-box" style={{borderWidth: '0.5mm'}}>
              <p className="font-bold" style={{textDecoration: 'underline'}}>WICHTIG: Gerät beim Kunden / bei Kundin!</p>
              <p><span className="font-medium">Anzahlung:</span> {repair.depositAmount} €</p>
            </div>
          )}
          
          {repair?.notes && (
            <div className="highlight-box">
              <p><span className="font-medium">Notizen:</span> {repair.notes}</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Entfernt: Status wird nicht mehr angezeigt */}
      
      {/* Kundenunterschrift anzeigen, wenn vorhanden */}
      {repair?.dropoffSignature && (
        <div className="print-section mb-3 border-t">
          <h3 className="font-semibold mb-2 mt-2">Unterschrift bei Geräteabgabe</h3>
          <div className="border" style={{padding: '2mm'}}>
            <img 
              src={repair.dropoffSignature} 
              alt="Unterschrift bei Abgabe" 
              style={{maxHeight: '20mm', margin: '0 auto', display: 'block'}}
            />
          </div>
          {repair.dropoffSignedAt && (
            <div className="text-center text-xs mt-2">
              Unterschrieben am {format(new Date(repair.dropoffSignedAt), 'dd.MM.yyyy HH:mm', { locale: de })} Uhr
            </div>
          )}
          <div className="text-xs mt-3 text-center">
            <p className="font-medium">Hiermit bestätige ich, {customer?.firstName} {customer?.lastName}, dass ich mit den Reparaturbedingungen einverstanden bin und die oben genannten Angaben zu meinem Gerät korrekt sind.</p>
          </div>
        </div>
      )}
      
      {/* QR-Code anzeigen, wenn aktiviert */}
      {qrCodeSettings?.qrCodeEnabled && (
        <div className="print-section mb-3 mt-8 text-center">
          <h3 className="font-semibold mb-1">Scannen Sie den QR-Code</h3>
          <div style={{ margin: '0 auto', width: '80px', height: '80px' }}>
            <QRCodeSVG
              value={`${qrCodeSettings.qrCodeBaseUrl || window.location.origin}/status/${repair?.id}?code=${repair?.accessCode}`}
              size={80}
              level="M"
            />
          </div>
          <p className="text-xs mt-2">{qrCodeSettings.qrCodeText || 'Scannen Sie den QR-Code, um den Status Ihrer Reparatur zu überprüfen'}</p>
        </div>
      )}
      
      {/* Footer mit Abholbereich */}
      <div className="receipt-footer">
        {repair?.pickupSignature && (
          <div className="mb-4">
            <h3 className="font-semibold mb-2">Unterschrift bei Abholung</h3>
            <div className="border" style={{padding: '2mm'}}>
              <img 
                src={repair.pickupSignature} 
                alt="Unterschrift bei Abholung" 
                style={{maxHeight: '20mm', margin: '0 auto', display: 'block'}}
              />
            </div>
            {repair.pickupSignedAt && (
              <div className="text-center text-xs mt-2">
                Unterschrieben am {format(new Date(repair.pickupSignedAt), 'dd.MM.yyyy HH:mm', { locale: de })} Uhr
              </div>
            )}
            <div className="text-xs mt-3 text-center">
              <p className="font-medium">Hiermit bestätige ich, {customer?.firstName} {customer?.lastName}, den Erhalt meines Geräts. Die Reparatur wurde zu meiner vollen Zufriedenheit durchgeführt.</p>
            </div>
          </div>
        )}
        
        <div>
          {businessSettings?.businessName || "Handyshop Verwaltung"} • 
          {businessSettings ? 
            `${businessSettings.streetAddress}, ${businessSettings.zipCode} ${businessSettings.city}` : 
            "Adresse nicht verfügbar"
          }
        </div>
        {businessSettings?.customFooter && (
          <div className="mt-2">{businessSettings.customFooter}</div>
        )}
      </div>
    </>
  );
};
