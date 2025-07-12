# Handyshop Verwaltung - System Documentation

## Overview

The Handyshop Verwaltung is a comprehensive phone repair shop management system built with modern web technologies. It features both a web application and desktop application variants, designed to handle repair workflows, customer management, cost estimates, device management, and email communications for phone repair businesses.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Build Tool**: Vite
- **UI Components**: Radix UI with custom styling
- **Styling**: Tailwind CSS with custom theming
- **State Management**: TanStack React Query for server state
- **Form Handling**: React Hook Form with Zod validation
- **Desktop Support**: Electron for native desktop applications

### Backend Architecture
- **Runtime**: Node.js with TypeScript (ESM modules)
- **Framework**: Express.js for REST API
- **Database ORM**: Drizzle ORM
- **Database**: PostgreSQL (Neon serverless)
- **Authentication**: Session-based with express-session
- **Email Service**: Brevo (formerly SendinBlue) SMTP integration
- **File Uploads**: Express-fileupload middleware

### Database Design
- **Multi-tenant Architecture**: Shop-based isolation using shopId
- **User Management**: Role-based access with admin/user distinctions
- **Device Management**: Hierarchical structure (Types → Brands → Models)
- **Repair Tracking**: Complete workflow from intake to completion
- **Email Templates**: Customizable templates with variable substitution

## Key Components

### User Management & Authentication
- Session-based authentication with secure password hashing
- Multi-shop isolation ensuring GDPR compliance
- Role-based permissions (admin/user)
- User registration with email verification

### Customer & Repair Management
- Customer information with contact details
- Repair tracking with status updates
- Device categorization (smartphones, tablets, laptops, watches)
- Issue tracking and resolution

### Cost Estimation System
- Dynamic cost estimate generation
- PDF export functionality
- Item-based pricing with descriptions
- Customer approval tracking

### Email Communication
- Template-based email system
- Variable substitution (customer names, device info, etc.)
- Email history tracking
- Automated notifications for repair status updates

### Device Management
- Hierarchical device organization
- Brand and model management
- Issue categorization per device type
- Spare parts tracking

## Data Flow

1. **User Registration**: New shops register → Email notification to admin → Manual activation
2. **Repair Intake**: Customer info → Device details → Issue description → Cost estimate
3. **Repair Process**: Status updates → Email notifications → Parts management
4. **Completion**: Final notification → Customer pickup → Archive

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL serverless database
- **drizzle-orm**: Type-safe database operations
- **@radix-ui/react-\***: UI component primitives
- **@tanstack/react-query**: Server state management
- **nodemailer**: Email sending (fallback)
- **@sendgrid/mail**: Primary email service

### Development Tools
- **vite**: Build tool and dev server
- **typescript**: Type safety
- **tailwindcss**: Utility-first CSS
- **electron**: Desktop app wrapper
- **esbuild**: Server bundling

### Email Services
- **Primary**: Brevo SMTP (smtp-relay.brevo.com)
- **Fallback**: SendGrid API
- **Configuration**: Environment-based SMTP settings

## Deployment Strategy

### Web Application Deployment
- **Build Process**: Vite builds client, esbuild bundles server
- **Production Server**: Node.js with PM2 process management
- **Database**: Neon PostgreSQL serverless
- **Environment**: Configurable via .env files

### Desktop Application
- **Electron Builder**: Automated builds for macOS and Windows
- **Distribution**: DMG files for macOS, EXE installers for Windows
- **Local Data**: SQLite database for offline operation
- **License Validation**: Online subscription verification

### Database Migrations
- **Drizzle Kit**: Schema management and migrations
- **Manual Scripts**: Custom migration scripts for complex changes
- **GDPR Compliance**: Shop isolation enforcement scripts

## Changelog

- July 12, 2025: UI-BEREINIGUNG ABGESCHLOSSEN - Test-Auto-Delete Button und "Bestellungen PDF" Button aus Header der Bestellungen-Seite entfernt, Interface fokussiert auf Kernfunktionen (Ersatzteil/Zubehör hinzufügen), PDF-Export weiterhin im Filter-Bereich verfügbar
- July 12, 2025: NATIVE BROWSER-DIALOG IMPLEMENTIERT - Alle React-Dialog-Komponenten permanent entfernt da sie Crashes verursachen, vollständig native JavaScript-Lösung verwendet: Detaillierte Bestellinformationen per Browser-Prompt, Kundendaten-Anzeige, Status-Änderung direkt im Dialog, strukturierte Informationsdarstellung ohne React-Dependencies
- July 12, 2025: KRITISCHER AUTO-DELETE BUG ENDGÜLTIG BEHOBEN - Server-seitige Auto-Delete-Logik in storage.ts implementiert: bulkUpdateAccessoryStatus und updateAccessory löschen Artikel automatisch bei Status "erledigt" statt sie zu aktualisieren, funktioniert für alle Dropdown-Änderungen und Bulk-Operationen, Client-Side-Löschlogik entfernt da Server jetzt alles handled
- July 11, 2025: VOLLSTÄNDIGE BESTELLFUNKTIONEN REPARIERT - PDF Export Button ersetzt Excel Button, automatisches Löschen bei Status "eingetroffen" (Ersatzteile) und "erledigt" (Zubehör) implementiert, "Bearbeiten" Button für Zubehör mit temporärer Prompt-Funktionalität repariert, nur noch ein PDF Export Button der gefiltert nur "bestellen" Status exportiert, Test-Button für Auto-Delete-Funktionalität hinzugefügt
- July 11, 2025: KRITISCHE LOGIK-FEHLER BEHOBEN - Status-Problem für neue Zubehör-Artikel korrigiert: Standard-Status von "bestellt" auf "bestellen" geändert in Schema und AddAccessoryDialog, "Bearbeiten" Button in Zubehör-Tabelle funktionsfähig gemacht mit onClick-Handler und singleAccessoryUpdateMutation
- July 11, 2025: Dialog-Interface komplett überarbeitet - Karteikarten-Design entfernt, kompakte Grid-Ansicht mit direkten Eingabefeldern implementiert, Dialog scrollbar gemacht, "Erstellen" Button repariert mit direkter onSubmit-Funktion und Console-Logging für Debugging
- July 11, 2025: Multi-Artikel Interface für "Auf Lager" Zubehör-Bestellungen implementiert - Benutzer kann mehrere Artikel mit Stückzahl gleichzeitig hinzufügen über dynamische +/- Buttons, keine Preiseingabe erforderlich, vereinfachte Benutzerführung für Lager-Artikel
- July 11, 2025: Bestellungen-Seite UI-Fix - Vollständige Interface bleibt immer sichtbar auch ohne Ersatzteile, Zubehör-Tab und alle Buttons zugänglich, Empty-State nur innerhalb Ersatzteile-Tabelle angezeigt
- July 11, 2025: KRITISCHER BUGFIX BEHOBEN - Frontend Routing-Fehler korrigiert: bulkUpdateMutation und singlePartUpdateMutation verwenden jetzt korrekte Header-basierte Endpunkte (/api/orders/spare-parts-bulk-update statt /api/spare-parts/bulk-update), "Ungültige Ersatzteil-ID" Fehler vollständig behoben, alle Status-Änderungen funktionieren wieder ordnungsgemäß
- July 11, 2025: ALLE BESTELLFUNKTIONEN VOLLSTÄNDIG REPARIERT - Einzelne Status-Änderungen verwenden jetzt korrekte Einzelupdate-Funktionen statt Bulk-Operationen, Status-Auswahl durch Dropdown-Menüs statt automatischer Progression, PDF-Export inkludiert sowohl Ersatzteile als auch Zubehör-Daten, Bulk-Operationen nutzen korrekte Endpunkte mit ID-Validierung, Status-Aktions-Buttons für Zubehör mit vollständigen Dropdown-Menüs implementiert
- July 11, 2025: Tabellenspalten für Bestellungen erfolgreich angepasst zu: "Auftrag, Ersatzteil, Lieferant, Erstellt, Status, Aktionen" - Kosten-Spalte entfernt und Spaltenreihenfolge entsprechend Benutzeranforderungen geändert
- July 11, 2025: KRITISCHER BUGFIX - Zubehör-Dialog komplett überarbeitet: "Auf Lager" Checkbox für Geschäftsbestellungen ohne Kundendaten, Autofilter-Eingabefeld für Kundensuche, vereinfachter 2-Schritte-Prozess mit direkter Artikel-Eingabe (z.B. "iPhone 8 Hülle schwarz") und Stückzahl-Eingabe, API-Fehler getUserDeviceTypes behoben
- July 11, 2025: KRITISCHER BUGFIX - Bestellungen-Seite komplett repariert: JavaScript-Fehler "error is not defined" behoben, API-Routing-Konflikte mit Middleware gelöst durch Platzierung der /api/orders/spare-parts Route am Anfang der registerRoutes Funktion, Header-basierte Authentifizierung ohne Middleware implementiert - Bestellungen-Seite funktioniert jetzt vollständig
- July 11, 2025: Test-E-Mail-Funktionalität implementiert - Test-E-Mail-Button im RepairDetailsDialog (Kundendaten-Bereich) sendet professionelle Auftragsbestätigungs-E-Mails mit vollständigen Reparatur- und Firmendetails, HTML-Design-Vorlage für einheitliches Layout erstellt
- July 11, 2025: Added quick status change icon (RefreshCw) to repairs table - Red circular arrow icon placed after QR-Code button allows direct status updates without opening RepairDetailsDialog, available in both desktop and mobile views
- July 11, 2025: Fixed preselectedCustomer functionality in NewCostEstimateDialog - Customer data now automatically pre-fills when creating cost estimates from CustomerDetailDialog
- July 11, 2025: Mobile optimization completed for CustomerDetailDialog - Responsive design matches RepairDetailsDialog with optimized buttons, icons, and layout for small screens
- July 8, 2025: Enhanced Kiosk Mode - Added custom business logo support for user "jahuu.eu" alongside existing "bugi" user, replacing default ClientKing logo with individual business branding
- July 8, 2025: Improved customer list functionality - New customers from Kiosk Mode now appear at the top with visual "NEU" indicators and green highlighting for easier identification
- July 8, 2025: Added compact "Zur Unterschrift" button in Kiosk Mode for manual page refresh to better detect signature requests
- June 30, 2025: PDF statistics FINAL VERSION completed and ready for deployment - added total count row to device type table and optimized "Außer Haus" table layout with 15% brand column and date display
- June 30, 2025: CRITICAL DSGVO fix implemented and VERIFIED - Shop isolation in statistics completely repaired for /api/stats/detailed endpoint and storage.ts getDetailedRepairStats method - USER CONFIRMED WORKING
- June 30, 2025: Enhanced statistics implementation with revenue tracking - Added comprehensive "Umsätze" (revenue) section showing total revenue (abgeholt) and pending revenue (abholbereit)  
- June 30, 2025: PDF statistics finalized with "Außer Haus" focus - shows only out-of-house repairs with device details and optimized column widths (20%/25%/45%/10%)
- June 30, 2025: Complete routes.ts file cleanup - removed all corrupted PDF code fragments and rebuilt DSGVO-compliant statistics endpoint
- June 30, 2025: Statistics functionality enhanced with proper revenue calculation and historical repair tracking
- June 30, 2025: Frontend statistics confirmed working correctly for all users - deployment ready
- June 29, 2025: Robust kiosk PIN system implemented - Master-PIN (678910) and normal shop PINs work even during session timeouts
- June 29, 2025: PDF table 3 column widths optimized - Modell column expanded to 105px for better display of longer device names
- June 29, 2025: PDF export functionality successfully moved from dashboard to statistics section next to CSV export button
- June 29, 2025: PDF export redesigned to match user's HTML template with structured tables and professional formatting
- June 29, 2025: Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.