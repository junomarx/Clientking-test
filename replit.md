# Handyshop Verwaltung - System Documentation

## Overview

The Handyshop Verwaltung is a comprehensive phone repair shop management system designed to streamline workflows for repair businesses. It offers both web and desktop applications to manage customer relations, device repairs, cost estimations, and email communications. The system aims to enhance efficiency, improve customer service, and support the business vision of modernizing repair shop operations. Key capabilities include multi-shop administration, customer and repair management, dynamic cost estimation, and robust email communication.

## User Preferences

Preferred communication style: Simple, everyday language.
Detail-oriented: User requires pixel-perfect alignment and precision, especially for PDF layouts and visual elements.
Quality focus: Prefers comprehensive solutions that address all edge cases rather than quick fixes.
Implementation Control: Only implement changes when explicitly commanded with "Ok leg los" - otherwise stay in advisory/brainstorming mode.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, using Vite for building.
- **UI Components**: Radix UI with custom Tailwind CSS styling.
- **State Management**: TanStack React Query for server state and React Hook Form with Zod for form handling and validation.
- **Desktop Support**: Electron for native desktop applications.
- **UI/UX Decisions**: Consistent design language across web and desktop applications. Utilizes compact layouts, subtle dropdowns for status changes, and mobile-optimized interfaces for tables and dialogs. Kiosk mode is designed for clear, full-screen interaction with dynamic logo support.

### Backend Architecture
- **Runtime**: Node.js with TypeScript (ESM modules).
- **Framework**: Express.js for REST API.
- **Database**: PostgreSQL (Neon serverless) managed via Drizzle ORM.
- **Authentication**: Session-based with `express-session`, supporting role-based access for shop owners and employees. Employees authenticate via email, owners via username.
- **Email Service**: Integrated SMTP for customizable, template-based email communications.
- **File Uploads**: `express-fileupload` middleware.

### Database Design
- **Multi-tenant Architecture**: Data isolation per shop using `shopId`.
- **User Management**: Role-based access (admin/owner/employee).
- **Device Management**: Hierarchical categorization (Types → Brands → Models).
- **Repair Tracking**: Comprehensive workflow from intake to completion, including loaner device management and audit trails for status changes.
- **Email Templates**: Customizable with variable substitution.

### Key Features & Technical Implementations
- **User & Authentication**: Secure session-based authentication, multi-shop isolation, and role-based access control with five distinct roles: Superadmin, Multi-Shop Admin (cross-shop via explicit permissions), Shop Owner, Employee, and Kiosk (dedicated tablet terminals with email authentication).
- **Customer & Repair Management**: Detailed customer information, status-driven repair tracking, device categorization, issue tracking, and automated notifications. Includes QR-code based signature for drop-off and pickup, with loaner device management integrated.
- **Cost Estimation**: Dynamic estimate generation with vector-based PDF export. Implemented precision-aligned PDF generation using jsPDF with pixel-perfect column alignment, logo support, and harmonious A4 page utilization.
- **Email Communication**: Template-based system with variable substitution and email history. System-wide emails use superadmin-configured SMTP settings.
- **Device Management**: Hierarchical organization and spare parts tracking.
- **Audit Trail**: Tracks user actions for status changes, loaner device operations, and QR-code workflows. Records "created by" information for repairs and prevents unauthorized deletions by employees.
- **Multi-Kiosk System**: Supports multiple concurrent kiosk terminals per shop with individual online status tracking, email-based authentication for kiosk employees, and automatic kiosk mode activation upon login.
- **Multi-Shop Admin Dashboard**: Dedicated interface for multi-shop management with KPIs, shop overview, employee overview, and backend API for statistics.
- **Multi-Shop Permission System**: DSGVO-compliant explicit consent workflow for shop owners to grant multi-shop admin access.
- **Secure Password Reset**: Industry-standard token-based password reset system with 15-minute expiry, rate limiting, hashed tokens, and comprehensive email templates. Includes frontend validation and security features like enumeration protection and IP tracking.

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
- **jsPDF**: For PDF generation and export.