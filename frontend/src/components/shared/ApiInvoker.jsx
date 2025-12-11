import React, { useState, useEffect } from 'react';
import { apiUrl, API_BASE } from '../../utils/api';

export default function ApiInvoker({ title, endpoint = API_BASE, method = 'GET', defaultPayload = {} }) {
  const [currentEndpoint, setCurrentEndpoint] = useState(endpoint.startsWith('http') ? endpoint : apiUrl(endpoint));
  const [currentMethod, setCurrentMethod] = useState(method);
  const [payload, setPayload] = useState(JSON.stringify(defaultPayload, null, 2));
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('json'); // 'json' | 'preview'

  // Common endpoints for quick selection
  const commonEndpoints = [
    { 
      label: 'Auth: Login', 
      value: `${API_BASE}/login`, 
      method: 'POST',
      payload: { email: "admin@example.com", password: "password" }
    },
    { 
      label: 'Uploads: List', 
      value: `${API_BASE}/upload/list`, 
      method: 'GET',
      payload: {}
    },
    { 
      label: 'Uploads: Upload', 
      value: `${API_BASE}/upload`, 
      method: 'POST',
      payload: { _warning: "This endpoint requires multipart/form-data (file). Use the File Uploader tool." }
    },
    { 
      label: 'DB: Query', 
      value: `${API_BASE}/db/query`, 
      method: 'POST',
      payload: { query: "SELECT TOP 10 * FROM Adminator_Users" }
    },
    { 
      label: 'Health Check', 
      value: API_BASE.replace('/api', ''), 
      method: 'GET',
      payload: {}
    }
  ];

  const handleInvoke = async () => {
    setLoading(true);
    setResponse(null);
    try {
      const token = localStorage.getItem('jwt');
      const headers = {
        'Content-Type': 'application/json'
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const options = {
        method: currentMethod,
        headers
      };

      // Only attach body if payload is not empty and method is not GET/HEAD (unless user forces it, but standard fetch might ignore body on GET)
      // User asked: "if typed something, its enabled". 
      // We will try to send it if it's not empty.
      if (payload && payload.trim() !== '') {
        try {
            // Validate JSON
            JSON.parse(payload);
            options.body = payload;
        } catch (e) {
            // If not valid JSON, maybe send as text? Or just fail?
            // For now let's assume JSON.
            console.warn("Payload is not valid JSON, sending anyway if possible");
            options.body = payload;
        }
      }

      // Use currentEndpoint directly if it is a full URL, otherwise use apiUrl helper
      const url = currentEndpoint.startsWith('http') ? currentEndpoint : apiUrl(currentEndpoint);
      const res = await fetch(url, options);
      
      const contentType = res.headers.get("content-type");
      let data;
      let isJson = false;
      if (contentType && contentType.indexOf("application/json") !== -1) {
        data = await res.json();
        isJson = true;
      } else {
        data = await res.text();
      }

      setResponse({
        status: res.status,
        statusText: res.statusText,
        data: data,
        isJson: isJson,
        headers: Object.fromEntries(res.headers.entries())
      });
      
      // Auto-switch tab based on content type
      if (!isJson && contentType && contentType.includes('text/html')) {
          setActiveTab('preview');
      } else {
          setActiveTab('json');
      }

    } catch (err) {
      setResponse({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handlePresetChange = (e) => {
      const selected = commonEndpoints.find(ep => ep.value === e.target.value);
      if (selected) {
          setCurrentEndpoint(selected.value);
          setCurrentMethod(selected.method);
          // If payload is empty object, set as empty string to disable the field visually
          const hasPayload = selected.payload && Object.keys(selected.payload).length > 0;
          setPayload(hasPayload ? JSON.stringify(selected.payload, null, 2) : '');
      }
  };

  return (
    <div style={{ 
      background: '#1e1e1e', 
      padding: '1.5rem', 
      borderRadius: '8px', 
      border: '1px solid #333',
      marginBottom: '2rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, color: '#fff' }}>{title || 'API Invoker'}</h3>
        <select 
            onChange={handlePresetChange}
            style={{ background: '#333', color: '#aaa', border: '1px solid #444', padding: '5px', borderRadius: '4px' }}
        >
            <option value="">Select Preset...</option>
            {commonEndpoints.map((ep, i) => (
                <option key={i} value={ep.value}>{ep.label}</option>
            ))}
        </select>
      </div>
      
      <div style={{ display: 'flex', gap: '10px' }}>
        <select
            value={currentMethod}
            onChange={(e) => setCurrentMethod(e.target.value)}
            style={{ 
                padding: '8px', 
                background: '#333', 
                border: '1px solid #444', 
                color: '#fff', 
                borderRadius: '4px',
                fontWeight: 'bold'
            }}
        >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
            <option value="PATCH">PATCH</option>
        </select>
        <input 
          type="text" 
          value={currentEndpoint}
          onChange={(e) => setCurrentEndpoint(e.target.value)}
          placeholder="http://localhost:5000/..."
          style={{ 
            flex: 1, 
            padding: '8px', 
            background: '#2d2d2d', 
            border: '1px solid #444', 
            color: '#fff',
            borderRadius: '4px',
            fontFamily: 'monospace'
          }}
        />
        <button 
            onClick={handleInvoke} 
            disabled={loading}
            style={{
            background: '#2196f3',
            color: 'white',
            border: 'none',
            padding: '0 1.5rem',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            fontWeight: 'bold'
            }}
        >
            {loading ? 'Sending...' : 'Send'}
        </button>
      </div>

      <div>
        <label style={{ display: 'block', color: '#888', marginBottom: '0.5rem', fontSize: '0.8rem' }}>
            Request Payload (JSON) - {payload && payload.trim() ? <span style={{color: '#4caf50'}}>Enabled</span> : <span style={{color: '#666'}}>Disabled (Empty)</span>}
        </label>
        <textarea
          value={payload}
          onChange={e => setPayload(e.target.value)}
          rows={5}
          placeholder="{}"
          style={{ 
            width: '100%', 
            fontFamily: 'monospace', 
            background: '#2d2d2d', 
            border: '1px solid #444', 
            color: '#d4d4d4',
            padding: '10px',
            borderRadius: '4px'
          }}
        />
      </div>

      {response && (
        <div style={{ borderTop: '1px solid #333', paddingTop: '1rem', marginTop: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                    onClick={() => setActiveTab('json')}
                    style={{ 
                        background: activeTab === 'json' ? '#333' : 'transparent', 
                        border: 'none', 
                        color: activeTab === 'json' ? '#fff' : '#888', 
                        padding: '5px 10px', 
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    JSON / Raw
                </button>
                <button 
                    onClick={() => setActiveTab('preview')}
                    style={{ 
                        background: activeTab === 'preview' ? '#333' : 'transparent', 
                        border: 'none', 
                        color: activeTab === 'preview' ? '#fff' : '#888', 
                        padding: '5px 10px', 
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    Preview (HTML)
                </button>
            </div>
            <span style={{ 
              color: response.status >= 200 && response.status < 300 ? '#4caf50' : '#f44336',
              fontWeight: 'bold'
            }}>
              {response.status} {response.statusText}
            </span>
          </div>

          <div style={{ 
              background: '#111', 
              borderRadius: '4px', 
              overflow: 'hidden',
              border: '1px solid #333',
              minHeight: '300px'
          }}>
            {activeTab === 'json' ? (
                <pre style={{ 
                    padding: '1rem', 
                    margin: 0,
                    overflowX: 'auto',
                    color: '#a5d6ff',
                    fontSize: '0.9rem',
                    maxHeight: '600px',
                    overflowY: 'auto'
                }}>
                    {response.isJson ? JSON.stringify(response.data, null, 2) : response.data}
                </pre>
            ) : (
                <div style={{ background: '#fff', height: '100%', minHeight: '300px' }}>
                    <iframe 
                        title="Response Preview"
                        srcDoc={typeof response.data === 'string' ? response.data : JSON.stringify(response.data)}
                        style={{ width: '100%', height: '600px', border: 'none' }}
                        sandbox="allow-same-origin"
                    />
                </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
