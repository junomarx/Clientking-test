import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    
    // Funktion zum Aktualisieren des Zustands
    const updateMatches = () => {
      setMatches(media.matches);
    };
    
    // Initial setzen
    updateMatches();
    
    // Änderungen überwachen
    media.addEventListener('change', updateMatches);
    
    // Cleanup
    return () => {
      media.removeEventListener('change', updateMatches);
    };
  }, [query]);

  return matches;
}