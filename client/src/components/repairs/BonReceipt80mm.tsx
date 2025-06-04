import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface BonReceipt80mmProps {
  firmenlogo?: string;
  firmenname: string;
  firmenadresse: string;
  firmenplz: string;
  firmenort: string;
  firmentelefon: string;
  auftragsnummer: string;
  datum_dropoff: string;
  kundenname: string;
  kundentelefon?: string;
  kundenemail?: string;
  hersteller?: string;
  modell?: string;
  problem?: string;
  preis?: string;
  anzahlung?: string;
  imei?: string;
  signatur_dropoff?: string;
  signatur_pickup?: string;
  datum_pickup?: string;
}

export function BonReceipt80mm({ 
  firmenlogo,
  firmenname,
  firmenadresse,
  firmenplz,
  firmenort,
  firmentelefon,
  auftragsnummer,
  datum_dropoff,
  kundenname,
  kundentelefon,
  kundenemail,
  hersteller,
  modell,
  problem,
  preis,
  anzahlung,
  imei,
  signatur_dropoff,
  signatur_pickup,
  datum_pickup
}: BonReceipt80mmProps) {
  return (
    <div style={{
      fontFamily: "Arial, sans-serif",
      fontSize: "12px",
      width: "80mm",
      margin: 0,
      padding: "10px",
      color: "#000"
    }}>
      {/* Logo */}
      <div className="logo" style={{ textAlign: "center", marginBottom: "10px" }}>
        {firmenlogo && (
          <img 
            src={firmenlogo} 
            alt={firmenname || "Firmenlogo"}
            style={{maxWidth: '100%', height: 'auto', maxHeight: '15mm', display: 'block', margin: '0 auto'}}
            onError={(e) => {
              console.error('Fehler beim Laden des Logos in der 80mm Quittung:', e);
              e.currentTarget.style.display = 'none';
            }}
          />
        )}
      </div>

      {/* Firmeninfo */}
      <div style={{ marginBottom: "15px" }}>
        <strong>{firmenname}</strong><br />
        {firmenadresse}, {firmenplz} {firmenort}<br />
        {firmentelefon}
      </div>

      {/* Abholschein + Auftragsnummer */}
      <div style={{ margin: "15px 0" }}>
        <div style={{ fontWeight: "bold", fontSize: "16px", marginBottom: "3px" }}>Abholschein</div>
        <div style={{ fontWeight: "bold", fontSize: "14px" }}>{auftragsnummer}</div>
        <div>{datum_dropoff}</div>
      </div>

      {/* Kunde */}
      <div style={{ marginBottom: "15px" }}>
        <div style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "5px" }}>{kundenname}</div>
        {kundentelefon && <div style={{ marginBottom: "3px" }}>{kundentelefon}</div>}
        {kundenemail && <div style={{ marginBottom: "3px" }}>{kundenemail}</div>}
      </div>

      {/* Gerät */}
      <div style={{ marginBottom: "15px" }}>
        {(hersteller || modell) && (
          <div style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "5px" }}>
            {hersteller} {modell}
          </div>
        )}

        {/* IMEI / Seriennummer - nur anzeigen wenn vorhanden und nicht leer */}
        {imei && imei.trim() !== "" && (
          <div>
            <div style={{ fontWeight: "bold", marginTop: "10px", marginBottom: "3px" }}>IMEI / Seriennummer</div>
            <div>{imei}</div>
          </div>
        )}

        <div style={{ fontWeight: "bold", marginTop: "10px", marginBottom: "5px" }}>Schaden/Fehler</div>
        <div>{problem || 'Keine Angaben'}</div>

        {preis && (
          <div>
            <div style={{ fontWeight: "bold", marginTop: "10px", marginBottom: "3px" }}>Reparaturkosten</div>
            <div>{preis}</div>
          </div>
        )}

        {anzahlung && (
          <div>
            <div style={{ fontWeight: "bold", marginTop: "10px", marginBottom: "3px" }}>Anzahlung</div>
            <div>{anzahlung}</div>
          </div>
        )}
      </div>

      {/* Reparaturbedingungen */}
      <div style={{
        border: "1px solid #ccc",
        padding: "10px",
        fontSize: "11px",
        lineHeight: 1.4,
        marginBottom: "15px",
        backgroundColor: "#f9f9f9"
      }}>
        <div style={{ fontWeight: "bold", fontSize: "12px", marginBottom: "5px" }}>Reparaturbedingungen</div>
        <div>
          1. Für Datenverlust wird keine Haftung übernommen. Der Kunde ist für Datensicherung selbst verantwortlich.<br /><br />
          2. Die Reparatur erfolgt nach bestem Wissen mit geeigneten Ersatzteilen. Originalteile können nicht garantiert werden.<br /><br />
          3. Die Gewährleistung beträgt 6 Monate und bezieht sich ausschließlich auf die Reparaturleistung.<br /><br />
          4. Testzugriffe auf das Gerät können notwendig sein.<br /><br />
          5. Geräte müssen innerhalb von 60 Tagen abgeholt werden. Danach kann das Gerät kostenpflichtig eingelagert oder entsorgt werden.<br /><br />
          6. Mit Ihrer Unterschrift stimmen Sie diesen Bedingungen ausdrücklich zu.
        </div>
      </div>

      {/* Unterschrift Abgabe - nur anzeigen wenn vorhanden und nicht leer */}
      {signatur_dropoff && signatur_dropoff.trim() !== "" && (
        <div style={{ marginTop: "20px" }}>
          <div style={{ fontWeight: "bold", marginBottom: "5px" }}>Reparaturauftrag erteilt</div>
          <img 
            src={signatur_dropoff} 
            alt="Unterschrift bei Abgabe" 
            style={{ maxWidth: "80%", maxHeight: "30mm", display: "block" }}
            onError={(e) => {
              console.error('Fehler beim Laden der Abgabe-Unterschrift in der 80mm Quittung:', e);
              e.currentTarget.style.display = 'none';
            }}
          />
          <div style={{ borderTop: "1px solid #000", width: "100%", margin: "3px 0 8px" }}></div>
          {kundenname}<br />
          {datum_dropoff}
        </div>
      )}

      {/* Unterschrift Abholung - nur anzeigen wenn vorhanden und nicht leer */}
      {signatur_pickup && signatur_pickup.trim() !== "" && (
        <div style={{ marginTop: "20px" }}>
          <div style={{ fontWeight: "bold", marginBottom: "5px" }}>Gerät abgeholt</div>
          <img 
            src={signatur_pickup} 
            alt="Unterschrift bei Abholung" 
            style={{ maxWidth: "80%", maxHeight: "30mm", display: "block" }}
            onError={(e) => {
              console.error('Fehler beim Laden der Abholungs-Unterschrift in der 80mm Quittung:', e);
              e.currentTarget.style.display = 'none';
            }}
          />
          <div style={{ borderTop: "1px solid #000", width: "100%", margin: "3px 0 8px" }}></div>
          {kundenname}<br />
          {datum_pickup}
        </div>
      )}
    </div>
  );
}
