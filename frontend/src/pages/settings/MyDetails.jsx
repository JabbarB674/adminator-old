import React from 'react';
import { useAuth } from '../../context/AuthContext';

export default function MyDetails() {
  const { user } = useAuth();

  if (!user) return <div>Loading...</div>;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '2rem', borderBottom: '1px solid #333', paddingBottom: '1rem' }}>My Details</h2>
      
      <div style={{ 
        background: '#1e1e1e', 
        padding: '2rem', 
        borderRadius: '8px', 
        border: '1px solid #333' 
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          
          <div className="detail-group">
            <label style={{ display: 'block', color: '#888', marginBottom: '0.5rem', fontSize: '0.9rem' }}>First Name</label>
            <div style={{ fontSize: '1.1rem', fontWeight: '500' }}>{user.firstName || 'N/A'}</div>
          </div>

          <div className="detail-group">
            <label style={{ display: 'block', color: '#888', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Last Name</label>
            <div style={{ fontSize: '1.1rem', fontWeight: '500' }}>{user.lastName || 'N/A'}</div>
          </div>

          <div className="detail-group">
            <label style={{ display: 'block', color: '#888', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Email Address</label>
            <div style={{ fontSize: '1.1rem', fontWeight: '500' }}>{user.email || 'N/A'}</div>
          </div>

          <div className="detail-group">
            <label style={{ display: 'block', color: '#888', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Profile</label>
            <div style={{ 
              display: 'inline-block',
              padding: '0.25rem 0.75rem',
              background: 'rgba(255, 0, 0, 0.1)',
              color: '#ff4d4d',
              borderRadius: '4px',
              fontSize: '0.9rem',
              fontWeight: 'bold',
              border: '1px solid rgba(255, 0, 0, 0.2)'
            }}>
              {user.profileName || 'User'}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
