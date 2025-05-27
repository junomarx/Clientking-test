// Electron API Interface für lokale Desktop-App
interface ElectronAPI {
  dbQuery: (query: string, params?: any[]) => Promise<any>;
  getAppVersion: () => Promise<string>;
  checkLicenseStatus: () => Promise<{ valid: boolean; message: string }>;
  platform: string;
  isElectron: boolean;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

// Prüfen ob wir in der Electron-App laufen
export const isElectronApp = (): boolean => {
  return typeof window !== 'undefined' && !!window.electronAPI;
};

// Lokale Datenbank-Operationen für Electron
export class ElectronStorage {
  private async query(sql: string, params: any[] = []): Promise<any> {
    if (!window.electronAPI) {
      throw new Error('Electron API nicht verfügbar');
    }
    return await window.electronAPI.dbQuery(sql, params);
  }

  // Kunden-Operationen
  async getCustomers() {
    return await this.query('SELECT * FROM customers ORDER BY lastName, firstName');
  }

  async createCustomer(customer: any) {
    const { firstName, lastName, email, phone, address } = customer;
    const result = await this.query(
      'INSERT INTO customers (firstName, lastName, email, phone, address) VALUES (?, ?, ?, ?, ?)',
      [firstName, lastName, email, phone, address]
    );
    return { id: result.lastInsertRowid, ...customer };
  }

  async updateCustomer(id: number, customer: any) {
    const { firstName, lastName, email, phone, address } = customer;
    await this.query(
      'UPDATE customers SET firstName = ?, lastName = ?, email = ?, phone = ?, address = ? WHERE id = ?',
      [firstName, lastName, email, phone, address, id]
    );
    return { id, ...customer };
  }

  async deleteCustomer(id: number) {
    await this.query('DELETE FROM customers WHERE id = ?', [id]);
    return true;
  }

  // Reparatur-Operationen
  async getRepairs() {
    const query = `
      SELECT 
        r.*,
        c.firstName || ' ' || c.lastName as customerName,
        c.phone as customerPhone,
        c.email as customerEmail
      FROM repairs r
      JOIN customers c ON r.customerId = c.id
      ORDER BY r.createdAt DESC
    `;
    return await this.query(query);
  }

  async createRepair(repair: any) {
    const {
      orderCode, customerId, deviceType, brand, model,
      serialNumber, issue, estimatedCost, notes
    } = repair;
    
    const result = await this.query(
      `INSERT INTO repairs 
       (orderCode, customerId, deviceType, brand, model, serialNumber, issue, estimatedCost, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [orderCode, customerId, deviceType, brand, model, serialNumber, issue, estimatedCost, notes]
    );
    
    return { id: result.lastInsertRowid, ...repair };
  }

  async updateRepair(id: number, repair: any) {
    const fields = Object.keys(repair).filter(key => repair[key] !== undefined);
    const values = fields.map(key => repair[key]);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    
    await this.query(
      `UPDATE repairs SET ${setClause}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
      [...values, id]
    );
    
    return { id, ...repair };
  }

  async updateRepairStatus(id: number, status: string) {
    await this.query(
      'UPDATE repairs SET status = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
      [status, id]
    );
    return true;
  }

  async deleteRepair(id: number) {
    await this.query('DELETE FROM repairs WHERE id = ?', [id]);
    return true;
  }

  // Statistiken
  async getStats() {
    const stats: any = {};
    
    // Gesamte Aufträge
    const totalResult = await this.query('SELECT COUNT(*) as count FROM repairs');
    stats.totalOrders = totalResult[0].count;
    
    // Status-basierte Statistiken
    const statusStats = await this.query(`
      SELECT status, COUNT(*) as count 
      FROM repairs 
      GROUP BY status
    `);
    
    stats.inRepair = 0;
    stats.completed = 0;
    stats.readyForPickup = 0;
    stats.received = 0;
    stats.outsourced = 0;
    
    statusStats.forEach((stat: any) => {
      switch(stat.status) {
        case 'in_reparatur':
          stats.inRepair = stat.count;
          break;
        case 'abgeholt':
          stats.completed = stat.count;
          break;
        case 'abholbereit':
          stats.readyForPickup = stat.count;
          break;
        case 'eingegangen':
          stats.received = stat.count;
          break;
        case 'ausser_haus':
          stats.outsourced = stat.count;
          break;
      }
    });
    
    // Heutige Aufträge
    const todayResult = await this.query(`
      SELECT COUNT(*) as count 
      FROM repairs 
      WHERE date(createdAt) = date('now')
    `);
    stats.today = todayResult[0].count;
    
    return stats;
  }

  // Geschäftseinstellungen
  async getBusinessSettings() {
    const result = await this.query('SELECT * FROM business_settings LIMIT 1');
    return result[0] || null;
  }

  async updateBusinessSettings(settings: any) {
    const existing = await this.getBusinessSettings();
    
    if (existing) {
      const fields = Object.keys(settings);
      const values = fields.map(key => settings[key]);
      const setClause = fields.map(field => `${field} = ?`).join(', ');
      
      await this.query(
        `UPDATE business_settings SET ${setClause} WHERE id = ?`,
        [...values, existing.id]
      );
    } else {
      const fields = Object.keys(settings);
      const values = fields.map(key => settings[key]);
      const placeholders = fields.map(() => '?').join(', ');
      
      await this.query(
        `INSERT INTO business_settings (${fields.join(', ')}) VALUES (${placeholders})`,
        values
      );
    }
    
    return settings;
  }

  // App-Informationen
  async getAppVersion(): Promise<string> {
    if (!window.electronAPI) {
      return 'Web-Version';
    }
    return await window.electronAPI.getAppVersion();
  }

  // Lizenz-Status
  async checkLicenseStatus() {
    if (!window.electronAPI) {
      return { valid: true, message: 'Web-Version' };
    }
    return await window.electronAPI.checkLicenseStatus();
  }
}

export const electronStorage = new ElectronStorage();