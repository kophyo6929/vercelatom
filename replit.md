# Overview

A comprehensive web application for purchasing digital products and managing credits, specifically designed for telecom operators like ATOM, MYTEL, and OOREDOO. Users can browse products by operator and category, purchase items using a credit system, and manage their accounts. The platform includes an admin panel for managing products, users, orders, and system settings. Features include user authentication, credit purchasing with payment proof uploads, order management, and real-time notifications.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **React 19.1.1** with TypeScript for type safety and modern development
- **Single Page Application (SPA)** with view-based routing managed through state
- **Component-based architecture** with reusable UI components (Logo, CollapsibleSection, EmptyState)
- **Context-based state management** for language (i18n) and notifications
- **Local storage integration** for authentication tokens and session persistence
- **Custom hooks** for persistent state management with cross-tab synchronization using BroadcastChannel API

## Backend Architecture
- **Node.js with Express.js** RESTful API server
- **JWT-based authentication** with role-based access control (admin/user roles)
- **SQLite database** using better-sqlite3 for local data persistence
- **Route-based API structure** organized by functionality (auth, users, products, orders, settings)
- **Middleware architecture** for authentication, validation, and security
- **Database abstraction layer** through DatabaseManager class

## Security Implementation
- **bcryptjs** for password hashing
- **Helmet.js** for security headers
- **CORS configuration** for cross-origin requests
- **Rate limiting** to prevent abuse (100 requests per 15 minutes)
- **Input validation** using express-validator
- **JWT token verification** for protected routes

## Data Storage
- **SQLite database** with tables for users, products, orders, notifications, payment details, and app settings
- **File-based storage** for payment proof images (base64 encoded)
- **Local storage** for client-side authentication and session data
- **In-memory state management** for real-time application data

## Internationalization
- **Multi-language support** (English and Burmese/Myanmar)
- **Translation system** with JSON-based language files
- **Context-based language switching** with persistent user preferences

# External Dependencies

## Core Dependencies
- **React 19.1.1 & React DOM** - Frontend framework
- **Express.js 4.18.2** - Backend web framework
- **better-sqlite3** - SQLite database driver
- **bcryptjs** - Password hashing library
- **jsonwebtoken** - JWT token generation and verification

## Security & Middleware
- **helmet** - Security headers middleware
- **cors** - Cross-origin resource sharing
- **express-rate-limit** - Rate limiting middleware
- **express-validator** - Input validation

## Development Tools
- **Vite 6.2.0** - Build tool and development server
- **TypeScript 5.8.2** - Type system
- **nodemon** - Development server auto-restart
- **concurrently** - Run multiple processes simultaneously

## Build & Deployment
- **Google Fonts (Inter)** - Typography
- **ES2022 modules** - Modern JavaScript module system
- **Importmap configuration** - Module resolution for React imports

## Payment Integration
- **KPay and Wave Pay** - Myanmar mobile payment systems (manual processing with proof upload)
- **Base64 image encoding** - Payment proof storage system

## No External Database
The application uses SQLite for local data persistence without requiring external database services. The system is designed to be self-contained and easily deployable.