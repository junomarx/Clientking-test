// client/src/components/ui/logo-upload/index.tsx

import React, { useState, useEffect } from "react";

export function LogoUpload() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    // Bestehendes Logo laden
    const fetchLogo = async () => {
      try {
        const response = await fetch("/api/business-settings/logo");
        const data = await response.json();
        if (data.success && data.logoUrl) {
          setLogoUrl(data.logoUrl);
        }
      } catch (err) {
        console.error("Logo konnte nicht geladen werden:", err);
      }
    };
    fetchLogo();
  }, []);

  return (
    <div className="space-y-4">
      <form
        action="/api/business-settings/logo"
        method="POST"
        encType="multipart/form-data"
        className="space-y-4"
      >
        <input type="file" name="logo" accept="image/*" required />
        <button
          type="submit"
          style={{
            padding: "8px 16px",
            backgroundColor: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          Logo hochladen
        </button>
      </form>

      {logoUrl && (
        <div>
          <p className="text-sm text-gray-500 mb-2">Aktuelles Firmenlogo:</p>
          <img
            src={logoUrl}
            alt="Firmenlogo"
            className="max-w-[200px] max-h-[100px] border rounded p-2"
          />
        </div>
      )}
    </div>
  );
}
