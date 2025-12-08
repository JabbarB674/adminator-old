import React from 'react';
import { useAuth } from '../context/AuthContext';
import "../styles/auth.css"; // Import styles for tech-logo

export default function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
      </div>
      <h2>Dashboard</h2>
      <p>Welcome, {user?.email}!</p>
      <button onClick={logout} style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}>Logout</button>
    </div>
  );
}
