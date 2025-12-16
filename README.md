# Adminator - Internal Tool Builder

**Adminator** is a powerful, low-code platform designed to rapidly build and deploy internal tools, dashboards, and admin panels. It bridges the gap between raw database access and full-blown custom software development, allowing you to create secure, user-friendly interfaces for your data in minutes.

---

## 🚀 Why Adminator?

*   **Configuration over Code**: Define your apps using simple JSON configurations. No need to write React components or backend endpoints for every new tool.
*   **Unified Data Access**: Connect to **MSSQL**, **Postgres**, and **MySQL** databases seamlessly. The backend handles the drivers and connections, so the frontend just works.
*   **Secure by Default**:
    *   **RBAC**: Granular Role-Based Access Control ensures users only see what they are allowed to.
    *   **Secret Management**: Database passwords and API keys are injected securely via AWS Secrets Manager (Vault), never exposed to the frontend.
    *   **Proxy Architecture**: All data access is proxied through the backend; direct DB access is never exposed to the client.

---

## ✨ Key Features

### 1. Dynamic App Engine
Apps are defined entirely by JSON configurations stored in S3. This means you can update the logic, layout, or actions of a tool without redeploying the codebase.

### 2. Universal Data Grid
A powerful table widget that connects directly to your SQL databases.
*   **Automatic Schema Detection**: It reads column types and primary keys automatically.
*   **Inline Editing**: Users can edit data directly in the grid (Excel-style). Changes are committed via secure, transaction-safe SQL updates.
*   **Pagination & Filtering**: Handles large datasets efficiently.

### 3. Unified Action System
Go beyond viewing data. Define "Actions" to interact with APIs or databases.
*   **HTTP Actions**: Call external REST APIs (e.g., trigger a Lambda, update a Stripe customer).
*   **SQL Actions**: Execute raw SQL queries (e.g., `UPDATE Users SET Status = 'Active'`).
*   **Template Variables**: Use `{{variable}}` syntax in your JSON payloads. The UI automatically generates input fields for these variables.
*   **File Injection**: Upload files (images, docs) which are automatically uploaded to S3/MinIO and their paths injected into your API payloads.

### 4. Visual App Editor
While JSON is the core, you don't have to write it manually. The built-in **App Editor** (`/settings/app-editor`) provides a GUI to configure data sources, layout, and actions.

---

## 🏗 Architecture

```mermaid
graph TD
    User[User Browser] -->|React App| Frontend[Frontend (GenericAppLoader)]
    Frontend -->|API Calls| Backend[Backend (Node.js/Express)]
    Backend -->|Auth & RBAC| SystemDB[(System DB - SQL Server)]
    Backend -->|Fetch Config| S3[S3 / MinIO]
    Backend -->|Proxy Queries| RemoteDB[(Remote User DBs)]
    Backend -->|Invoke| Lambda[AWS Lambda]
```

### Frontend (`/frontend`)
*   **Framework**: React 19
*   **Core Component**: `GenericAppLoader.jsx` - The engine that interprets JSON configs and renders the UI.
*   **Styling**: Dark Theme with Red Accent.

### Backend (`/backend`)
*   **Framework**: Node.js + Express.
*   **Role**: Acts as a secure proxy. It authenticates users, fetches configs from S3, resolves secrets, and connects to remote databases.
*   **Drivers**: `tedious` (MSSQL), `pg` (Postgres), `mysql2` (MySQL).

---

## 🛠 Setup & Installation

### Prerequisites
*   **Node.js** (v18+)
*   **SQL Server** (for the System Database - Users/Permissions)
*   **MinIO** or **AWS S3** (for storing App Configs & Uploads)

### 1. Backend Setup
```bash
cd backend
npm install

# Create a .env file based on .env.sample
# Set DATABASE_URL to your System SQL Server
# Set S3_ACCESS_KEY / S3_SECRET_KEY for MinIO/AWS

npm start
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm start
```

### 3. Database Initialization
Run the SQL scripts in the `database/` folder against your **System SQL Server** in order:
1.  `01_setup_users.sql` (Creates tables)
2.  `02_restructure_rbac.sql` (Sets up permissions)
...and so on.

---

## 📘 App Configuration Guide

Apps are defined in JSON. Here is a comprehensive example:

```json
{
  "meta": {
    "displayName": "User Management",
    "appKey": "user-management",
    "icon": "users"
  },
  "dataSource": {
    "type": "postgres",
    "config": {
      "host": "db.example.com",
      "user": "admin",
      "password": "{{VAULT:db-password}}", 
      "database": "users_db"
    },
    "tables": [
      { "name": "users", "allowEdit": true, "primaryKey": "id" }
    ]
  },
  "actions": [
    {
      "id": "ban_user",
      "label": "Ban User",
      "type": "http",
      "method": "POST",
      "url": "https://api.example.com/users/ban",
      "payloadTemplate": {
        "userId": "{{userId}}",
        "reason": "{{reason}}",
        "admin": "system"
      },
      "variables": ["userId", "reason"]
    }
  ],
  "layout": {
    "sections": [
      {
        "title": "All Users",
        "widgets": [
          { "type": "data-grid", "target": "users" },
          { "type": "action-button", "actionId": "ban_user" }
        ]
      }
    ]
  }
}
```

### Secrets Management (`{{VAULT}}`)
Do not store plain text passwords in your JSON. Use the `{{VAULT:secret-name}}` syntax.
The backend will resolve this at runtime using AWS Secrets Manager (or a local mock).

---

## ❓ Troubleshooting

### JSON Syntax Errors
If the UI crashes when editing an Action payload, it's likely a JSON syntax error.
*   **Note**: The system now supports **trailing commas** (e.g., `{ "a": 1, }`), so you don't need to be perfect.
*   **Fix**: Check for unclosed braces or missing quotes.

### File Uploads Disappearing
If you upload a file and then edit a template variable, the file data might seem to disappear from the JSON view.
*   **Don't Panic**: The file data is stored in the internal state (`selectedFile`).
*   **Auto-Injection**: When you click "Run", the system **automatically injects** `fileBase`, `fileName`, and `attachmentPath` into the payload, ensuring your file is sent correctly.

---

## 🎨 UI & Styling
The project uses a dark theme with a **Red** accent color (`var(--accent-color)`).
*   **Global Styles**: `frontend/src/index.css`
*   **Variables**: `frontend/src/styles/variables.css`
*   **Notifications**: A custom Toast system (`NotificationContext`) replaces native alerts.

## 🤝 Contributing
1.  **New Widgets**: Add to `frontend/src/components/widgets/` and register in `GenericAppLoader` and `LayoutEditor`.
2.  **New DB Support**: Add driver to `backend/package.json` and implement logic in `backend/controllers/remoteDbController.js`.
