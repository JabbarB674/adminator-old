import React from 'react';
import { useAuth } from '../context/AuthContext';
import "../styles/auth.css"; // Import styles for tech-logo

export default function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <div>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderBottom: '1px solid #ccc' }}>
        <h2>Dashboard</h2>
        <div>
          <span>Welcome, {user?.email}!</span>
          <button onClick={logout} style={{ marginLeft: '1rem', padding: '0.5rem 1rem', cursor: 'pointer' }}>Logout</button>
        </div>
      </header>
      <main style={{ padding: '2rem' }}>
        <section>
          <h3>Your Apps</h3>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '1rem', textAlign: 'center', width: '150px' }}>
              <img src="/path/to/image.jpg" alt="App 1" style={{ width: '100%', height: 'auto', marginBottom: '0.5rem' }} />
              <p>App 1</p>
            </div>
            <div style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '1rem', textAlign: 'center', width: '150px' }}>
              <img src="/path/to/image.jpg" alt="App 2" style={{ width: '100%', height: 'auto', marginBottom: '0.5rem' }} />
              <p>App 2</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
