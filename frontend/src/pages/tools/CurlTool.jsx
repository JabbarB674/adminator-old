import React from 'react';
import ApiInvoker from '../../components/shared/ApiInvoker';

export default function CurlTool() {
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
