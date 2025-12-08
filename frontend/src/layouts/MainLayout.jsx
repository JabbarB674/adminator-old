import React from 'react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';

export default function MainLayout({ children }) {
  return (
    <div className="main-layout" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Header />
      <main style={{ flex: 1, padding: '2rem' }}>
        {children}
      </main>
      <Footer />
    </div>
  );
}
