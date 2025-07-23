import type { Express } from "express";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import type { User } from "@shared/schema";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export function setupEmployeeRoutes(app: Express) {
  // Mitarbeiter abrufen (nur für Shop-Owner)
  app.get("/api/employees", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Nicht angemeldet" });
    }

    const user = req.user;
    if (user.role !== 'owner') {
      return res.status(403).json({ message: "Keine Berechtigung" });
    }

    try {
      const employees = await storage.getEmployeesByShopOwner(user.id);
      res.json(employees);
    } catch (error) {
      console.error("Fehler beim Abrufen der Mitarbeiter:", error);
      res.status(500).json({ message: "Serverfehler" });
    }
  });

  // Neuen Mitarbeiter erstellen (nur für Shop-Owner)
  app.post("/api/employees", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Nicht angemeldet" });
    }

    const user = req.user;
    if (user.role !== 'owner') {
      return res.status(403).json({ message: "Keine Berechtigung" });
    }

    const { username, password, email, firstName, lastName } = req.body;

    if (!username || !password || !email || !firstName || !lastName) {
      return res.status(400).json({ message: "Alle Felder sind erforderlich" });
    }

    try {
      // Prüfen ob Benutzername bereits existiert
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Benutzername bereits vergeben" });
      }

      // Neuen Mitarbeiter erstellen
      const hashedPassword = await hashPassword(password);
      const newEmployee = await storage.createEmployee({
        username,
        password: hashedPassword,
        email,
        firstName,
        lastName,
        role: 'employee',
        parentUserId: user.id,
        shopId: user.shopId,
        isActive: true, // Mitarbeiter sind standardmäßig aktiv
      });

      res.status(201).json(newEmployee);
    } catch (error) {
      console.error("Fehler beim Erstellen des Mitarbeiters:", error);
      res.status(500).json({ message: "Serverfehler" });
    }
  });

  // Mitarbeiter aktivieren/deaktivieren
  app.patch("/api/employees/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Nicht angemeldet" });
    }

    const user = req.user;
    if (user.role !== 'owner') {
      return res.status(403).json({ message: "Keine Berechtigung" });
    }

    const employeeId = parseInt(req.params.id);
    const { isActive } = req.body;

    try {
      // Prüfen ob der Mitarbeiter zum Shop gehört
      const employee = await storage.getUser(employeeId);
      if (!employee || employee.parentUserId !== user.id) {
        return res.status(404).json({ message: "Mitarbeiter nicht gefunden" });
      }

      const updatedEmployee = await storage.updateEmployeeStatus(employeeId, isActive);
      res.json(updatedEmployee);
    } catch (error) {
      console.error("Fehler beim Aktualisieren des Mitarbeiters:", error);
      res.status(500).json({ message: "Serverfehler" });
    }
  });

  // Mitarbeiter löschen
  app.delete("/api/employees/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Nicht angemeldet" });
    }

    const user = req.user;
    if (user.role !== 'owner') {
      return res.status(403).json({ message: "Keine Berechtigung" });
    }

    const employeeId = parseInt(req.params.id);

    try {
      // Prüfen ob der Mitarbeiter zum Shop gehört
      const employee = await storage.getUser(employeeId);
      if (!employee || employee.parentUserId !== user.id) {
        return res.status(404).json({ message: "Mitarbeiter nicht gefunden" });
      }

      await storage.deleteEmployee(employeeId);
      res.status(204).send();
    } catch (error) {
      console.error("Fehler beim Löschen des Mitarbeiters:", error);
      res.status(500).json({ message: "Serverfehler" });
    }
  });
}