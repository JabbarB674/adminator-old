import React from 'react';
import { useLocation } from 'react-router-dom';
import Header from '../components/layout/Header';
import Sidebar from '../components/layout/Sidebar';

export default function MainLayout({ children }) {
  const location = useLocation();
  const isAppView = location.pathname.startsWith('/apps/');

  return (
    <div className="main-layout" style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#121212', color: '#e0e0e0' }}>
      <Header />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minWidth: 0 }}>
          <div style={{ 
            maxWidth: isAppView ? '100%' : '1200px', 
            margin: '0 auto', 
            padding: '2rem',
            width: '100%',
            boxSizing: 'border-box'
          }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
