# Handyshop Verwaltung Architecture

## Overview

Handyshop Verwaltung is a full-stack web application designed for managing mobile phone repair shops. It provides functionality for tracking repairs, managing customers, generating cost estimates, and handling business settings. The application follows a modern web architecture with a React frontend and Node.js Express backend.

## System Architecture

The system follows a client-server architecture with clear separation between frontend and backend:

1. **Frontend**: React application built with Vite, using React Query for data fetching and state management
2. **Backend**: Node.js Express server providing RESTful API endpoints
3. **Database**: PostgreSQL database using Drizzle ORM for database operations
4. **Authentication**: Session-based authentication with Passport.js

### Architecture Diagram

```
┌─────────────────┐      ┌────────────────┐      ┌─────────────────┐
│                 │      │                │      │                 │
│  React Frontend │<────>│ Express Server │<────>│ PostgreSQL DB   │
│  (Vite + React  │      │ (Node.js)      │      │ (with Drizzle)  │
│   Query)        │      │                │      │                 │
│                 │      │                │      │                 │
└─────────────────┘      └────────────────┘      └─────────────────┘
                                 │
                                 │
                         ┌───────┴────────┐
                         │                │
                         │ External       │
                         │ Services       │
                         │ (SMTP)         │
                         │                │
                         └────────────────┘
```

## Key Components

### Frontend Components

1. **Client Application**
   - Built with React, TypeScript, and Vite
   - Uses Tailwind CSS for styling with the shadcn/ui component library
   - State management via React Query for server state and React Context for local state
   - Route management with Wouter (lightweight alternative to React Router)

2. **Key Frontend Features**
   - Dashboard for overview of business metrics
   - Repair management with status tracking
   - Customer management
   - Cost estimates generation
   - Device inventory management
   - Email template customization
   - Printing functionality with different template options
   - Role-based access control with tiered permissions

### Backend Components

1. **API Server**
   - Built with Express.js and TypeScript
   - RESTful API design for resource manipulation
   - Modular architecture with separate route handlers for different resources

2. **Authentication System**
   - Session-based authentication with express-session
   - Password hashing using crypto's scrypt function
   - Role-based access control (regular user, admin, superadmin)

3. **Database Access Layer**
   - Drizzle ORM for type-safe database operations
   - Schema definitions shared between frontend and backend
   - Transaction support for data integrity

4. **Email Service**
   - Nodemailer integration for sending emails
   - Template-based email generation
   - Email history tracking

5. **Printing System**
   - Custom print templates for receipts and reports
   - Support for multiple printer sizes (58mm thermal, A4)

### Database Schema

The database schema includes tables for:

1. **Users and Authentication**
   - Users table with authentication information
   - Role-based permissions
   - Feature overrides for custom permissions

2. **Business Management**
   - Shops (for multi-tenant support)
   - Business settings (company details, logo, etc.)

3. **Customer Management**
   - Customer information
   - Customer-to-shop relationship

4. **Repair Management**
   - Repair details and status tracking
   - Device information
   - Customer signatures
   - Status history

5. **Device Catalog**
   - Device types
   - Brands
   - Model series
   - Models

6. **Finance**
   - Cost estimates
   - Cost estimate items

7. **Communication**
   - Email templates
   - Email history

## Data Flow

### Core User Flows

1. **Repair Flow**
   - Customer is added to the system
   - Repair order is created with device details
   - Repair status is updated throughout the process
   - Customer is notified via email about status changes
   - Final receipt is printed when repair is complete
   - Customer signs on pickup

2. **Cost Estimate Flow**
   - Device and required repairs are identified
   - Cost estimate is created with individual line items
   - Cost estimate can be exported, printed, or emailed to customer
   - Cost estimate can be converted to a repair order

3. **Admin Management Flow**
   - Administrators can manage users and their permissions
   - Administrators can customize system settings
   - Superadmin can manage shops and global settings

### Security Model

The application implements a hierarchical security model:

1. **Authentication**: Session-based authentication with secure password storage
2. **Authorization**: Role-based access control with three primary roles:
   - Regular user: Basic shop operations
   - Admin: User management and advanced settings
   - Superadmin: Multi-shop management and system-wide configuration
3. **Feature-based Access Control**: Features are restricted based on:
   - User role (admin, superadmin)
   - Subscription plan (basic, professional, enterprise)
   - Individual feature overrides

## External Dependencies

1. **Frontend Libraries**
   - React ecosystem (React, React Query, React Hook Form)
   - Tailwind CSS with shadcn/ui components
   - Lucide React for icons
   - Zod for schema validation

2. **Backend Libraries**
   - Express.js for API server
   - Passport.js for authentication
   - Drizzle ORM for database operations
   - Nodemailer for email functionality

3. **External Services**
   - SMTP server for sending emails
   - PostgreSQL database (via Neon Serverless PostgreSQL)

## Deployment Strategy

The application supports multiple deployment options:

1. **Development Environment**
   - Vite development server for frontend
   - Nodemon/tsx for backend with hot reloading
   - Local PostgreSQL database

2. **Production Deployment**
   - Single-server deployment with built frontend served by Express
   - Environment variable configuration for sensitive settings
   - Support for reverse proxies (Nginx, Apache)

3. **Cloud Deployment**
   - Ready for cloud platforms (Replit appears to be current hosting)
   - Support for serverless PostgreSQL (Neon)

### Scaling Considerations

The architecture supports scaling in the following ways:

1. **Multi-tenant Design**: The system uses a shop_id field in relevant tables to support multiple shops
2. **Stateless Backend**: The backend doesn't maintain state outside of the database
3. **Feature-based Pricing Tiers**: The system implements different feature sets based on subscription plans

## Caching Strategy

1. **Client-side Caching**
   - React Query provides caching for API responses
   - Browser localStorage is used for device type/brand/model caching

2. **Rate Limiting**
   - Not explicitly implemented in the current codebase

## Migration Strategy

The codebase includes several migration scripts to handle schema evolution:

1. **Additive Migrations**: Scripts to add new columns and tables
2. **Data Migrations**: Scripts to transform existing data
3. **Feature Flag System**: Through the feature overrides mechanism

## Testing Approach

The codebase shows evidence of:

1. **Manual Testing**: Test user creation scripts
2. **Diagnostic Tools**: Database validation scripts

A formal automated testing strategy is not evident in the provided files.