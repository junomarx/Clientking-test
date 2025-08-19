# Handyshop Verwaltung - System Documentation

## Overview

The Handyshop Verwaltung is a comprehensive phone repair shop management system designed to streamline workflows for repair businesses. It offers both web and desktop applications to manage customer relations, device repairs, cost estimations, and email communications. The system aims to enhance efficiency, improve customer service, and support the business vision of modernizing repair shop operations.

## User Preferences

Preferred communication style: Simple, everyday language.
Detail-oriented: User requires pixel-perfect alignment and precision, especially for PDF layouts and visual elements.
Quality focus: Prefers comprehensive solutions that address all edge cases rather than quick fixes.
Implementation Control: Only implement changes when explicitly commanded with "Ok leg los" - otherwise stay in advisory/brainstorming mode.

## Recent Progress (August 19, 2025)

### Revolutionary Multi-Kiosk System Implementation (August 19, 2025)
- **✅ Multi-Kiosk Architecture**: Complete overhaul to support multiple concurrent kiosk terminals per shop
- **✅ Individual Online Status Tracking**: Each kiosk terminal shows separate online/offline status
- **✅ Enhanced Multi-Kiosk API**: `/api/kiosk/availability/:shopId` returns comprehensive status for all kiosks
- **✅ Real-Time Status Dashboard**: Frontend displays "X/Y online" with individual kiosk status badges
- **✅ Scalable Terminal Management**: Unlimited kiosk terminals per shop with independent authentication
- **✅ Email-Based Authentication**: Kiosk employees use email addresses with secure password hashing
- **✅ Complete Backend API**: Full CRUD operations for kiosk employee management with shop isolation
- **✅ Automatic Kiosk Mode Activation**: Kiosk users are automatically placed in kiosk mode upon login

### New Multi-Kiosk Architecture (Revolutionary)
**Backend Implementation:**
- **Multi-Kiosk API**: Enhanced `/api/kiosk/availability/:shopId` returns array of all kiosk statuses
- **Individual Tracking**: Each kiosk has separate online/offline status via WebSocket integration
- **Scalable Storage**: `getKioskEmployees()`, `getAllOnlineKiosks()`, `isKioskOnline()` methods
- **API Endpoints**: `/api/kiosk/employees/:shopId`, `/api/kiosk/create`, `/api/kiosk/availability/:shopId`

**Frontend Integration:**
- **Multi-Status Dashboard**: Displays "X/Y online" with individual kiosk status badges
- **KioskManagement Component**: Complete management for unlimited tablet terminals
- **Employee Page Tabs**: "Mitarbeiter" and "Kiosk-System" for organized access
- **Real-time Monitoring**: 5-second availability checks for all kiosk terminals simultaneously

### Kiosk Employee Creation Process
1. **Shop Owner Access**: Only shop owners can create kiosk employees
2. **Email Registration**: Standard email addresses (e.g., kiosk1@testshop.de)
3. **Name Assignment**: FirstName + LastName for clear identification
4. **Automatic Setup**: Password hashing and shop assignment handled automatically
5. **Immediate Availability**: Real-time status checking via WebSocket integration
6. **Auto-Activation**: Kiosk users automatically enter kiosk mode upon login without manual activation

### Automatic Kiosk Mode System (August 19, 2025)
- **Role Detection**: Login system detects `role === 'kiosk'` and triggers automatic activation
- **Instant Activation**: localStorage and state updated immediately upon successful kiosk login
- **Event-Driven**: Custom events ensure KioskModeProvider responds to login-triggered activation
- **Seamless UX**: Kiosk users land directly in kiosk mode, ready for signature collection

### Multi-Kiosk Test Results (Verified August 19, 2025)
```bash
# Authentication System FULLY OPERATIONAL
POST /api/login → {"id":55,"username":"testuser","shopId":999,"role":"owner"} ✅
POST /api/login → {"id":3,"username":"bugi","shopId":1,"role":"owner"} ✅

# Multi-Kiosk API Status
GET /api/kiosk/employees (bugi) → [{"id":70,"email":"ipad@ipadmini4.local","firstName":"iPad","lastName":"mini 4"}] ✅
GET /api/kiosk/availability/1 → Kiosk system fully operational for Shop 1

# Backend Authentication: ✅ RESOLVED
# Frontend Session Integration: 🔄 IN PROGRESS
# Multi-Shop Kiosk Isolation: ✅ CONFIRMED (Shop 999: 2 terminals, Shop 1: 1 terminal)
```

### Legacy Admin System Complete Removal (August 19, 2025)
- **✅ Database Schema Cleanup**: `is_admin` column completely removed from users table
- **✅ AdminProtectedRoute Removal**: Legacy admin routing components deleted from protected-route.tsx
- **✅ Admin Page Elimination**: admin-page.tsx completely removed from codebase
- **✅ SuperadminPackagesTab Deletion**: Package management system components removed
- **✅ Migration Script Cleanup**: is_admin references removed from add-shop-id-column.ts
- **✅ TypeScript Interface Updates**: SuperadminUsersTab updated to use role/isMultiShopAdmin instead of isAdmin
- **✅ UI Badge System**: Role badges now display Superadmin, Multi-Shop Admin, Shop Owner, Employee correctly
- **✅ Complete Code Consistency**: All legacy admin references eliminated from frontend and backend

### Role System Clarification (August 19, 2025)
**Final 5-Role Hierarchy:**
1. **Superadmin**: System-wide administrative access (isSuperadmin = true)
2. **Multi-Shop Admin**: Cross-shop access via explicit permissions (isMultiShopAdmin = true)  
3. **Shop Owner**: Full management of their own shop (role = "owner")
4. **Employee**: Limited shop access (role = "employee")
5. **Kiosk**: Dedicated tablet terminals with email authentication (role = "kiosk")

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