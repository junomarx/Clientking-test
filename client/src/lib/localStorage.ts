import { Customer, Repair, RepairStatus } from './types';

const CUSTOMERS_KEY = 'repair-shop-customers';
const REPAIRS_KEY = 'repair-shop-repairs';

// Funktion zum Holen des aktuellen Benutzernamens aus dem Authentifizierungskontext
const getCurrentUsername = (): string => {
  try {
    // Versuche, den Benutzer aus localStorage zu holen (dort wird er üblicherweise gespeichert)
    const userDataString = localStorage.getItem('user');
    if (userDataString) {
      const userData = JSON.parse(userDataString);
      return userData.username || 'anonymous';
    }
  } catch (error) {
    console.error('Fehler beim Abrufen des Benutzernamens:', error);
  }
  return 'anonymous';
};

// Funktion zum Erzeugen eines benutzerabhängigen Präfixes
const getUserPrefix = () => {
  const username = getCurrentUsername();
  return `user_${username}_`;
};

// Funktionen zum Erzeugen benutzerabhängiger Schlüssel
const getSavedModelsKey = () => `${getUserPrefix()}repair-shop-models`;
const getSavedBrandsKey = () => `${getUserPrefix()}repair-shop-brands`;
const getSavedDeviceTypesKey = () => `${getUserPrefix()}repair-shop-device-types`;

// Customer functions
export const saveCustomers = (customers: Customer[]): void => {
  localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(customers));
};

export const getCustomers = (): Customer[] => {
  const data = localStorage.getItem(CUSTOMERS_KEY);
  return data ? JSON.parse(data) : [];
};

export const addCustomer = (customer: Omit<Customer, 'id'>): Customer => {
  const customers = getCustomers();
  const id = customers.length > 0 
    ? Math.max(...customers.map(c => c.id)) + 1 
    : 1;
  
  const newCustomer: Customer = {
    ...customer,
    id,
    createdAt: new Date().toISOString()
  };
  
  customers.push(newCustomer);
  saveCustomers(customers);
  
  return newCustomer;
};

export const updateCustomer = (id: number, updatedData: Partial<Customer>): Customer | null => {
  const customers = getCustomers();
  const index = customers.findIndex(c => c.id === id);
  
  if (index === -1) return null;
  
  customers[index] = {
    ...customers[index],
    ...updatedData
  };
  
  saveCustomers(customers);
  return customers[index];
};

export const removeCustomer = (id: number): boolean => {
  const customers = getCustomers();
  const filteredCustomers = customers.filter(c => c.id !== id);
  
  if (filteredCustomers.length === customers.length) {
    return false;
  }
  
  saveCustomers(filteredCustomers);
  return true;
};

// Repair functions
export const saveRepairs = (repairs: Repair[]): void => {
  localStorage.setItem(REPAIRS_KEY, JSON.stringify(repairs));
};

export const getRepairs = (): Repair[] => {
  const data = localStorage.getItem(REPAIRS_KEY);
  return data ? JSON.parse(data) : [];
};

export const addRepair = (repair: Omit<Repair, 'id' | 'createdAt' | 'updatedAt'>): Repair => {
  const repairs = getRepairs();
  const id = repairs.length > 0 
    ? Math.max(...repairs.map(r => r.id)) + 1 
    : 1;
  
  const now = new Date().toISOString();
  const newRepair: Repair = {
    ...repair,
    id,
    createdAt: now,
    updatedAt: now
  };
  
  repairs.push(newRepair);
  saveRepairs(repairs);
  
  return newRepair;
};

export const updateRepair = (id: number, updatedData: Partial<Repair>): Repair | null => {
  const repairs = getRepairs();
  const index = repairs.findIndex(r => r.id === id);
  
  if (index === -1) return null;
  
  repairs[index] = {
    ...repairs[index],
    ...updatedData,
    updatedAt: new Date().toISOString()
  };
  
  saveRepairs(repairs);
  return repairs[index];
};

export const updateRepairStatus = (id: number, status: string): Repair | null => {
  // Hier konvertieren wir den String-Status in den RepairStatus-Typ
  const typedStatus = status as RepairStatus;
  return updateRepair(id, { status: typedStatus });
};

export const removeRepair = (id: number): boolean => {
  const repairs = getRepairs();
  const filteredRepairs = repairs.filter(r => r.id !== id);
  
  if (filteredRepairs.length === repairs.length) {
    return false;
  }
  
  saveRepairs(filteredRepairs);
  return true;
};

// Statistics functions
export const getStatistics = () => {
  const repairs = getRepairs();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return {
    totalOrders: repairs.length,
    inRepair: repairs.filter(r => r.status === 'in_reparatur').length,
    completed: repairs.filter(r => r.status === 'fertig' || r.status === 'abgeholt').length,
    today: repairs.filter(r => {
      const createdDate = new Date(r.createdAt);
      createdDate.setHours(0, 0, 0, 0);
      return createdDate.getTime() === today.getTime();
    }).length,
    readyForPickup: repairs.filter(r => r.status === 'fertig').length,
    outsourced: repairs.filter(r => r.status === 'ausser_haus').length
  };
};

// Typ für gespeicherte Modelle
interface StoredModels {
  [key: string]: string[]; // Format: "deviceType:brand" => ["Modell 1", "Modell 2", ...]
}

// Typ für gespeicherte Marken
interface StoredBrands {
  [key: string]: string[]; // Format: "deviceType" => ["Marke 1", "Marke 2", ...]
}

// Funktion zum Speichern eines Modells für eine bestimmte Gerätetyp/Marke-Kombination
export const saveModel = (deviceType: string, brand: string, model: string): void => {
  if (!deviceType || !brand || !model) return;
  
  const key = `${deviceType}:${brand}`.toLowerCase();
  
  let storedModels: StoredModels = {};
  const storedData = localStorage.getItem(getSavedModelsKey());
  
  if (storedData) {
    try {
      storedModels = JSON.parse(storedData);
    } catch (err) {
      console.error('Fehler beim Parsen der gespeicherten Modelle:', err);
    }
  }
  
  // Erstelle Array für diesen Schlüssel, falls es noch nicht existiert
  if (!storedModels[key]) {
    storedModels[key] = [];
  }
  
  // Füge Modell hinzu, wenn es noch nicht existiert
  if (!storedModels[key].includes(model)) {
    storedModels[key].push(model);
    localStorage.setItem(getSavedModelsKey(), JSON.stringify(storedModels));
  }
};

// Funktion zum Abrufen von gespeicherten Modellen für einen bestimmten Gerätetyp und Marke
export const getModelsForDeviceAndBrand = (deviceType: string, brand: string): string[] => {
  if (!deviceType || !brand) return [];
  
  const key = `${deviceType}:${brand}`.toLowerCase();
  
  const storedData = localStorage.getItem(getSavedModelsKey());
  if (!storedData) return [];
  
  try {
    const storedModels: StoredModels = JSON.parse(storedData);
    return storedModels[key] || [];
  } catch (err) {
    console.error('Fehler beim Abrufen der gespeicherten Modelle:', err);
    return [];
  }
};

// Funktion zum Löschen eines einzelnen Modells
export const deleteModel = (deviceType: string, brand: string, model: string): void => {
  if (!deviceType || !brand) return;
  
  const key = `${deviceType}:${brand}`.toLowerCase();
  
  const storedData = localStorage.getItem(getSavedModelsKey());
  if (!storedData) return;
  
  try {
    const storedModels: StoredModels = JSON.parse(storedData);
    
    if (storedModels[key]) {
      // Filtere das zu löschende Modell heraus
      storedModels[key] = storedModels[key].filter(m => m !== model);
      
      // Wenn die Liste für diesen Key leer ist, entferne den Key
      if (storedModels[key].length === 0) {
        delete storedModels[key];
      }
      
      // Speichere die aktualisierte Liste
      localStorage.setItem(getSavedModelsKey(), JSON.stringify(storedModels));
    }
  } catch (err) {
    console.error('Fehler beim Löschen des Modells:', err);
  }
};

// Funktion zum Zurücksetzen aller gespeicherten Modelle
export const clearAllModels = (): void => {
  try {
    localStorage.removeItem(getSavedModelsKey());
    console.log('Alle gespeicherten Modelle wurden gelöscht.');
  } catch (err) {
    console.error('Fehler beim Zurücksetzen aller Modelle:', err);
  }
};

// Funktionen für die Marken-Verwaltung
export const saveBrand = (deviceType: string, brand: string): void => {
  if (!deviceType || !brand) return;
  
  const key = deviceType.toLowerCase();
  
  let storedBrands: StoredBrands = {};
  const storedData = localStorage.getItem(getSavedBrandsKey());
  
  if (storedData) {
    try {
      storedBrands = JSON.parse(storedData);
    } catch (err) {
      console.error('Fehler beim Parsen der gespeicherten Marken:', err);
    }
  }
  
  // Erstelle Array für diesen Gerätetyp, falls es noch nicht existiert
  if (!storedBrands[key]) {
    storedBrands[key] = [];
  }
  
  // Füge Marke hinzu, wenn sie noch nicht existiert
  if (!storedBrands[key].includes(brand)) {
    storedBrands[key].push(brand);
    localStorage.setItem(getSavedBrandsKey(), JSON.stringify(storedBrands));
  }
};

// Funktion zum Abrufen von gespeicherten Marken für einen bestimmten Gerätetyp
export const getBrandsForDeviceType = (deviceType: string): string[] => {
  if (!deviceType) return [];
  
  const key = deviceType.toLowerCase();
  
  const storedData = localStorage.getItem(getSavedBrandsKey());
  if (!storedData) return [];
  
  try {
    const storedBrands: StoredBrands = JSON.parse(storedData);
    return storedBrands[key] || [];
  } catch (err) {
    console.error('Fehler beim Abrufen der gespeicherten Marken:', err);
    return [];
  }
};

// Funktion zum Löschen einer einzelnen Marke
export const deleteBrand = (deviceType: string, brand: string): void => {
  if (!deviceType) return;
  
  const key = deviceType.toLowerCase();
  
  const storedData = localStorage.getItem(getSavedBrandsKey());
  if (!storedData) return;
  
  try {
    const storedBrands: StoredBrands = JSON.parse(storedData);
    
    if (storedBrands[key]) {
      // Filtere die zu löschende Marke heraus
      storedBrands[key] = storedBrands[key].filter(b => b !== brand);
      
      // Wenn die Liste für diesen Key leer ist, entferne den Key
      if (storedBrands[key].length === 0) {
        delete storedBrands[key];
      }
      
      // Speichere die aktualisierte Liste
      localStorage.setItem(getSavedBrandsKey(), JSON.stringify(storedBrands));
    }
  } catch (err) {
    console.error('Fehler beim Löschen der Marke:', err);
  }
};

// Funktion zum Zurücksetzen aller gespeicherten Marken
export const clearAllBrands = (): void => {
  try {
    localStorage.removeItem(getSavedBrandsKey());
    console.log('Alle gespeicherten Marken wurden gelöscht.');
  } catch (err) {
    console.error('Fehler beim Zurücksetzen aller Marken:', err);
  }
};

// Funktionen für die Gerätetyp-Verwaltung
export const saveDeviceType = (deviceType: string): void => {
  if (!deviceType) return;
  
  // Originalschreibweise beibehalten (nicht mehr in Kleinbuchstaben umwandeln)
  const deviceTypeToSave = deviceType.trim();
  
  let savedDeviceTypes: string[] = [];
  const storedData = localStorage.getItem(getSavedDeviceTypesKey());
  
  if (storedData) {
    try {
      savedDeviceTypes = JSON.parse(storedData);
    } catch (err) {
      console.error('Fehler beim Parsen der gespeicherten Gerätetypen:', err);
    }
  }
  
  // Überprüfe, ob der Gerätetyp bereits existiert (unabhängig von Groß-/Kleinschreibung)
  const exists = savedDeviceTypes.some(
    type => type.toLowerCase() === deviceTypeToSave.toLowerCase()
  );
  
  // Füge Gerätetyp hinzu, wenn er noch nicht existiert
  if (!exists) {
    savedDeviceTypes.push(deviceTypeToSave);
    localStorage.setItem(getSavedDeviceTypesKey(), JSON.stringify(savedDeviceTypes));
    console.log(`Gerätetyp ${deviceTypeToSave} wurde gespeichert.`);
  }
};

// Funktion zum Abrufen von gespeicherten Gerätetypen
export const getSavedDeviceTypes = (): string[] => {
  const storedData = localStorage.getItem(getSavedDeviceTypesKey());
  if (!storedData) return [];
  
  try {
    return JSON.parse(storedData);
  } catch (err) {
    console.error('Fehler beim Abrufen der gespeicherten Gerätetypen:', err);
    return [];
  }
};

// Funktion zum Löschen eines einzelnen Gerätetyps
export const deleteDeviceType = (deviceType: string): void => {
  if (!deviceType) return;
  
  const deviceTypeToDelete = deviceType.trim();
  
  const storedData = localStorage.getItem(getSavedDeviceTypesKey());
  if (!storedData) return;
  
  try {
    const savedDeviceTypes: string[] = JSON.parse(storedData);
    
    // Filtere den zu löschenden Gerätetyp heraus (unabhängig von Groß-/Kleinschreibung)
    const updatedDeviceTypes = savedDeviceTypes.filter(
      dt => dt.toLowerCase() !== deviceTypeToDelete.toLowerCase()
    );
    
    // Speichere die aktualisierte Liste
    localStorage.setItem(getSavedDeviceTypesKey(), JSON.stringify(updatedDeviceTypes));
    console.log(`Gerätetyp ${deviceTypeToDelete} wurde gelöscht.`);
  } catch (err) {
    console.error('Fehler beim Löschen des Gerätetyps:', err);
  }
};

// Funktion zum Zurücksetzen aller gespeicherten Gerätetypen
export const clearAllDeviceTypes = (): void => {
  try {
    localStorage.removeItem(getSavedDeviceTypesKey());
    console.log('Alle gespeicherten Gerätetypen wurden gelöscht.');
  } catch (err) {
    console.error('Fehler beim Zurücksetzen aller Gerätetypen:', err);
  }
};

// Funktionen für die Fehlerbeschreibungen-Verwaltung
const getSavedIssuesKey = () => `${getUserPrefix()}repair-shop-common-issues`;

// Standardfehlerbeschreibungen für verschiedene Gerätetypen
export const DEFAULT_ISSUES = {
  'Smartphone': [
    'Display defekt/gebrochen', 
    'Akku schwach/defekt', 
    'Ladebuchse defekt', 
    'Kein Ton/Mikrofon defekt', 
    'Wasserschaden', 
    'Kamera defekt',
    'Keine Verbindung (WLAN/Bluetooth)',
    'Software-Probleme/Abstürze',
    'Kopfhörerbuchse defekt',
    'Taste(n) defekt'
  ],
  'Tablet': [
    'Display defekt/gebrochen', 
    'Akku schwach/defekt', 
    'Ladebuchse defekt',
    'Wasserschaden',
    'Software-Probleme/Abstürze',
    'Keine Verbindung (WLAN)', 
    'Taste(n) defekt',
    'Kamera defekt'
  ],
  'Watch': [
    'Display defekt/gebrochen',
    'Akku schwach/defekt',
    'Ladeproblem',
    'Wasserschaden',
    'Armband defekt/Austausch',
    'Software-Probleme',
    'Sensoren defekt',
    'Verbindungsprobleme'
  ],
  'Laptop': [
    'Display defekt/gebrochen',
    'Akku schwach/defekt',
    'Tastatur defekt',
    'Touchpad defekt',
    'Wasserschaden',
    'Überhitzung/Lüfter laut',
    'Festplatte/SSD-Fehler',
    'Anschlüsse defekt',
    'Software-Probleme',
    'Kein Ton/Lautsprecher defekt'
  ],
  'Spielekonsole': [
    'Startet nicht mehr',
    'Liest keine Discs',
    'Überhitzung',
    'Controller defekt',
    'Anschlüsse defekt',
    'Laute Geräusche',
    'Software-Fehler',
    'HDMI-Ausgang defekt',
    'Disc-Laufwerk klemmt'
  ],
  'Andere': [
    'Gerät startet nicht',
    'Wasserschaden',
    'Hardware-Fehler',
    'Software-Probleme',
    'Stromversorgung defekt',
    'Anschlüsse defekt'
  ]
};

// Funktion zum Speichern benutzerdefinierter Fehlerbeschreibungen pro Gerätetyp
export const saveIssue = (deviceType: string, issue: string): void => {
  if (!deviceType || !issue) return;
  
  const key = deviceType.toLowerCase();
  let storedIssues: Record<string, string[]> = {};
  const storedData = localStorage.getItem(getSavedIssuesKey());
  
  if (storedData) {
    try {
      storedIssues = JSON.parse(storedData);
    } catch (err) {
      console.error('Fehler beim Parsen der gespeicherten Fehlerbeschreibungen:', err);
    }
  }
  
  // Erstelle Array für diesen Gerätetyp, falls es noch nicht existiert
  if (!storedIssues[key]) {
    storedIssues[key] = [];
  }
  
  // Füge Fehlerbeschreibung hinzu, wenn sie noch nicht existiert
  if (!storedIssues[key].includes(issue)) {
    storedIssues[key].push(issue);
    localStorage.setItem(getSavedIssuesKey(), JSON.stringify(storedIssues));
  }
};

// Funktion zum Abrufen von Fehlerbeschreibungen für einen bestimmten Gerätetyp
export const getIssuesForDeviceType = (deviceType: string): string[] => {
  if (!deviceType) return [];
  
  const key = deviceType.toLowerCase();
  const storedData = localStorage.getItem(getSavedIssuesKey());
  let customIssues: string[] = [];
  let deletedIssues: string[] = [];
  
  // Lade benutzerdefinierte Fehlerbeschreibungen und Löschmarker
  if (storedData) {
    try {
      const storedIssues: Record<string, string[]> = JSON.parse(storedData);
      const storedItems = storedIssues[key] || [];
      
      // Trenne Löschmarker von regulären Fehlerbeschreibungen
      customIssues = storedItems.filter(item => !item.startsWith('__DELETE__'));
      
      // Extrahiere die zu löschenden Fehlerbeschreibungen aus den Markern
      deletedIssues = storedItems
        .filter(item => item.startsWith('__DELETE__'))
        .map(item => item.replace('__DELETE__', ''));
    } catch (err) {
      console.error('Fehler beim Abrufen der gespeicherten Fehlerbeschreibungen:', err);
    }
  }
  
  // Kombiniere mit Standardfehlerbeschreibungen
  const deviceTypeKey = Object.keys(DEFAULT_ISSUES).find(
    dt => dt.toLowerCase() === deviceType.toLowerCase()
  ) || 'Andere';
  
  const defaultIssues = DEFAULT_ISSUES[deviceTypeKey as keyof typeof DEFAULT_ISSUES] || [];
  
  // Kombiniere Standardfehlerbeschreibungen und benutzerdefinierte Beschreibungen
  // und filtere gelöschte Fehlerbeschreibungen heraus
  const combinedArray = [...defaultIssues, ...customIssues]
    .filter(item => !deletedIssues.includes(item));
  
  // Entferne Duplikate
  return combinedArray.filter((item, index) => combinedArray.indexOf(item) === index);
};

// Funktion zum Löschen einer Fehlerbeschreibung (auch Standard-Fehlerbeschreibungen)
export const deleteIssue = (deviceType: string, issue: string): void => {
  if (!deviceType) return;
  
  const key = deviceType.toLowerCase();
  
  const storedData = localStorage.getItem(getSavedIssuesKey());
  let storedIssues: Record<string, string[]> = {};
  
  if (storedData) {
    try {
      storedIssues = JSON.parse(storedData);
    } catch (err) {
      console.error('Fehler beim Parsen der gespeicherten Fehlerbeschreibungen:', err);
    }
  }
  
  // Erstelle Array für diesen Gerätetyp, falls es noch nicht existiert
  if (!storedIssues[key]) {
    storedIssues[key] = [];
  }
  
  // 1. Lösche die vorhandene Fehlerbeschreibung, falls vorhanden
  storedIssues[key] = storedIssues[key].filter(i => i !== issue);
  
  // 2. Füge einen Marker ein, der anzeigt, dass diese Fehlerbeschreibung gelöscht werden soll
  // Wir verwenden ein spezielles Präfix für den Marker
  const deleteMarker = `__DELETE__${issue}`;
  if (!storedIssues[key].includes(deleteMarker)) {
    storedIssues[key].push(deleteMarker);
  }
      
  // Speichere die aktualisierte Liste
  localStorage.setItem(getSavedIssuesKey(), JSON.stringify(storedIssues));
  
  console.log(`Fehlerbeschreibung "${issue}" für ${deviceType} wurde gelöscht.`);
};

// Funktion zum Zurücksetzen aller gespeicherten benutzerdefinierten Fehlerbeschreibungen
export const clearAllIssues = (): void => {
  try {
    localStorage.removeItem(getSavedIssuesKey());
    console.log('Alle gespeicherten benutzerdefinierten Fehlerbeschreibungen wurden gelöscht.');
  } catch (err) {
    console.error('Fehler beim Zurücksetzen aller Fehlerbeschreibungen:', err);
  }
};