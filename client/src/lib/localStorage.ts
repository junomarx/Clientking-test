import { Customer, Repair, RepairStatus } from './types';

const CUSTOMERS_KEY = 'repair-shop-customers';
const REPAIRS_KEY = 'repair-shop-repairs';

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

// Konstante für den localStorage Key der gespeicherten Modelle und Marken
const SAVED_MODELS_KEY = 'repair-shop-models';
const SAVED_BRANDS_KEY = 'repair-shop-brands';

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
  const storedData = localStorage.getItem(SAVED_MODELS_KEY);
  
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
    localStorage.setItem(SAVED_MODELS_KEY, JSON.stringify(storedModels));
  }
};

// Funktion zum Abrufen von gespeicherten Modellen für einen bestimmten Gerätetyp und Marke
export const getModelsForDeviceAndBrand = (deviceType: string, brand: string): string[] => {
  if (!deviceType || !brand) return [];
  
  const key = `${deviceType}:${brand}`.toLowerCase();
  
  const storedData = localStorage.getItem(SAVED_MODELS_KEY);
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
  
  const storedData = localStorage.getItem(SAVED_MODELS_KEY);
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
      localStorage.setItem(SAVED_MODELS_KEY, JSON.stringify(storedModels));
    }
  } catch (err) {
    console.error('Fehler beim Löschen des Modells:', err);
  }
};

// Funktion zum Zurücksetzen aller gespeicherten Modelle
export const clearAllModels = (): void => {
  try {
    localStorage.removeItem(SAVED_MODELS_KEY);
  } catch (err) {
    console.error('Fehler beim Zurücksetzen aller Modelle:', err);
  }
};

// Funktionen für die Marken-Verwaltung
export const saveBrand = (deviceType: string, brand: string): void => {
  if (!deviceType || !brand) return;
  
  const key = deviceType.toLowerCase();
  
  let storedBrands: StoredBrands = {};
  const storedData = localStorage.getItem(SAVED_BRANDS_KEY);
  
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
    localStorage.setItem(SAVED_BRANDS_KEY, JSON.stringify(storedBrands));
  }
};

// Funktion zum Abrufen von gespeicherten Marken für einen bestimmten Gerätetyp
export const getBrandsForDeviceType = (deviceType: string): string[] => {
  if (!deviceType) return [];
  
  const key = deviceType.toLowerCase();
  
  const storedData = localStorage.getItem(SAVED_BRANDS_KEY);
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
  
  const storedData = localStorage.getItem(SAVED_BRANDS_KEY);
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
      localStorage.setItem(SAVED_BRANDS_KEY, JSON.stringify(storedBrands));
    }
  } catch (err) {
    console.error('Fehler beim Löschen der Marke:', err);
  }
};

// Funktion zum Zurücksetzen aller gespeicherten Marken
export const clearAllBrands = (): void => {
  try {
    localStorage.removeItem(SAVED_BRANDS_KEY);
  } catch (err) {
    console.error('Fehler beim Zurücksetzen aller Marken:', err);
  }
};
