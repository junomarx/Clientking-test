import { QueryClient, QueryFunction } from "@tanstack/react-query";

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
  // Auth-Token und Benutzer-ID aus dem lokalen Speicher holen
  const authToken = localStorage.getItem('auth_token');
  const userId = localStorage.getItem('userId');
  const username = localStorage.getItem('username');
  
  console.log(`API request ${method} ${url} for user ${username || 'unknown'} (ID: ${userId || 'unknown'}) with auth token:`, authToken ? 'exists' : 'none');
  
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
  
  console.log('Request headers:', headers);
  
  try {
    const res = await fetch(url, {
      method,
      headers: headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include", // Behalte dies für die Kompatibilität bei
    });

    if (!res.ok) {
      console.error(`API error ${res.status} ${res.statusText} for ${method} ${url}`);
      const text = await res.text();
      console.error('Error response body:', text);
      throw new Error(`${res.status}: ${text || res.statusText}`);
    }
    
    return res;
  } catch (error) {
    console.error(`API request error for ${method} ${url}:`, error);
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
    
    console.log(`Query ${queryKey[0]} for user ${username || 'unknown'} (ID: ${userId || 'unknown'})`);
    
    const headers: Record<string, string> = {};
    
    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }
    
    // Füge die Benutzer-ID als X-User-ID Header hinzu, wenn verfügbar
    if (userId) {
      headers["X-User-ID"] = userId;
    }
    
    const res = await fetch(queryKey[0] as string, {
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
