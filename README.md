# Adminator - Internal Tool Builder

Adminator is a low-code platform designed to rapidly build and deploy internal tools, dashboards, and admin panels. It allows you to connect to various data sources (MSSQL, Postgres, MySQL, APIs), define user interfaces via JSON configuration, and manage user access with granular permissions.

## 🚀 Key Features

*   **Dynamic App Engine**: Apps are defined entirely by JSON configurations stored in S3. No code changes required to create new tools.
*   **Visual App Editor**: A built-in GUI (`/settings/app-editor`) to create and modify apps without writing JSON manually.
*   **Universal Data Grid**: A powerful table widget that supports:
    *   Connecting to remote MSSQL, Postgres, and MySQL databases.
    *   Inline editing with transaction support.
    *   Automatic schema detection.
*   **Unified Action System**: Define "Actions" that can be triggered via buttons:
    *   **HTTP Actions**: Call external APIs (REST/JSON).
    *   **SQL Actions**: Execute raw SQL queries against connected databases.
    *   **Input Forms**: Define required inputs (text, number, date) that users must fill before execution.
*   **Role-Based Access Control (RBAC)**:
    *   Users are assigned to Access Profiles (e.g., Administrator, Viewer).
    *   Profiles are granted access to specific Apps.
    *   Custom per-user overrides available.
*   **Serverless Integration**: Capable of invoking AWS Lambda functions for complex business logic.

## 🏗 Architecture

### Frontend (`/frontend`)
*   **Framework**: React 19
*   **Routing**: `react-router-dom` (Dynamic routing for `/apps/:appKey`)
*   **State Management**: Context API (`AuthContext`, `NotificationContext`)
*   **Styling**: CSS Modules + Global Dark Theme (Red Accent)
*   **Key Components**:
    *   `GenericAppLoader`: The core engine that fetches JSON config and renders the app.
    *   `AppEditor`: The visual builder for app configs.
    *   `DataGrid`: The smart table component for database interaction.
    *   `ActionButtonWidget`: The runtime component for executing configured actions.

### Backend (`/backend`)
*   **Framework**: Node.js + Express
*   **Storage**:
    *   **App Configs**: Stored as JSON in S3 (or MinIO for local dev).
    *   **System Data**: Stored in a local SQL Server (Users, Permissions, App Registry).
*   **Database Drivers**: `tedious` (MSSQL), `pg` (Postgres), `mysql2` (MySQL).
*   **Controllers**:
    *   `appController`: Manages App metadata and S3 config storage.
    *   `remoteDbController`: Proxies requests to remote databases (Test Connection, Get Data, Update Data, Run SQL Actions).
    *   `userController`: Manages system users and permissions.

### Database (`/database`)
*   Contains SQL scripts for setting up the **System Database** (Adminator's own DB).
*   Handles User tables, RBAC tables (`Adminator_AccessProfiles`, `Adminator_ProfileAppAccess`), and App Registry (`Adminator_Apps`).

## 🛠 Setup & Installation

### Prerequisites
*   Node.js (v18+)
*   SQL Server (for the System Database)
*   MinIO or AWS S3 access (for Config Storage)

### 1. Backend Setup
```bash
cd backend
npm install
# Configure .env (see .env.sample)
# Ensure DATABASE_URL points to your System SQL Server
# Ensure S3 credentials are set
npm start
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm start
```

### 3. Database Setup
Run the scripts in `database/` in order against your System SQL Server to create the necessary tables and seed initial data.

## 📘 App Configuration Guide

Apps are defined in JSON. Example structure:

```json
{
  "meta": {
    "displayName": "Customer Support",
    "appKey": "customer-support",
    "icon": "users"
  },
  "connection": {
    "productionUrl": "https://api.example.com"
  },
  "dataSource": {
    "type": "mssql",
    "config": { "server": "...", "database": "..." },
    "tables": [
      { "name": "Customers", "allowEdit": true, "primaryKey": "CustomerId" }
    ]
  },
  "actions": [
    {
      "id": "reset-password",
      "name": "Reset Password",
      "type": "http",
      "method": "POST",
      "url": "/api/reset",
      "inputs": [{ "name": "email", "label": "User Email" }]
    }
  ],
  "layout": {
    "sections": [
      {
        "title": "Overview",
        "widgets": [
          { "type": "data-grid", "target": "Customers" },
          { "type": "action-button", "actionId": "reset-password" }
        ]
      }
    ]
  }
}
```

## 🎨 UI & Styling
The project uses a dark theme with a **Red** accent color (`var(--accent-color)`).
*   **Global Styles**: `frontend/src/index.css`
*   **Variables**: `frontend/src/styles/variables.css`
*   **Notifications**: A custom Toast system (`NotificationContext`) replaces native alerts.

## 🤝 Contributing
1.  **New Widgets**: Add to `frontend/src/components/widgets/` and register in `GenericAppLoader` and `LayoutEditor`.
2.  **New DB Support**: Add driver to `backend/package.json` and implement logic in `backend/controllers/remoteDbController.js`.
