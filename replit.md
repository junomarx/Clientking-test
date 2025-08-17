# Handyshop Verwaltung - System Documentation

## Overview

The Handyshop Verwaltung is a comprehensive phone repair shop management system designed to streamline workflows for repair businesses. It offers both web and desktop applications to manage customer relations, device repairs, cost estimations, and email communications. The system aims to enhance efficiency, improve customer service, and support the business vision of modernizing repair shop operations.

## User Preferences

Preferred communication style: Simple, everyday language.
Detail-oriented: User requires pixel-perfect alignment and precision, especially for PDF layouts and visual elements.
Quality focus: Prefers comprehensive solutions that address all edge cases rather than quick fixes.
Implementation Control: Only implement changes when explicitly commanded with "Ok leg los" - otherwise stay in advisory/brainstorming mode.

## Recent Progress (August 17, 2025)

### Multi-Shop Permission System Implementation (COMPLETE)
- **✅ Permission Database Table**: `multi_shop_permissions` Tabelle für explizite Zugriffskontrolle erstellt
- **✅ Permission API**: Vollständige API-Endpunkte (`/api/permissions/pending`, `grant`, `revoke`) implementiert
- **✅ DSGVO-konformes Pop-up System**: PermissionDialog Komponente für Shop-Owner Permission-Anfragen
- **✅ Automatische Permission-Dialoge**: Home.tsx zeigt Pop-ups für ausstehende Berechtigungsanfragen
- **✅ Permission-basierte Zugriffskontrolle**: Multi-Shop Service nutzt explizite Permissions statt direkter Shop-Zuweisung
- **✅ Explizite Einverständniserklärung**: Shop-Owner müssen Multi-Shop Admin Zugriff explizit genehmigen

### Multi-Shop Interface Fixes (August 17, 2025)
- **✅ getAllMultiShopAdmins Method**: Implementierung in storage.ts für Superadmin Multi-Shop Liste
- **✅ MultiShopAdminDetailsDialog**: Vollständiger Dialog für Admin-Details mit Shop-Liste und Widerrufs-Funktionen
- **✅ TypeScript Error Fixes**: Alle Interface-Kompatibilitätsprobleme behoben
- **✅ Superadmin Logout Fix**: Korrekte useAuth Hook Integration für einwandfreie Weiterleitung nach Logout

### Shop-Dropdown Duplikate Fix (August 17, 2025)
- **✅ Database Cleanup**: 5 doppelte `business_settings` Einträge bereinigt
- **✅ API Optimization**: `/api/superadmin/shops` verwendet `DISTINCT ON (shop_id)` für einzigartige Shops
- **✅ Frontend Safeguards**: Zusätzliche Duplikat-Filterung in MultiShopManagement Komponente
- **✅ Verification**: Shop-Dropdowns zeigen jetzt nur noch 13 einzigartige Shops ohne Duplikate

### Permission System Workflow
1. **Multi-Shop Admin** erstellt Zugriffs-Anfrage für einen Shop
2. **Shop-Owner** erhält automatisches Pop-up bei nächstem Login
3. **Explizite Zustimmung** durch "Erlauben" Button im DSGVO-konformen Dialog
4. **Vollständiger Datenzugriff** für Multi-Shop Admin nach Zustimmung
5. **Widerruf jederzeit möglich** durch Shop-Owner

### Login-Credentials für Multi-Shop Admin
- **Username**: "monking" 
- **Password**: "monking123"
- **Permission-basierter Zugriff**: Benötigt explizite Zustimmung von Shop-Ownern

### Test-Scenario (erfolgreich implementiert)
- **Permission-Anfrage**: monking (ID: 67) → Shop 999 (testuser)
- **Status**: Permission gewährt, vollständiger Datenzugriff verfügbar
- **DSGVO-Konformität**: Durch explizite Einverständniserklärung gewährleistet

## Brainstorming Ideas (August 2025)

### Superadmin Dashboard Enhancements
- **Anonymized Device Statistics**: System-wide repair statistics without shop identification, organized by:
  - Geräteart (Device Type): Total repairs per category
  - Geräteart + Hersteller (Device Type + Brand): Breakdown by manufacturer
  - Geräteart + Hersteller + Modell (Device Type + Brand + Model): Full device model breakdown
  - Purpose: Market trend analysis, spare parts planning, business intelligence without compromising shop privacy

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, using Vite for building.
- **UI Components**: Radix UI with custom Tailwind CSS styling.
- **State Management**: TanStack React Query for server state and React Hook Form with Zod for form handling and validation.
- **Desktop Support**: Electron for native desktop applications.

### Backend Architecture
- **Runtime**: Node.js with TypeScript (ESM modules).
- **Framework**: Express.js for REST API.
- **Database**: PostgreSQL (Neon serverless) managed via Drizzle ORM.
- **Authentication**: Session-based with `express-session`, supporting role-based access for shop owners and employees. Employees authenticate via email, owners via username.
- **Email Service**: Integrated SMTP for customizable, template-based email communications via Brevo.
- **File Uploads**: `express-fileupload` middleware.

### Database Design
- **Multi-tenant Architecture**: Data isolation per shop using `shopId`.
- **User Management**: Role-based access (admin/owner/employee). Employee usernames are for internal audit trails, not authentication.
- **Device Management**: Hierarchical categorization (Types → Brands → Models).
- **Repair Tracking**: Comprehensive workflow from intake to completion, including loaner device management and audit trails for status changes.
- **Email Templates**: Customizable with variable substitution.

### Key Features & Technical Implementations
- **User & Authentication**: Secure session-based authentication, multi-shop isolation, and role-based access control with four distinct roles:
  - **Superadmin**: System-wide administrative access
  - **Multi-Shop Admin**: Cross-shop administrative access via explicit permissions  
  - **Shop Owner**: Full management of their own shop (NOT admin role)
  - **Employee**: Limited access to core functions (repairs, customers, estimates)
- **Customer & Repair Management**: Detailed customer information, status-driven repair tracking, device categorization, issue tracking, and automated notifications. Includes QR-code based signature for drop-off and pickup, with loaner device management integrated into the repair workflow.
- **Cost Estimation**: Dynamic estimate generation with vector-based PDF export. Implemented precision-aligned PDF generation using jsPDF with pixel-perfect column alignment, logo support via Base64 encoding, and harmonious A4 page utilization. Full edit functionality with correct field mapping for serialNumber (snake_case backend) and issue descriptions (August 2025).
- **Email Communication**: Template-based system with variable substitution and email history. System-wide emails use superadmin-configured SMTP settings.
- **Device Management**: Hierarchical organization and spare parts tracking.
- **UI/UX Decisions**: Consistent design language across web and desktop applications. Utilizes compact layouts, subtle dropdowns for status changes, and mobile-optimized interfaces for tables and dialogs. Kiosk mode is designed for clear, full-screen interaction with dynamic logo support.
- **Audit Trail**: Tracks user actions for status changes, loaner device operations, and QR-code workflows. Records "created by" information for repairs and prevents unauthorized deletions by employees.

## External Dependencies

- **@neondatabase/serverless**: Serverless PostgreSQL database.
- **drizzle-orm**: ORM for type-safe database interactions.
- **@radix-ui/react-\***: Primitives for UI components.
- **@tanstack/react-query**: Server state management library.
- **nodemailer**: Library for sending emails.
- **vite**: Frontend build tool.
- **typescript**: Language for type safety.
- **tailwindcss**: Utility-first CSS framework.
- **electron**: Framework for building desktop applications.
- **esbuild**: Bundler for server-side code.
- **Brevo (formerly SendinBlue)**: SMTP service integration for email delivery.
```