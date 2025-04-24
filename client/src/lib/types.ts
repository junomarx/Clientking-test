// Customer model
export interface Customer {
  id: number;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  createdAt: string;
}

// Device types
export type DeviceType = 'smartphone' | 'tablet' | 'laptop';

// Repair statuses
export type RepairStatus = 'eingegangen' | 'in_reparatur' | 'fertig' | 'abgeholt' | 'ausser_haus';

// Repair model
export interface Repair {
  id: number;
  customerId: number;
  deviceType: DeviceType;
  brand: string;
  model: string;
  serialNumber?: string | null;
  issue: string;
  estimatedCost?: string | null;
  status: RepairStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
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
