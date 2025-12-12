# AI Handover Document

**Date**: December 12, 2025
**Project**: Adminator
**Status**: Stable / Feature Complete (Phase 1)

## 🧠 Context & Recent Work

The project has just completed a major refactoring phase focusing on **Usability**, **Unified Actions**, and **Data Editing**.

### 1. Unified Action System
*   **Old Way**: Hardcoded buttons triggering specific Lambda functions.
*   **New Way**: A generic `Action` schema in the App Config.
    *   **Types**: `http` (REST API calls) and `sql` (Direct DB queries).
    *   **Configuration**: Managed via `ActionEditor.jsx`.
    *   **Execution**: Handled by `ActionButtonWidget.jsx` -> `POST /api/apps/:appKey/actions/:actionId/run`.
    *   **Inputs**: Actions can define `inputs` (text, number, date) which render a modal form before execution.

### 2. Data Grid Editing
*   **Feature**: The `DataGrid` widget now supports inline editing.
*   **Backend**: `PUT /api/apps/:appKey/data/:tableName` endpoint implemented in `remoteDbController.js`.
*   **Support**:
    *   **MSSQL**: Fully supported (Update statements).
    *   **Postgres**: Fully supported.
    *   **MySQL**: Fully supported.
*   **UI**: "Edit" button toggles mode -> Inputs appear in cells -> "Save" commits changes.

### 3. UI/UX Polish
*   **Theme**: Switched from generic Green to **Red** accent color to match branding.
*   **Notifications**: Replaced all `alert()` calls with a custom `NotificationToast` system (Context + Component).
*   **App Editor**: Fixed scrolling issues (double scrollbars) and improved visibility of input fields (headers).

## 📂 Key File Structure

*   `frontend/src/pages/apps/GenericAppLoader.jsx`: **CRITICAL**. This is the engine that runs the apps. It interprets the JSON config.
*   `frontend/src/pages/settings/AppEditor.jsx`: The visual tool for generating JSON configs.
*   `backend/controllers/remoteDbController.js`: The bridge to external data. Handles connection testing, data retrieval, and action execution.
*   `backend/controllers/appController.js`: Manages the storage of App Configs in S3.

## 🚧 Known Issues / Pending Tasks

1.  **Security**:
    *   Database credentials in `dataSource` config are currently stored in plain text in the JSON. **High Priority**: Move to AWS Secrets Manager or encrypt them.
    *   `remoteDbController` allows executing arbitrary SQL if the Action is configured as such. Ensure strict RBAC on who can *edit* apps.

2.  **Features**:
    *   **Validation**: The `Action` input forms need better validation (regex patterns, required fields).
    *   **Layout**: The Dashboard grid is currently a simple vertical list of sections. A true grid layout (drag-and-drop) would be a nice enhancement.

3.  **Tech Debt**:
    *   `serverless.yml` exists but the project runs as a standard Express app. Clarify deployment strategy (Pure Lambda vs. Container/EC2).

## 💡 How to Continue

If you are the next AI or Developer picking this up:
1.  **To add a new DB type**:
    *   Install driver in `backend`.
    *   Add connection logic to `backend/controllers/remoteDbController.js` (`testConnection`, `getData`, `updateData`).
    *   Update `DataSourceEditor.jsx` to allow selecting the new type.
2.  **To add a new Widget**:
    *   Create component in `frontend/src/components/widgets/`.
    *   Add to `GenericAppLoader.jsx` switch statement.
    *   Add configuration options to `LayoutEditor.jsx`.
