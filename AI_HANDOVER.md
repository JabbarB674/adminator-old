# AI Handover Document

**Date:** December 11, 2025
**Project:** Adminator

## Project Overview
Adminator is a React + Node.js administration dashboard. It connects to a SQL Server database and manages users, applications, and internal tools.

## Current State
- **Frontend**: React 18, React Router v6.
- **Backend**: Express.js, `tedious` (SQL Server driver).
- **Database**: SQL Server. 4 Core tables: `Adminator_Users`, `Adminator_Apps`, `Adminator_AccessProfiles`, `Adminator_ProfileAppAccess`.

## Key Architectural Decisions

### 1. Permission System (Custom Profiles)
**Constraint**: The user explicitly requested NOT to add new tables for user-specific permissions.
**Solution**: We implemented a "Custom Profile" pattern.
- **Standard**: Users are assigned a generic Profile (e.g., "Administrator", "TastyUser").
- **Override**: When "Override Profile Permissions" is toggled for a user:
    1. A new profile is created in `Adminator_AccessProfiles` named `Custom_User_{UserId}`.
    2. The user is moved to this profile.
    3. Specific apps are mapped to this profile in `Adminator_ProfileAppAccess`.
- **Logic Location**: `backend/controllers/userController.js` -> `updateUserApps`.

### 2. Sidebar Navigation
- The Sidebar (`frontend/src/components/layout/Sidebar.jsx`) uses local state `expandedGroups` to manage dropdowns.
- "User Control" is a dropdown containing "User Management" and "User Permissions".
- Only visible to `isGlobalAdmin`.

### 3. App Integration
- Apps are defined in the `Adminator_Apps` table.
- Frontend loads apps dynamically or via specific routes.
- "Tasty Customers" is a specific integrated app with its own backend logic in `backend/apps/tasty-customers`.

## Recent Changes & Fixes
1.  **Backend Crash Fix**: Fixed a `ReferenceError` and an `Ambiguous column name` error in `userController.js`.
    - *Critical*: Ensure `npm start` is run in `backend/` to apply these fixes.
2.  **Sidebar Visibility**: Updated `Sidebar.jsx` to correctly initialize state so the "User Control" group is usable.
3.  **New Endpoint**: Added `GET /api/db/apps` to `dbController.js` to support the permissions UI.

## Known Issues / TODOs
- **Backend Restart**: The backend process needs to be manually restarted after the recent code fixes.
- **Error Handling**: The frontend `UserPermissions` page assumes the backend is up. Better error boundaries could be added.
- **Validation**: Input validation on the User Create/Edit forms is basic.

## Development Commands
- **Backend**: `cd backend && npm start` (Runs on port 5000)
- **Frontend**: `cd frontend && npm start` (Runs on port 3000)

## Environment Variables
See `backend/.env.sample` for required keys.
- `DB_SERVER`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`: SQL Server connection.
- `JWT_SECRET`: For signing auth tokens.
- `S3_*`: For MinIO/S3 integration (Bucket Explorer).
