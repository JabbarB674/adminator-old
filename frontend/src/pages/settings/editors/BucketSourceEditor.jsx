import React, { useState } from 'react';
import { apiUrl } from '../../../utils/api';

export default function BucketSourceEditor({ bucketSource, onChange }) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [error, setError] = useState(null);

  const data = bucketSource || {
    config: {
      endpoint: '',
      region: 'us-east-1',
      bucketName: '',
      accessKeyId: '',
      secretAccessKey: ''
    },
    permissions: {
      read: true,
      write: true,
      delete: false
    }
  };

  const handleConfigChange = (field, value) => {
    onChange({
      ...data,
      config: { ...data.config, [field]: value }
    });
  };

  const handlePermissionChange = (field, value) => {
    onChange({
      ...data,
      permissions: { ...data.permissions, [field]: value }
    });
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    setError(null);

    try {
        const token = localStorage.getItem('jwt');
        const res = await fetch(apiUrl('/apps/test-bucket-connection'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ config: data.config })
        });

        const json = await res.json();

        if (!res.ok) {
            throw new Error(json.error || 'Connection failed');
        }

        setTestResult(json);
    } catch (err) {
        setError(err.message);
    } finally {
        setTesting(false);
    }
  };

  return (
    <div className="editor-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>Bucket Configuration</h3>
        <button 
            className="btn-secondary" 
            onClick={handleTestConnection}
            disabled={testing}
        >
            {testing ? 'Testing...' : 'Test Connection'}
        </button>
      </div>
      <p className="editor-description">Configure an S3-compatible bucket for file storage.</p>

      {error && (
          <div style={{ padding: '1rem', background: 'rgba(255, 77, 77, 0.1)', border: '1px solid #ff4d4d', color: '#ff4d4d', borderRadius: '4px', marginBottom: '1rem' }}>
              <strong>Connection Failed:</strong> {error}
          </div>
      )}

      {testResult && (
          <div style={{ padding: '1rem', background: 'rgba(76, 175, 80, 0.1)', border: '1px solid #4caf50', borderRadius: '4px', marginBottom: '1rem' }}>
              <div style={{ color: '#4caf50', fontWeight: 'bold', marginBottom: '0.5rem' }}>✓ Connection Successful</div>
              <div style={{ fontSize: '0.85rem', color: '#ddd' }}>
                  <strong>Found {testResult.items.length} items in root:</strong>
                  <ul style={{ margin: '0.5rem 0 0 1rem', padding: 0 }}>
                      {testResult.items.slice(0, 5).map((item, idx) => (
                          <li key={idx}>
                              {item.type === 'folder' ? '📁 ' : '📄 '}
                              {item.name}
                          </li>
                      ))}
                      {testResult.items.length > 5 && <li>...and {testResult.items.length - 5} more</li>}
                      {testResult.items.length === 0 && <li>(Bucket is empty)</li>}
                  </ul>
              </div>
          </div>
      )}

      <div className="form-group">
        <label>Endpoint URL</label>
        <input 
          type="text" 
          value={data.config?.endpoint || ''} 
          onChange={e => handleConfigChange('endpoint', e.target.value)}
          placeholder="http://localhost:9000 or https://s3.amazonaws.com"
        />
        <small>For AWS S3, leave blank or use https://s3.amazonaws.com</small>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Region</label>
          <input 
            type="text" 
            value={data.config?.region || ''} 
            onChange={e => handleConfigChange('region', e.target.value)}
            placeholder="us-east-1"
          />
        </div>
        <div className="form-group">
          <label>Bucket Name</label>
          <input 
            type="text" 
            value={data.config?.bucketName || ''} 
            onChange={e => handleConfigChange('bucketName', e.target.value)}
            placeholder="my-app-storage"
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Access Key ID</label>
          <input 
            type="text" 
            value={data.config?.accessKeyId || ''} 
            onChange={e => handleConfigChange('accessKeyId', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Secret Access Key</label>
          <input 
            type="password" 
            value={data.config?.secretAccessKey || ''} 
            onChange={e => handleConfigChange('secretAccessKey', e.target.value)}
          />
        </div>
      </div>

      <h4 style={{ marginTop: '2rem', borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>Permissions</h4>
      <div className="form-row" style={{ justifyContent: 'flex-start', gap: '2rem' }}>
        <label className="checkbox-label">
          <input 
            type="checkbox" 
            checked={data.permissions?.read !== false} 
            onChange={e => handlePermissionChange('read', e.target.checked)}
          />
          Allow Read (List/Download)
        </label>
        <label className="checkbox-label">
          <input 
            type="checkbox" 
            checked={data.permissions?.write === true} 
            onChange={e => handlePermissionChange('write', e.target.checked)}
          />
          Allow Write (Upload)
        </label>
        <label className="checkbox-label">
          <input 
            type="checkbox" 
            checked={data.permissions?.delete === true} 
            onChange={e => handlePermissionChange('delete', e.target.checked)}
          />
          Allow Delete
        </label>
      </div>
    </div>
  );
}
