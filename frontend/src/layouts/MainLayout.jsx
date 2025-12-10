import React from 'react';
import Header from '../components/layout/Header';
import Sidebar from '../components/layout/Sidebar';

export default function MainLayout({ children }) {
  return (
    <div className="main-layout" style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#121212', color: '#e0e0e0' }}>
      <Header />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
