import React from 'react';
import Header from '../components/layout/Header';

export default function MainLayout({ children }) {
  return (
    <div className="main-layout" style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#121212', color: '#e0e0e0' }}>
      <Header />
      <main style={{ flex: 1, padding: '2rem' }}>
        {children}
      </main>
    </div>
  );
}
