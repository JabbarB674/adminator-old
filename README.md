# Adminator

Adminator is a comprehensive internal administration dashboard designed to manage users, permissions, and various internal tools and applications. It features a React frontend and a Node.js/Express backend with SQL Server integration.

## Project Structure

```
adminator/
├── backend/                # Node.js Express API
│   ├── config/             # Database configuration
│   ├── controllers/        # Request handlers
│   ├── middleware/         # Auth and other middleware
│   ├── routes/             # API route definitions
│   └── apps/               # Backend logic for specific integrated apps
├── frontend/               # React SPA (Create React App)
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── context/        # React Context (Auth, etc.)
│   │   ├── layouts/        # Page layouts (Main, Sidebar)
│   │   ├── pages/          # Route pages
│   │   └── services/       # API service calls
└── database/               # SQL scripts for setup and migration
```

## Features

- **Authentication**: JWT-based authentication with secure login.
- **User Management**: 
  - CRUD operations for users.
  - Role-based access control (Global Admin vs Standard User).
- **Granular Permissions**:
  - "Custom Profile" system allowing specific app access overrides per user without creating new database roles.
- **App Integration**:
  - Dynamic app loading.
  - "Tasty Customers" app integration.
- **Tools**:
  - DB Lookup tool.
  - S3/MinIO Bucket Explorer.
  - cURL tool.

## Getting Started

### Prerequisites

- Node.js (v14+)
- SQL Server
- MinIO (Optional, for file storage features)

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables:
   - Copy `.env.sample` to `.env`.
   - Update the values with your database and JWT credentials.
4. Start the server:
   ```bash
   npm start
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm start
   ```
   The app will run at `http://localhost:3000`.

## Database Setup

Run the SQL scripts in the `database/` folder in order to set up the required tables and initial data.

## Architecture Notes

- **Permissions**: The system uses a hybrid RBAC model. Users belong to a `Profile`. If a user needs specific permissions different from their profile, the system generates a unique `Custom_User_{ID}` profile for them in the background.
- **Frontend Styling**: Uses standard CSS with a focus on a dark/modern aesthetic.
