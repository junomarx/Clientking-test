// Customer model
export interface Customer {
  id: number;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  address?: string;
  zipCode?: string;
  city?: string;
  createdAt: string;
}

// Device types
export type DeviceType = 'smartphone' | 'tablet' | 'laptop';

// Repair statuses
export type RepairStatus = 'eingegangen' | 'in_reparatur' | 'fertig' | 'abgeholt' | 'ausser_haus';

// Repair model
export interface Repair {
  id: number;
  orderCode?: string | null; // Neue Auftragsnummer im Format: [Marke][Geräteart][4 Ziffern], z.B. AS1496
  customerId: number;
  deviceType: DeviceType;
  brand: string;
  model: string;
  serialNumber?: string | null;
  issue: string;
  estimatedCost?: string | null;
  depositAmount?: string | null;
  status: RepairStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  reviewRequestSent?: boolean;
}

// Extended repair with customer name for display
export interface RepairWithCustomer extends Repair {
  customerName: string;
}

// Extended customer with order count and last order date for display
export interface CustomerWithOrders extends Customer {
  orderCount: number;
  lastOrderDate: string | null;
}

// Statistics interface
export interface RepairStatistics {
  totalOrders: number;
  inRepair: number;
  completed: number;
  today: number;
  readyForPickup: number;
  outsourced: number;
}
