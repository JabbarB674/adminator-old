import React from 'react';

export default function TastyCustomers() {
  return (
    <div>
      <h1 style={{ color: '#fff' }}>Tasty Customers Dashboard</h1>
      <p style={{ color: '#aaa' }}>Welcome to the Tasty Customers management interface.</p>
      <div style={{ marginTop: '2rem', padding: '1rem', background: '#1e1e1e', borderRadius: '8px' }}>
        <h3 style={{ color: '#fff' }}>Quick Actions</h3>
        <ul style={{ color: '#ccc', marginTop: '1rem' }}>
            <li>Manage Orders</li>
            <li>View Customer List</li>
            <li>Catering Menu</li>
        </ul>
      </div>
    </div>
  );
}
