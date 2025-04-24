import { Customer, Repair } from './types';

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
  return updateRepair(id, { status });
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
    }).length
  };
};
