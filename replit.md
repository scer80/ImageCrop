# Overview

ImageCrop is a web-based image cropping tool that allows users to upload images and crop them interactively. The application provides a simple, intuitive interface for selecting crop areas and downloading the processed results. Built as a full-stack TypeScript application, it combines a React frontend with an Express.js backend for handling image processing operations.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management and caching
- **UI Components**: Radix UI primitives with shadcn/ui component library for consistent design
- **Styling**: Tailwind CSS with CSS custom properties for theming
- **Build Tool**: Vite for fast development and optimized production builds

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **File Upload**: Multer middleware for handling multipart/form-data
- **Image Processing**: Sharp library for server-side image manipulation
- **Development**: Vite integration for hot reloading in development mode
- **Build Process**: esbuild for server-side bundling

## Data Storage
- **Primary Storage**: In-memory storage using Map data structure for image metadata
- **File Storage**: Local filesystem for uploaded image files in `/uploads` directory
- **Database Schema**: Drizzle ORM schema defined for PostgreSQL (currently unused)
- **Type Safety**: Zod schemas for runtime validation of image data

## Authentication & Authorization
- **Current State**: No authentication system implemented
- **Session Management**: Express session configuration present but not actively used
- **Access Control**: Open access to all endpoints

## Image Processing Pipeline
1. **Upload**: Multer processes multipart uploads with 10MB file size limit
2. **Validation**: File type validation ensures only image formats are accepted
3. **Storage**: Files saved to local filesystem with generated unique filenames
4. **Metadata**: Image information stored in memory with unique IDs
5. **Cropping**: Sharp library handles server-side image cropping operations
6. **Download**: Processed images served directly to client

## API Design
- **Upload Endpoint**: `POST /api/upload` - Handles single image uploads
- **Crop Endpoint**: `POST /api/crop` - Processes crop operations with x, y, width, height parameters
- **File Serving**: Static file serving for uploaded images
- **Error Handling**: Centralized error middleware with structured JSON responses

## Client-Server Communication
- **HTTP Client**: Custom fetch wrapper with error handling
- **Request Format**: JSON for crop operations, FormData for file uploads
- **Response Format**: Standardized JSON responses with error handling
- **Caching**: TanStack Query handles response caching and request deduplication

# External Dependencies

## Core Framework Dependencies
- **@vitejs/plugin-react**: React support for Vite build system
- **express**: Web framework for Node.js backend
- **react**: Frontend UI library with hooks and context
- **typescript**: Static type checking for both frontend and backend

## UI and Styling
- **@radix-ui/react-***: Headless UI components for accessible interactions
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Component variant management
- **clsx**: Conditional className utility

## Data Management
- **@tanstack/react-query**: Server state management and caching
- **drizzle-orm**: Type-safe ORM (configured but not actively used)
- **drizzle-zod**: Runtime validation schemas
- **zod**: Schema validation library

## Image Processing
- **sharp**: High-performance image processing library
- **multer**: Middleware for handling file uploads

## Database (Configured)
- **@neondatabase/serverless**: Serverless PostgreSQL driver
- **connect-pg-simple**: PostgreSQL session store for Express

## Development Tools
- **tsx**: TypeScript execution for development
- **esbuild**: Fast JavaScript bundler for production
- **@replit/vite-plugin-runtime-error-modal**: Development error overlay
- **wouter**: Minimalist routing library for React