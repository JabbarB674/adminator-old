import React from 'react';
import { useAuth } from '../context/AuthContext';
import "../styles/auth.css"; // Import styles for tech-logo

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div>
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
