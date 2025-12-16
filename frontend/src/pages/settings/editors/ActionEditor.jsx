import React, { useState } from 'react';

export default function ActionEditor({ actions, onChange }) {
  const list = actions || [];
  const [testResult, setTestResult] = useState(null);

  const handleAddAction = () => {
    const newAction = { 
      id: `action_${Date.now()}`, 
      type: 'http', 
      method: 'POST',
      url: '',
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + Math.random().toString(36).substring(7) },
      query: 'SELECT TOP 10 * FROM TableName'
    };
    onChange([...list, newAction]);
  };

  const handleUpdateAction = (index, field, value) => {
    const newList = [...list];
    newList[index] = { ...newList[index], [field]: value };
    onChange(newList);
  };

  const handleUpdateHeader = (index, headerKey, headerValue) => {
      const newList = [...list];
      const headers = { ...newList[index].headers, [headerKey]: headerValue };
      newList[index] = { ...newList[index], headers };
      onChange(newList);
  };

  const handleDeleteHeader = (index, headerKey) => {
      const newList = [...list];
      const headers = { ...newList[index].headers };
      delete headers[headerKey];
      newList[index] = { ...newList[index], headers };
      onChange(newList);
  };

  const handleAddHeader = (index) => {
      const newList = [...list];
      const headers = { ...newList[index].headers, "New-Header": "Value" };
      newList[index] = { ...newList[index], headers };
      onChange(newList);
  };

  const handleDeleteAction = (index) => {
    const newList = list.filter((_, i) => i !== index);
    onChange(newList);
  };

  const handleTestAuth = async (action) => {
      setTestResult({ loading: true });
      try {
          if (!action.authUrl) throw new Error('Auth URL is required');
          
          const res = await fetch(action.authUrl, {
              method: action.authMethod || 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: (action.authMethod !== 'GET' && action.authBody) ? action.authBody : undefined
          });
          
          const text = await res.text();
          let json;
          try { json = JSON.parse(text); } catch(e) { json = text; }

          if (!res.ok) throw new Error(json.error || json.message || 'Auth request failed');

          // Resolve token
          let token = json;
          if (action.tokenPath) {
              const parts = action.tokenPath.split(/[.>]/); // Support dot or > notation
              for (const part of parts) {
                  if (token && typeof token === 'object') {
                      token = token[part.trim()];
                  }
              }
          }
          
          const finalHeader = (action.tokenPrefix || '') + (typeof token === 'string' ? token : JSON.stringify(token));
          setTestResult({ success: true, token: finalHeader, raw: json });
      } catch (e) {
          setTestResult({ success: false, error: e.message });
      }
  };

  return (
    <div className="action-editor">
      <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>Configurable Actions</h3>
        <button className="btn-small" onClick={handleAddAction}>+ Add Action</button>
      </div>

      {testResult && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <div style={{ background: '#1e1e1e', padding: '2rem', borderRadius: '8px', maxWidth: '600px', width: '90%', border: '1px solid #444' }}>
                  <h3 style={{ marginTop: 0 }}>Auth Test Result</h3>
                  {testResult.loading ? (
                      <div>Testing Authentication...</div>
                  ) : (
                      <>
                        {testResult.success ? (
                            <div style={{ color: '#4caf50', marginBottom: '1rem' }}>
                                <strong>✓ Success!</strong><br/>
                                <div style={{ marginTop: '0.5rem', color: '#ddd' }}>Resolved Header Value:</div>
                                <code style={{ display: 'block', background: '#111', padding: '0.5rem', marginTop: '0.25rem', wordBreak: 'break-all' }}>
                                    {testResult.token}
                                </code>
                            </div>
                        ) : (
                            <div style={{ color: '#ff4d4d', marginBottom: '1rem' }}>
                                <strong>✗ Failed:</strong> {testResult.error}
                            </div>
                        )}
                        
                        {testResult.raw && (
                            <div style={{ marginTop: '1rem' }}>
                                <div style={{ fontSize: '0.8rem', color: '#888' }}>Raw Response:</div>
                                <pre style={{ background: '#111', padding: '0.5rem', fontSize: '0.75rem', maxHeight: '200px', overflow: 'auto' }}>
                                    {JSON.stringify(testResult.raw, null, 2)}
                                </pre>
                            </div>
                        )}
                        
                        <button className="btn-primary" onClick={() => setTestResult(null)} style={{ marginTop: '1rem', width: '100%' }}>Close</button>
                      </>
                  )}
              </div>
          </div>
      )}

      {list.map((action, aIndex) => (
        <div key={aIndex} style={{ background: '#252525', padding: '1rem', marginBottom: '1rem', borderRadius: '4px', border: '1px solid #333' }}>
          
          {/* Header Row */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'center' }}>
            <div style={{ width: '200px' }}>
                <label style={{fontSize: '0.8rem', color: '#888', display: 'block'}}>Action ID</label>
                <input
                    type="text"
                    value={action.id}
                    onChange={(e) => handleUpdateAction(aIndex, 'id', e.target.value)}
                    style={{ width: '100%', fontWeight: 'bold' }}
                />
            </div>
            <div style={{ width: '150px' }}>
                <label style={{fontSize: '0.8rem', color: '#888', display: 'block'}}>Type</label>
                <select
                    value={action.type || 'http'}
                    onChange={(e) => handleUpdateAction(aIndex, 'type', e.target.value)}
                    style={{ width: '100%' }}
                >
                    <option value="http">HTTP Request</option>
                    <option value="sql">SQL Query</option>
                </select>
            </div>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end' }}>
                <button className="btn-secondary" onClick={() => handleDeleteAction(aIndex)} style={{ color: '#ff4d4d', borderColor: '#ff4d4d' }}>Delete</button>
            </div>
          </div>

          {/* HTTP Configuration */}
          {action.type === 'http' && (
              <div style={{ background: '#222', padding: '1rem', borderRadius: '4px' }}>
                  <div style={{ marginBottom: '1rem' }}>
                      <label style={{fontSize: '0.8rem', color: '#888'}}>Description / Guide</label>
                      <textarea
                          value={action.description || ''}
                          onChange={(e) => handleUpdateAction(aIndex, 'description', e.target.value)}
                          placeholder="Explain how to use this action..."
                          style={{ width: '100%', minHeight: '60px', background: '#1a1a1a', border: '1px solid #444', color: '#ddd', padding: '0.5rem', borderRadius: '4px' }}
                      />
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                    <div style={{ width: '100px' }}>
                        <label style={{fontSize: '0.8rem', color: '#888'}}>Method</label>
                        <select
                            value={action.method}
                            onChange={(e) => handleUpdateAction(aIndex, 'method', e.target.value)}
                            style={{ width: '100%' }}
                        >
                            <option value="GET">GET</option>
                            <option value="POST">POST</option>
                            <option value="PUT">PUT</option>
                            <option value="DELETE">DELETE</option>
                            <option value="PATCH">PATCH</option>
                        </select>
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{fontSize: '0.8rem', color: '#888'}}>URL</label>
                        <input
                            type="text"
                            value={action.url || ''}
                            onChange={(e) => handleUpdateAction(aIndex, 'url', e.target.value)}
                            placeholder="https://api.example.com/v1/resource"
                            style={{ width: '100%' }}
                        />
                    </div>
                  </div>

                  <div style={{ marginBottom: '1rem', background: '#1a1a1a', padding: '1rem', borderRadius: '4px', border: '1px solid #333' }}>
                      <label style={{fontSize: '0.8rem', color: '#aaa', fontWeight: 'bold', marginBottom: '0.5rem', display: 'block'}}>Authentication</label>
                      
                      <div style={{ marginBottom: '1rem' }}>
                          <label style={{fontSize: '0.8rem', color: '#888'}}>Auth Type</label>
                          <select
                              value={action.authType || 'none'}
                              onChange={(e) => handleUpdateAction(aIndex, 'authType', e.target.value)}
                              style={{ width: '100%', background: '#2a2a2a', color: '#fff', border: '1px solid #444', padding: '0.5rem' }}
                          >
                              <option value="none">None / Static Headers</option>
                              <option value="dynamic">Dynamic Token (Fetch from Auth Server)</option>
                              <option value="aws_iam">AWS SigV4 (IAM)</option>
                          </select>
                      </div>

                      {action.authType === 'aws_iam' && (
                          <div style={{ paddingLeft: '1rem', borderLeft: '2px solid #444' }}>
                              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                                  <div style={{ flex: 1 }}>
                                      <label style={{fontSize: '0.8rem', color: '#888'}}>AWS Region</label>
                                      <input
                                          type="text"
                                          value={action.awsRegion || ''}
                                          onChange={(e) => handleUpdateAction(aIndex, 'awsRegion', e.target.value)}
                                          placeholder="us-east-1"
                                          style={{ width: '100%' }}
                                      />
                                  </div>
                                  <div style={{ flex: 1 }}>
                                      <label style={{fontSize: '0.8rem', color: '#888'}}>AWS Service</label>
                                      <input
                                          type="text"
                                          value={action.awsService || ''}
                                          onChange={(e) => handleUpdateAction(aIndex, 'awsService', e.target.value)}
                                          placeholder="execute-api"
                                          style={{ width: '100%' }}
                                      />
                                  </div>
                              </div>
                              <div style={{ marginBottom: '1rem' }}>
                                  <label style={{fontSize: '0.8rem', color: '#888'}}>Assume Role ARN (Optional)</label>
                                  <input
                                      type="text"
                                      value={action.awsAssumeRoleArn || ''}
                                      onChange={(e) => handleUpdateAction(aIndex, 'awsAssumeRoleArn', e.target.value)}
                                      placeholder="arn:aws:iam::123456789012:role/MyRole"
                                      style={{ width: '100%' }}
                                  />
                                  <p style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
                                      If provided, the backend will assume this role before signing the request.
                                  </p>
                              </div>
                          </div>
                      )}

                      {action.authType === 'dynamic' && (
                          <div style={{ paddingLeft: '1rem', borderLeft: '2px solid #444' }}>
                              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                                  <div style={{ width: '100px' }}>
                                      <label style={{fontSize: '0.8rem', color: '#888'}}>Method</label>
                                      <select
                                          value={action.authMethod || 'POST'}
                                          onChange={(e) => handleUpdateAction(aIndex, 'authMethod', e.target.value)}
                                          style={{ width: '100%' }}
                                      >
                                          <option value="POST">POST</option>
                                          <option value="GET">GET</option>
                                      </select>
                                  </div>
                                  <div style={{ flex: 1 }}>
                                      <label style={{fontSize: '0.8rem', color: '#888'}}>Auth URL</label>
                                      <input
                                          type="text"
                                          value={action.authUrl || ''}
                                          onChange={(e) => handleUpdateAction(aIndex, 'authUrl', e.target.value)}
                                          placeholder="https://auth.example.com/token"
                                          style={{ width: '100%' }}
                                      />
                                  </div>
                              </div>

                              <div style={{ marginBottom: '1rem' }}>
                                  <label style={{fontSize: '0.8rem', color: '#888'}}>Auth Body (JSON)</label>
                                  <textarea
                                      value={action.authBody || ''}
                                      onChange={(e) => handleUpdateAction(aIndex, 'authBody', e.target.value)}
                                      placeholder='{ "client_id": "...", "client_secret": "..." }'
                                      style={{ width: '100%', minHeight: '60px', fontFamily: 'monospace', fontSize: '0.85rem', background: '#111', border: '1px solid #444', color: '#ddd' }}
                                  />
                              </div>

                              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                                  <div style={{ flex: 1 }}>
                                      <label style={{fontSize: '0.8rem', color: '#888'}}>Token Path (e.g. data.accessToken)</label>
                                      <input
                                          type="text"
                                          value={action.tokenPath || ''}
                                          onChange={(e) => handleUpdateAction(aIndex, 'tokenPath', e.target.value)}
                                          placeholder="access_token"
                                          style={{ width: '100%' }}
                                      />
                                  </div>
                                  <div style={{ flex: 1 }}>
                                      <label style={{fontSize: '0.8rem', color: '#888'}}>Token Prefix</label>
                                      <input
                                          type="text"
                                          value={action.tokenPrefix || ''}
                                          onChange={(e) => handleUpdateAction(aIndex, 'tokenPrefix', e.target.value)}
                                          placeholder="Bearer "
                                          style={{ width: '100%' }}
                                      />
                                  </div>
                              </div>

                              <button 
                                  className="btn-secondary" 
                                  onClick={() => handleTestAuth(action)}
                                  style={{ fontSize: '0.8rem' }}
                              >
                                  Test Auth & Preview Token
                              </button>
                          </div>
                      )}
                  </div>

                  <div style={{ marginBottom: '1rem', background: '#1a1a1a', padding: '1rem', borderRadius: '4px', border: '1px solid #333' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <input 
                            type="checkbox" 
                            id={`allowFile-${aIndex}`}
                            checked={action.allowFile || false}
                            onChange={(e) => handleUpdateAction(aIndex, 'allowFile', e.target.checked)}
                          />
                          <label htmlFor={`allowFile-${aIndex}`} style={{ color: '#ddd', cursor: 'pointer' }}>Allow File Attachment (Upload to Minio)</label>
                      </div>
                      {action.allowFile && (
                          <div style={{ fontSize: '0.8rem', color: '#888', marginLeft: '1.5rem' }}>
                              When enabled, users can select a file (Local or Minio). The file path will be available as <code>{`{{filePath}}`}</code> in your payload.
                          </div>
                      )}
                  </div>

                  <div style={{ marginBottom: '1rem', background: '#1a1a1a', padding: '1rem', borderRadius: '4px', border: '1px solid #333' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <label style={{fontSize: '0.8rem', color: '#aaa', fontWeight: 'bold'}}>HTTP Headers</label>
                        <button className="btn-small" onClick={() => handleAddHeader(aIndex)} style={{ fontSize: '0.7rem', padding: '2px 8px' }}>+ Add Header</button>
                      </div>
                      
                      {(!action.headers || Object.keys(action.headers).length === 0) && (
                          <div style={{ fontSize: '0.8rem', color: '#666', fontStyle: 'italic' }}>No custom headers configured.</div>
                      )}

                      {action.headers && Object.entries(action.headers).map(([key, val], hIdx) => (
                          <div key={hIdx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                              <input 
                                type="text" 
                                value={key} 
                                onChange={(e) => {
                                    const newHeaders = { ...action.headers };
                                    const val = newHeaders[key];
                                    delete newHeaders[key];
                                    newHeaders[e.target.value] = val;
                                    handleUpdateAction(aIndex, 'headers', newHeaders);
                                }}
                                placeholder="Header Key"
                                style={{ flex: 1, background: '#2a2a2a', border: '1px solid #444', color: '#fff', padding: '0.5rem' }}
                              />
                              <span style={{ color: '#666' }}>:</span>
                              <input 
                                type="text" 
                                value={val} 
                                onChange={(e) => handleUpdateHeader(aIndex, key, e.target.value)}
                                placeholder="Header Value"
                                style={{ flex: 2, background: '#2a2a2a', border: '1px solid #444', color: '#a5d6a7', padding: '0.5rem' }}
                              />
                              <button 
                                className="btn-small" 
                                onClick={() => handleDeleteHeader(aIndex, key)}
                                style={{ color: '#ff4d4d', border: '1px solid #ff4d4d', padding: '0.25rem 0.5rem', marginLeft: '0.5rem' }}
                                title="Remove Header"
                              >×</button>
                          </div>
                      ))}
                  </div>
              </div>
          )}

          {/* SQL Configuration */}
          {action.type === 'sql' && (
              <div style={{ background: '#222', padding: '1rem', borderRadius: '4px' }}>
                  <label style={{fontSize: '0.8rem', color: '#888', display: 'block', marginBottom: '0.5rem'}}>SQL Query</label>
                  <textarea
                      value={action.query || ''}
                      onChange={(e) => handleUpdateAction(aIndex, 'query', e.target.value)}
                      rows={5}
                      style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.9rem', background: '#111', color: '#dcdcaa' }}
                      placeholder="SELECT * FROM Users WHERE id = @input"
                  />
                  <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.5rem' }}>
                      Use <code>@input</code> to reference the payload sent from the UI.
                  </p>
              </div>
          )}

        </div>
      ))}
    </div>
  );
}
