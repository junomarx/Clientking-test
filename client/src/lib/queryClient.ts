import { QueryClient, QueryFunction } from "@tanstack/react-query";

// API-Basis-URL - kann durch die VITE_API_URL Umgebungsvariable überschrieben werden
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Füge API_BASE_URL hinzu, wenn der URL nicht mit http:// oder https:// beginnt
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

  // Auth-Token und Benutzer-ID aus dem lokalen Speicher holen
  const authToken = localStorage.getItem('auth_token');
  const userId = localStorage.getItem('userId');
  const username = localStorage.getItem('username');
  
  const headers: Record<string, string> = {};
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }
  
  // Füge die Benutzer-ID als X-User-ID Header hinzu, wenn verfügbar
  if (userId) {
    headers["X-User-ID"] = userId;
  }
  
  // Multi-Shop Admin Modus: Header für DSGVO-konforme Shop-Datentrennung
  const multiShopMode = localStorage.getItem('multiShopAdminMode');
  const selectedShopId = localStorage.getItem('multiShopAdminSelectedShop');
  if (multiShopMode === 'true' && selectedShopId) {
    headers["X-Multi-Shop-Mode"] = "true";
    headers["X-Selected-Shop-Id"] = selectedShopId;
    console.log(`🌐 DSGVO-Multi-Shop API: Shop ${selectedShopId} Header gesetzt für ${fullUrl}`);
  }
  
  // Fallback: Query-Parameter für Kompatibilität
  let finalUrl = fullUrl;
  if (multiShopMode === 'true' && selectedShopId && !fullUrl.includes('shopId=')) {
    const separator = fullUrl.includes('?') ? '&' : '?';
    finalUrl = `${fullUrl}${separator}shopId=${selectedShopId}`;
  }
  
  try {
    const res = await fetch(finalUrl, {
      method,
      headers: headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include", // Behalte dies für die Kompatibilität bei
    });

    if (!res.ok) {
      // Versuche den Response-Body zu erhalten
      let errorMessage = `Fehler ${res.status}: ${res.statusText}`;
      
      try {
        const contentType = res.headers.get('content-type');
        
        // Prüfe, ob der Response JSON enthält
        if (contentType && contentType.includes('application/json')) {
          const errorText = await res.text();
          
          try {
            // Versuche das JSON zu parsen
            const errorData = JSON.parse(errorText);
            
            // Prüfung auf spezifische Fehlercodes
            if (errorData.code === "TRIAL_EXPIRED") {
              errorMessage = "Ihre Testversion ist abgelaufen. Bitte aktualisieren Sie Ihr Paket, um weiterhin Zugriff zu haben.";
            } else if (errorData.error) {
              errorMessage = errorData.error;
            } else if (errorData.message) {
              errorMessage = errorData.message;
            }
          } catch (jsonParsingError) {
            // JSON konnte nicht geparst werden, verwende den Rohtext
            errorMessage = errorText || errorMessage;
          }
        } else {
          // Kein JSON-Content, versuche regulären Text zu lesen
          const errorText = await res.text();
          errorMessage = errorText || errorMessage;
        }
      } catch (responseError) {
        // Fehler beim Lesen des Response-Body, behalte die Standard-Fehlermeldung bei
        console.error("Fehler beim Lesen des Fehler-Response:", responseError);
      }
      
      throw new Error(errorMessage);
    }
    
    return res;
  } catch (error) {
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Auth-Token und Benutzer-ID aus dem lokalen Speicher holen
    const authToken = localStorage.getItem('auth_token');
    const userId = localStorage.getItem('userId');
    const username = localStorage.getItem('username');
    
    // Füge API_BASE_URL hinzu, wenn der URL nicht mit http:// oder https:// beginnt
    const path = queryKey[0] as string;
    const fullUrl = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
    
    const headers: Record<string, string> = {};
    
    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }
    
    // Füge die Benutzer-ID als X-User-ID Header hinzu, wenn verfügbar
    if (userId) {
      headers["X-User-ID"] = userId;
    }
    
    // DSGVO-konform: Multi-Shop Admin Header setzen
    const multiShopMode = localStorage.getItem('multiShopAdminMode');
    const selectedShopId = localStorage.getItem('multiShopAdminSelectedShop');
    if (multiShopMode === 'true' && selectedShopId) {
      headers['X-Multi-Shop-Mode'] = 'true';
      headers['X-Selected-Shop-Id'] = selectedShopId;
      console.log(`🌐 DSGVO-Query: Multi-Shop Header für Shop ${selectedShopId} gesetzt`);
    }
    
    let finalUrl = fullUrl;
    
    const res = await fetch(finalUrl, {
      credentials: "include",
      headers: headers
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
