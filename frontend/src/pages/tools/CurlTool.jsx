import React from 'react';
import ApiInvoker from '../../components/shared/ApiInvoker';
import { useAuth } from '../../context/AuthContext';

export default function CurlTool() {
  const { user } = useAuth();

  if (!user || !user.isGlobalAdmin) {
    return (
      <div style={{ 
        maxWidth: '800px', 
        margin: '2rem auto', 
        padding: '2rem',
        background: '#2a1515',
        border: '1px solid #ff4d4d',
        borderRadius: '8px',
        color: '#ff4d4d',
        textAlign: 'center'
      }}>
        <h2 style={{ marginBottom: '1rem' }}>Access Denied</h2>
        <p>You do not have enough permissions for this feature.</p>
        <p style={{ fontSize: '0.9rem', opacity: 0.8, marginTop: '0.5rem' }}>Required: Global Admin privileges</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ color: '#fff', marginBottom: '1rem' }}>cURL Tool</h1>
      <p style={{ color: '#aaa', marginBottom: '2rem' }}>
        Manually trigger API endpoints.
      </p>
      
      <ApiInvoker 
        title="Generic Request" 
        method="GET"
        defaultPayload={{}}
      />
    </div>
  );
}
