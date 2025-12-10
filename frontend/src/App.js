import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import MainLayout from "./layouts/MainLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import UserControl from "./pages/UserControl";
import MyDetails from "./pages/settings/MyDetails";
import AppConfiguration from "./pages/settings/AppConfiguration";
import NuclearCommands from "./pages/settings/NuclearCommands";
import CurlTool from "./pages/tools/CurlTool";
import DbLookup from "./pages/tools/DbLookup";

const ProtectedLayout = () => {
  return (
    <ProtectedRoute>
      <MainLayout>
        <Outlet />
      </MainLayout>
    </ProtectedRoute>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route element={<ProtectedLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/user-control" element={<UserControl />} />
            <Route path="/settings/my-details" element={<MyDetails />} />
            <Route path="/settings/app-configuration" element={<AppConfiguration />} />
            <Route path="/settings/nuclear-commands" element={<NuclearCommands />} />
            <Route path="/tools/curl" element={<CurlTool />} />
            <Route path="/tools/db-lookup" element={<DbLookup />} />
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
