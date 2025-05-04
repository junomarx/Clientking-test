import { QueryClient, QueryFunction } from "@tanstack/react-query";

// API-Basis-URL - kann durch die VITE_API_URL Umgebungsvariable überschrieben werden
// Verwende explizit den Port 5000, auf dem unser Express-Server läuft
const API_BASE_URL = import.meta.env.VITE_API_URL || window.location.protocol + '//' + window.location.hostname + ':5000';

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
  
  try {
    const res = await fetch(fullUrl, {
      method,
      headers: headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include", // Behalte dies für die Kompatibilität bei
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`${res.status}: ${text || res.statusText}`);
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
    
    const res = await fetch(fullUrl, {
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
