import React, { useState } from 'react';
import { apiUrl } from '../../../utils/api';
import { authService } from '../../../services/authService';

export default function DataSourceEditor({ dataSource, onChange }) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [error, setError] = useState(null);

  const data = dataSource || {
    type: 'mssql',
    config: {
      server: '',
      port: 1433,
      database: '',
      user: '',
      password: ''
    },
    tables: []
  };

  const handleConfigChange = (field, value) => {
    onChange({
      ...data,
      config: { ...data.config, [field]: value }
    });
  };

  const handleTypeChange = (value) => {
    onChange({ ...data, type: value });
  };

  const handleAddTable = () => {
    const newTable = { name: '', displayName: '', primaryKey: 'id', allowEdit: true, allowDelete: false };
    onChange({ ...data, tables: [...(data.tables || []), newTable] });
  };

  const handleUpdateTable = (index, field, value) => {
    const newTables = [...data.tables];
    newTables[index] = { ...newTables[index], [field]: value };
    onChange({ ...data, tables: newTables });
  };

  const handleDeleteTable = (index) => {
    const newTables = data.tables.filter((_, i) => i !== index);
    onChange({ ...data, tables: newTables });
  };

  const testConnection = async () => {
    setTesting(true);
    setError(null);
    setTestResult(null);
    try {
      const token = authService.getToken();
      const res = await fetch(apiUrl('apps/test-connection'), {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
              type: data.type,
              config: data.config
          })
      });
      
      const resultData = await res.json();
      
      if (!res.ok) {
          throw new Error(resultData.error || 'Connection failed');
      }
      
      setTestResult(resultData);
    } catch (err) {
      setError(err.message);
    } finally {
      setTesting(false);
    }
  };

  const addDetectedTable = (tableName) => {
      if (data.tables?.some(t => t.name === tableName)) return;

      const newTable = { 
          name: tableName, 
          displayName: tableName, 
          primaryKey: 'id', 
          allowEdit: true, 
          allowDelete: false 
      };
      onChange({ ...data, tables: [...(data.tables || []), newTable] });
  };

  return (
    <div className="datasource-editor">
      <div className="editor-section" style={{ marginBottom: '2rem' }}>
        <h3>Database Connection</h3>
        <p className="hint">Configure the remote database this app will connect to.</p>
        
        <div className="form-group">
            <label>Database Type</label>
            <select value={data.type} onChange={(e) => handleTypeChange(e.target.value)}>
                <option value="mssql">SQL Server (MSSQL / RDS / Babelfish)</option>
                <option value="postgres">PostgreSQL (Standard / Aurora)</option>
                <option value="mysql">MySQL (Standard / Aurora)</option>
            </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '1rem' }}>
            <div className="form-group">
                <label>Host / Server</label>
                <input 
                    type="text" 
                    value={data.config.server} 
                    onChange={(e) => handleConfigChange('server', e.target.value)}
                    placeholder="e.g. my-db.cluster-xyz.us-east-1.rds.amazonaws.com"
                />
            </div>
            <div className="form-group">
                <label>Port</label>
                <input 
                    type="number" 
                    value={data.config.port} 
                    onChange={(e) => handleConfigChange('port', parseInt(e.target.value))}
                />
            </div>
        </div>

        <div className="form-group">
            <label>Database Name</label>
            <input 
                type="text" 
                value={data.config.database} 
                onChange={(e) => handleConfigChange('database', e.target.value)}
            />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
                <label>Username</label>
                <input 
                    type="text" 
                    value={data.config.user} 
                    onChange={(e) => handleConfigChange('user', e.target.value)}
                />
            </div>
            <div className="form-group">
                <label>Password</label>
                <input 
                    type="password" 
                    autoComplete="new-password"
                    data-lpignore="true"
                    value={data.config.password && data.config.password.startsWith('{{VAULT:') ? '' : data.config.password} 
                    onChange={(e) => handleConfigChange('password', e.target.value)}
                    placeholder={data.config.password && data.config.password.startsWith('{{VAULT:') ? 'Stored in Vault (Type to overwrite)' : 'Enter password'}
                    style={data.config.password && data.config.password.startsWith('{{VAULT:') ? { fontStyle: 'italic', color: '#aaa' } : {}}
                    onFocus={(e) => {
                        // If it's a placeholder, clear it on focus so user can type new one? 
                        // No, value is already empty string visually.
                        // But we need to ensure that if they DON'T type anything, the placeholder remains in the state.
                        // The current logic does that: value is derived from state. 
                        // If state has placeholder, input shows empty. 
                        // If user types 'a', onChange fires, state becomes 'a'. Placeholder gone.
                        // If user deletes 'a', state becomes ''. 
                        // PROBLEM: If state becomes '', we lose the placeholder!
                        // We need to distinguish between "User cleared the password" and "User didn't touch the placeholder".
                        // Actually, if the user clears the field, they probably want to remove the password.
                        // But if they just tab through, we want to keep the placeholder.
                    }}
                />
            </div>
        </div>

        <div style={{ marginTop: '1rem' }}>
            <button 
                className="btn-primary" 
                onClick={testConnection} 
                disabled={testing}
                style={{ opacity: testing ? 0.7 : 1 }}
            >
                {testing ? 'Testing Connection...' : 'Test Connection & Fetch Tables'}
            </button>
        </div>

        {error && (
            <div style={{ marginTop: '1rem', padding: '1rem', background: '#3d1a1a', border: '1px solid #ff4d4d', borderRadius: '4px', color: '#ffcccc' }}>
                <strong>Connection Failed:</strong> {error}
            </div>
        )}

        {testResult && (
            <div style={{ marginTop: '1rem', padding: '1rem', background: '#1a3d1a', border: '1px solid #4dff4d', borderRadius: '4px' }}>
                <div style={{ color: '#ccffcc', marginBottom: '0.5rem' }}><strong>✓ Connection Successful!</strong></div>
                <div style={{ fontSize: '0.9rem', color: '#eeffee' }}>Found {testResult.tables.length} tables.</div>
                
                <div style={{ marginTop: '1rem', maxHeight: '200px', overflowY: 'auto', background: '#00000033', padding: '0.5rem' }}>
                    {testResult.tables.map(t => {
                        const isAdded = data.tables?.some(existing => existing.name === t.name);
                        return (
                            <div key={t.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #ffffff11' }}>
                                <div style={{ overflow: 'hidden', flex: 1, marginRight: '1rem' }}>
                                    <div style={{ fontWeight: 'bold' }}>{t.schema}.{t.name}</div>
                                    <div style={{ fontSize: '0.8rem', color: '#aaa', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={t.columns?.join(', ')}>
                                        {t.columns?.join(', ')}
                                    </div>
                                </div>
                                {isAdded ? (
                                    <span style={{ color: '#888', fontSize: '0.8rem', flexShrink: 0 }}>Added</span>
                                ) : (
                                    <button 
                                        className="btn-small" 
                                        onClick={() => addDetectedTable(t.name)}
                                        style={{ padding: '2px 8px', fontSize: '0.75rem', flexShrink: 0 }}
                                    >
                                        Add
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        )}
      </div>

      <div className="editor-section">
        <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>Exposed Tables</h3>
            <button className="btn-small" onClick={handleAddTable}>+ Add Table</button>
        </div>
        <p className="hint">Specify which tables from the database should be accessible in this app.</p>

        {data.tables?.map((table, index) => (
            <div key={index} style={{ background: '#252525', padding: '1rem', marginBottom: '1rem', borderRadius: '4px', border: '1px solid #333' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                        <label style={{fontSize: '0.8rem', color: '#888'}}>Table Name (DB)</label>
                        <input 
                            type="text" 
                            value={table.name} 
                            onChange={(e) => handleUpdateTable(index, 'name', e.target.value)}
                            placeholder="e.g. Customers"
                        />
                    </div>
                    <div>
                        <label style={{fontSize: '0.8rem', color: '#888'}}>Display Name</label>
                        <input 
                            type="text" 
                            value={table.displayName} 
                            onChange={(e) => handleUpdateTable(index, 'displayName', e.target.value)}
                            placeholder="e.g. Client List"
                        />
                    </div>
                    <div>
                        <label style={{fontSize: '0.8rem', color: '#888'}}>Primary Key</label>
                        <input 
                            type="text" 
                            value={table.primaryKey} 
                            onChange={(e) => handleUpdateTable(index, 'primaryKey', e.target.value)}
                            placeholder="e.g. CustomerId"
                        />
                    </div>
                </div>
                
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                        <input 
                            type="checkbox" 
                            checked={table.allowEdit} 
                            onChange={(e) => handleUpdateTable(index, 'allowEdit', e.target.checked)}
                        />
                        Allow Editing
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                        <input 
                            type="checkbox" 
                            checked={table.allowDelete} 
                            onChange={(e) => handleUpdateTable(index, 'allowDelete', e.target.checked)}
                        />
                        Allow Deletion
                    </label>
                    <div style={{ flex: 1 }}></div>
                    <button className="btn-small" onClick={() => handleDeleteTable(index)} style={{ color: '#ff4d4d', borderColor: '#ff4d4d' }}>Remove Table</button>
                </div>
            </div>
        ))}

        {(!data.tables || data.tables.length === 0) && (
            <div className="empty-state">No tables configured. Add one to expose data.</div>
        )}
      </div>
    </div>
  );
}
