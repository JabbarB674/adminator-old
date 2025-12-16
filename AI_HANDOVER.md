# AI Handover Document

**Date**: December 17, 2025
**Project**: Adminator
**Status**: Stable / Feature Complete (Phase 1)

## 1. Project Overview & Philosophy

**Adminator** is a low-code internal tool builder designed to bridge the gap between raw database access and full-blown custom software development. It allows developers to define "Apps" using simple JSON configurations, which are then rendered by a generic React frontend.

### Core Principles
*   **Configuration over Code**: New tools should be created by editing JSON, not writing React components.
*   **Unified Data Access**: A single backend controller (`remoteDbController`) handles connections to MSSQL, Postgres, and MySQL, abstracting away driver differences.
*   **Secure by Default**: All data access is proxied through the backend. Credentials are never exposed to the frontend. RBAC ensures users only see what they are allowed to.

### Architecture Diagram
```mermaid
graph TD
    User[User Browser] -->|React App| Frontend[Frontend (GenericAppLoader)]
    Frontend -->|API Calls| Backend[Backend (Node.js/Express)]
    Backend -->|Auth & RBAC| SystemDB[(System DB - SQL Server)]
    Backend -->|Fetch Config| S3[S3 / MinIO]
    Backend -->|Proxy Queries| RemoteDB[(Remote User DBs)]
    Backend -->|Invoke| Lambda[AWS Lambda]
```

---

## 2. Detailed Feature Documentation

### 2.1. The App Engine (`GenericAppLoader.jsx`)
This is the heart of the frontend. It works in three steps:
1.  **Fetch Config**: Calls `GET /api/apps/:appKey/config`. The backend retrieves the JSON from S3.
2.  **Parse Layout**: The JSON defines a `layout` array. The loader iterates through this array and renders the corresponding widgets (e.g., `data-grid`, `action-button`).
3.  **State Management**: It maintains a global state for the app, including `variables` (for templates), `selectedFile` (for uploads), and `input` (the raw JSON payload).

### 2.2. Unified Action System
Actions are the primary way users interact with data beyond simple viewing.

#### Configuration
Actions are defined in the `actions` array of the App Config.
```json
{
  "id": "update_user",
  "type": "http",
  "url": "https://api.example.com/users",
  "method": "POST",
  "payloadTemplate": {
    "userId": "{{userId}}",
    "role": "admin",
    "reason": "{{reason}}"
  },
  "variables": ["userId", "reason"]
}
```

#### Template Engine & Variables
*   **Mechanism**: The frontend scans `payloadTemplate` for `{{variable}}` placeholders.
*   **UI Generation**: For each variable found, an input field is automatically generated in the UI (left column).
*   **Real-time Injection**: As the user types in the input fields, the `{{variable}}` in the JSON string is replaced with the value.
*   **Robustness**: We use a custom `safeJsonParse` function that strips trailing commas (e.g., `{ "a": 1, }`) before parsing. This prevents the UI from crashing if the template has minor syntax errors.

#### File Uploads & Injection
*   **Flow**:
    1.  User selects a file (Local or from Bucket).
    2.  **Local**: File is uploaded immediately to MinIO (`/apps/:appKey/uploads/`) via `POST /api/upload`.
    3.  **Injection**: The file's metadata is **automatically injected** into the JSON payload under specific keys:
        *   `fileBase`: Base64 encoded content (for immediate processing).
        *   `fileName`: Original filename.
        *   `attachmentPath`: S3/MinIO path (e.g., `apps/my-app/uploads/image.png`).
    4.  **Persistence**: The `selectedFile` state persists even if the user edits the JSON manually. The `handleRun` function forces these fields into the final payload to ensure data integrity.

#### Dynamic Authentication
Some actions require a fresh token (e.g., calling a third-party API).
*   **Config**: `authType: "dynamic"`, `authUrl: "..."`.
*   **Flow**: Before running the main action, the frontend calls `authUrl`.
*   **Token Extraction**: It parses the response using `tokenPath` (e.g., `data.accessToken`) and injects it into the `Authorization` header of the main request.

### 2.3. Data Grid & Inline Editing
*   **Schema Detection**: The backend (`remoteDbController`) queries `INFORMATION_SCHEMA` to determine column types and primary keys.
*   **Editing**:
    *   User clicks "Edit Mode".
    *   Cells become inputs.
    *   Changes are tracked in a local `changes` object.
    *   **Save**: Sends a `PUT` request to `/api/apps/:appKey/data/:tableName`.
    *   **Backend Logic**: Generates dynamic `UPDATE` statements based on the Primary Key.

---

## 3. Infrastructure & Deployment

### 3.1. Backend (`/backend`)
*   **Runtime**: Node.js 18+
*   **Framework**: Express.js
*   **Database Drivers**: `tedious` (MSSQL), `pg` (Postgres), `mysql2` (MySQL).
*   **Environment Variables**:
    *   `DATABASE_URL`: Connection string for the System DB.
    *   `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`: MinIO/S3 config.
    *   `JWT_SECRET`: For signing session tokens.

### 3.2. Secrets Management (`{{VAULT:key}}`)
To avoid storing plain-text passwords in S3 configs, we implemented a Vault system.
*   **Syntax**: In the App Config, use `{{VAULT:my-secret-password}}`.
*   **Resolution**:
    *   When `remoteDbController` loads the config, it detects this pattern.
    *   It calls `secretsService.getAppSecret(appKey, 'my-secret-password')`.
    *   The service fetches the actual value from AWS Secrets Manager (or a local mock in dev).
    *   The password is injected into the config **in memory only**; it is never written back to S3.

### 3.3. Networking & Lambda
*   **Issue**: We faced 504 Gateway Timeouts when Lambda functions tried to upload large files to S3.
*   **Root Cause**: The Lambda was in a private VPC without a NAT Gateway, so it couldn't reach the public S3 endpoint.
*   **Fix**: Created a **VPC Endpoint for S3**. This allows traffic to route internally within the AWS network, bypassing the public internet and resolving the timeout.

---

## 4. Codebase Walkthrough (Critical Files)

### `frontend/src/pages/apps/GenericAppLoader.jsx`
*   **Role**: The Runtime Engine.
*   **Key Functions**:
    *   `useEffect`: Handles template parsing and variable merging.
    *   `handleRun`: Orchestrates the action execution (Auth -> Payload Prep -> Fetch).
    *   `uploadLocalFile`: Handles the upload-to-MinIO flow.
    *   `safeJsonParse`: Regex-based JSON parser to handle trailing commas.

### `backend/controllers/remoteDbController.js`
*   **Role**: The Data Proxy.
*   **Key Functions**:
    *   `getAppConfig`: Fetches JSON from S3 and resolves `{{VAULT}}` secrets.
    *   `testConnection`: Validates DB credentials.
    *   `getData` / `updateData`: Generates SQL queries dynamically.
    *   `runAction`: Proxies HTTP requests or executes SQL actions.

### `backend/controllers/appController.js`
*   **Role**: App Management.
*   **Key Functions**:
    *   `saveAppConfig`: Validates and uploads JSON to S3.
    *   `listApps`: Returns the registry of available apps.

---

## 5. Troubleshooting & Common Pitfalls

### 5.1. JSON Syntax Errors
*   **Symptom**: The UI crashes or resets when typing in the JSON editor.
*   **Cause**: `JSON.parse()` is strict. A trailing comma `{ "a": 1, }` throws an error.
*   **Solution**: We implemented `safeJsonParse`. If you see this issue, ensure you are using the latest version of `GenericAppLoader.jsx`.

### 5.2. "File Data Disappearing"
*   **Symptom**: You upload a file, then edit a template variable, and the file data vanishes from the JSON.
*   **Cause**: The template re-render overwrote the `fileBase` fields.
*   **Solution**: The `useEffect` hook now explicitly re-merges `selectedFile` data after every template update. Additionally, `handleRun` force-injects it before submission.

### 5.3. Database Connection Failures
*   **Check**: Ensure the backend server has network access to the target database.
*   **Firewalls**: If running locally, you might need to whitelist your IP.
*   **SSL**: Azure SQL and AWS RDS often require `encrypt: true` in the config.

---

## 6. Future Roadmap

1.  **Validation Engine**: Currently, input fields accept any text. We need a schema to define `type: "email"`, `regex: "..."`, `required: true`.
2.  **Layout Builder**: The current layout is a simple list of sections. A drag-and-drop grid system (like React Grid Layout) would significantly improve UX.
3.  **Version Control**: App Configs are overwritten on save. Implementing S3 Versioning or a Git integration would allow rollbacks.
4.  **Audit Logging**: Track who ran what action and when. This is critical for enterprise compliance.

---

*This document was last updated by GitHub Copilot on Dec 17, 2025.*
