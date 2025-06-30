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