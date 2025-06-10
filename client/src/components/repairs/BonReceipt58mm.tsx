import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface BonReceipt58mmProps {
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
  imei?: string;
  signatur_dropoff?: string;
  signatur_pickup?: string;
  datum_pickup?: string;
}

export function BonReceipt58mm({ 
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
  imei,
  signatur_dropoff,
  signatur_pickup,
  datum_pickup
}: BonReceipt58mmProps) {
  return (
    <div style={{
      fontFamily: "Arial, sans-serif",
      fontSize: "11px",
      width: "58mm",
      margin: 0,
      padding: "10px",
      color: "#000"
    }}>
      <div style={{ textAlign: "center", marginBottom: "5px" }}>
        {firmenlogo && (
          <img 
            src={firmenlogo} 
            alt="Logo" 
            style={{ maxWidth: "90%", height: "auto" }} 
            onError={(e) => {
              console.error('Fehler beim Laden des Logos in der 58mm Quittung:', e);
              e.currentTarget.style.display = 'none';
            }}
          />
        )}
      </div>

      <div style={{ textAlign: "center", marginBottom: "10px" }}>
        <strong>{firmenname}</strong><br />
        {firmenadresse}<br />
        {firmenplz} {firmenort}<br />
        {firmentelefon}
      </div>

      <div style={{ textAlign: "center", margin: "10px 0 15px" }}>
        <div style={{ fontWeight: "bold", fontSize: "14px", marginBottom: "2px" }}>Abholschein</div>
        <div style={{ fontWeight: "bold", fontSize: "12px" }}>{auftragsnummer}</div>
        <div>{datum_dropoff}</div>
      </div>

      <div style={{ marginBottom: "14px" }}>
        <div style={{ fontSize: "12px", fontWeight: "bold", marginBottom: "2px" }}>{kundenname}</div>
        {kundentelefon && <div style={{ fontSize: "11px", marginBottom: "3px" }}>{kundentelefon}</div>}
        {kundenemail && <div style={{ marginBottom: "3px" }}>{kundenemail}</div>}
      </div>

      <div style={{ marginBottom: "14px" }}>
        {(hersteller || modell) && (
          <div style={{ fontSize: "12px", fontWeight: "bold", marginBottom: "2px" }}>
            {hersteller} {modell}
          </div>
        )}

        {/* IMEI / Seriennummer - nur anzeigen wenn vorhanden und nicht leer */}
        {imei && imei.trim() !== "" && (
          <>
            <div style={{ fontWeight: "bold", fontSize: "11px", marginTop: "6px", marginBottom: "2px" }}>IMEI / Seriennummer</div>
            <div>{imei}</div>
          </>
        )}

        <div style={{ fontWeight: "bold", marginTop: "6px", marginBottom: "2px" }}>Schaden/Fehler</div>
        <div>{problem || 'Keine Angaben'}</div>

        {preis && (
          <>
            <div style={{ fontWeight: "bold", fontSize: "11px", marginTop: "8px", marginBottom: "2px" }}>Reparaturkosten</div>
            <div>{preis}</div>
          </>
        )}
      </div>

      <div style={{
        border: "1px solid #000",
        padding: "6px",
        fontSize: "9px",
        lineHeight: 1.3,
        marginBottom: "14px"
      }}>
        <div style={{ textAlign: "center", fontWeight: "bold", fontSize: "10px", marginBottom: "4px" }}>Reparaturbedingungen</div>
        1. Keine Haftung für Datenverlust – Kunde ist verantwortlich.<br /><br />
        2. Reparatur mit geprüften, ggf. nicht originalen Teilen.<br /><br />
        3. 6 Monate Gewährleistung auf Reparaturleistung.<br /><br />
        4. Zugriff auf Gerät zur Fehlerprüfung möglich.<br /><br />
        5. Abholung innerhalb von 60 Tagen erforderlich.<br /><br />
        6. Mit Unterschrift werden Bedingungen akzeptiert.
      </div>

      {/* Unterschrift Abgabe - nur anzeigen wenn vorhanden und nicht leer */}
      {signatur_dropoff && signatur_dropoff.trim() !== "" && (
        <div style={{ marginTop: "16px", textAlign: "center" }}>
          <div style={{ fontWeight: "bold", marginBottom: "4px" }}>Reparaturauftrag erteilt</div>
          <img 
            src={signatur_dropoff} 
            alt="Unterschrift bei Abgabe" 
            style={{ maxWidth: "80%", maxHeight: "25mm", margin: "0 auto 5px auto", display: "block" }}
            onError={(e) => {
              console.error('Fehler beim Laden der Abgabe-Unterschrift in der 58mm Quittung:', e);
              e.currentTarget.style.display = 'none';
            }}
          />
          <div style={{ borderTop: "1px solid #000", width: "100%", margin: "2px 0 6px" }}></div>
          {kundenname}<br />
          {datum_dropoff}
        </div>
      )}

      {/* Unterschrift Abholung - nur anzeigen wenn vorhanden und nicht leer */}
      {signatur_pickup && signatur_pickup.trim() !== "" && (
        <div style={{ marginTop: "16px", textAlign: "center" }}>
          <div style={{ fontWeight: "bold", marginBottom: "4px" }}>Gerät abgeholt</div>
          <img 
            src={signatur_pickup} 
            alt="Unterschrift bei Abholung" 
            style={{ maxWidth: "80%", maxHeight: "25mm", margin: "0 auto 5px auto", display: "block" }}
            onError={(e) => {
              console.error('Fehler beim Laden der Abholungs-Unterschrift in der 58mm Quittung:', e);
              e.currentTarget.style.display = 'none';
            }}
          />
          <div style={{ borderTop: "1px solid #000", width: "100%", margin: "2px 0 6px" }}></div>
          {kundenname}<br />
          {datum_pickup}
        </div>
      )}
    </div>
  );
}
