import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { apiUrl } from '../../utils/api';
import DataGrid from '../../components/widgets/DataGrid';
import BucketExplorer from '../../components/widgets/BucketExplorer';

export default function GenericAppLoader() {
  const { appKey } = useParams();
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDebug, setShowDebug] = useState(false);
  
  // Modal State
  const [activeModal, setActiveModal] = useState(null); // { type: 'db-lookup', target: 'TableName' }

  useEffect(() => {
    const loadConfig = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Find the app in the user's allowed list to get the ConfigPath
        // If user is global admin, they might not have it in allowedApps list if we rely on the old logic,
        // but our new authController logic ensures they have it.
        const app = user?.allowedApps?.find(a => a.appKey === appKey);
        
        // Fallback for direct access if not in list (e.g. just created)
        // In a real app we'd check permissions again, but here we rely on the backend to serve the file.
        const configFileName = app?.configPath || 'config.json';

        // 2. Fetch the JSON config from the bucket
        const configKey = `apps/${appKey}/${configFileName}`;
        
        const token = localStorage.getItem('jwt');
        const res = await fetch(apiUrl(`/upload/view?key=${encodeURIComponent(configKey)}`), {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) {
            throw new Error(`Failed to load app configuration: ${res.statusText}`);
        }

        const json = await res.json();
        setConfig(json);

      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadConfig();
    }
  }, [appKey, user]);

  if (loading) return <div style={{ padding: '2rem', color: '#aaa' }}>Loading App Configuration...</div>;
  
  if (error) return (
    <div style={{ padding: '2rem', color: '#ff4d4d', border: '1px solid #ff4d4d', borderRadius: '8px', margin: '2rem' }}>
      <h3>Error Loading App</h3>
      <p>{error}</p>
      <p style={{ fontSize: '0.8rem', color: '#aaa' }}>
        Ensure a valid JSON config file exists in the bucket at the configured path.
      </p>
    </div>
  );

  if (!config) return null;

  // Support both old (root sections) and new (layout.sections) structure
  const sections = config.layout?.sections || config.sections || [];
  const tables = config.dataSource?.tables || [];
  const actions = config.actions || [];

  const getTableInfo = (tableName) => tables.find(t => t.name === tableName);
  const getActionInfo = (actionId) => actions.find(a => a.id === actionId);

  const handleActionClick = (widget) => {
      if (widget.actionType === 'db-lookup') {
          setActiveModal({ type: 'db-lookup', target: widget.target });
      } else {
          showNotification(`Action Triggered: ${widget.actionType}\nTarget: ${widget.target || 'N/A'}`);
      }
  };

  return (
    <div style={{ width: '100%' }}>
      <header style={{ marginBottom: '2rem', borderBottom: '1px solid #333', paddingBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <div>
            <h1 style={{ color: '#fff', margin: 0 }}>{config.meta?.displayName || config.title || appKey}</h1>
            {config.meta?.description && <p style={{ color: '#aaa', marginTop: '0.5rem' }}>{config.meta.description}</p>}
        </div>
        <button 
            className="btn-secondary" 
            onClick={() => setShowDebug(!showDebug)}
            style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
        >
            {showDebug ? 'Hide Debug' : 'Show Debug'}
        </button>
      </header>

      {/* Tab Navigation if Bucket is present */}
      {showDebug && (
          <div style={{ background: '#111', padding: '1rem', borderRadius: '4px', marginBottom: '2rem', border: '1px solid #333', overflowX: 'auto' }}>
              <h4 style={{ marginTop: 0, color: '#888' }}>Raw Configuration</h4>
              <pre style={{ color: '#0f0', fontSize: '0.75rem' }}>{JSON.stringify(config, null, 2)}</pre>
          </div>
      )}

      <div style={{ display: 'grid', gap: '2rem' }}>
        {sections.map((section, idx) => (
          <div key={idx} style={{ background: '#1e1e1e', padding: '1.5rem', borderRadius: '8px', border: '1px solid #333', minWidth: 0 }}>
            {section.title && <h3 style={{ color: '#fff', marginTop: 0, borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>{section.title}</h3>}
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {section.widgets?.map((widget, wIdx) => (
                <div key={wIdx} className="widget-container">
                    
                    {/* MARKDOWN WIDGET */}
                    {widget.type === 'markdown' && (
                    <div style={{ color: '#ddd', lineHeight: '1.6', whiteSpace: 'pre-wrap', background: '#252525', padding: '1rem', borderRadius: '4px' }}>
                        {widget.content}
                    </div>
                    )}

                    {/* BUTTON WIDGET */}
                    {widget.type === 'button' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#252525', padding: '1rem', borderRadius: '4px' }}>
                            <button 
                                className="btn-primary"
                                onClick={() => handleActionClick(widget)}
                                style={{ minWidth: '150px' }}
                            >
                                {widget.label || 'Action Button'}
                            </button>
                            
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 'bold', color: '#fff' }}>
                                    {widget.actionType === 'curl' && 'API Invoker'}
                                    {widget.actionType === 'db-lookup' && 'Database Editor'}
                                    {widget.actionType === 'bucket' && 'S3 Bucket Explorer'}
                                    {widget.actionType === 'custom' && 'Custom Action'}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.25rem' }}>
                                    {widget.actionType === 'db-lookup' && (
                                        <span>Target Table: <code style={{ color: '#4caf50' }}>{widget.target}</code></span>
                                    )}
                                    {widget.actionType === 'bucket' && (
                                        <span>Path: <code style={{ color: '#2196f3' }}>{widget.target}</code></span>
                                    )}
                                    {widget.actionType === 'custom' && (
                                        <span>Action ID: <code style={{ color: '#ff9800' }}>{widget.target}</code></span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* DATA GRID WIDGET */}
                    {widget.type === 'data-grid' && (
                        <>
                            {getTableInfo(widget.table) ? (
                                <DataGrid 
                                    appKey={appKey} 
                                    tableName={widget.table} 
                                    tableConfig={getTableInfo(widget.table)} 
                                    showHeader={true}
                                />
                            ) : (
                                <div style={{ color: '#ff4d4d', padding: '1rem', border: '1px solid #ff4d4d', borderRadius: '4px' }}>
                                    Table <strong>{widget.table}</strong> not found in Data Source configuration.
                                </div>
                            )}
                        </>
                    )}

                    {/* BUCKET EXPLORER WIDGET */}
                    {widget.type === 'bucket-explorer' && (
                        <BucketExplorer appKey={appKey} />
                    )}

                    {/* UNIFIED ACTION BUTTON */}
                    {widget.type === 'action-button' && (
                        <ActionButtonWidget 
                            widget={widget} 
                            appKey={appKey} 
                            getActionInfo={getActionInfo} 
                        />
                    )}

                    {/* LEGACY LINK LIST */}
                    {widget.type === 'link-list' && (
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        {widget.links?.map((link, lIdx) => (
                        <a 
                            key={lIdx} 
                            href={link.url} 
                            target={link.external ? '_blank' : '_self'}
                            rel="noreferrer"
                            style={{ 
                            display: 'block', 
                            padding: '1rem', 
                            background: '#2d2d2d', 
                            color: '#2196f3', 
                            textDecoration: 'none',
                            borderRadius: '4px',
                            border: '1px solid #444'
                            }}
                        >
                            <div style={{ fontWeight: 'bold' }}>{link.label}</div>
                            {link.description && <div style={{ fontSize: '0.8rem', color: '#aaa', marginTop: '0.25rem' }}>{link.description}</div>}
                        </a>
                        ))}
                    </div>
                    )}
                </div>
                ))}
            </div>
          </div>
        ))}
      </div>

      {/* MODAL OVERLAY */}
      {activeModal && (
          <div style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.8)', zIndex: 1000,
              display: 'flex', justifyContent: 'center', alignItems: 'center'
          }}>
              <div style={{
                  background: '#1e1e1e', width: '90%', maxWidth: '1000px', height: '80vh',
                  borderRadius: '8px', border: '1px solid #444', display: 'flex', flexDirection: 'column'
              }}>
                  <div style={{ padding: '1rem', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 style={{ margin: 0 }}>
                          {activeModal.type === 'db-lookup' && `Database Editor: ${activeModal.target}`}
                      </h3>
                      <button className="btn-small" onClick={() => setActiveModal(null)}>Close</button>
                  </div>
                  <div style={{ flex: 1, overflow: 'auto', padding: '1rem' }}>
                      {activeModal.type === 'db-lookup' && (
                          <DataGrid 
                              appKey={appKey} 
                              tableName={activeModal.target} 
                              tableConfig={getTableInfo(activeModal.target)} 
                          />
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}

function ActionButtonWidget({ widget, appKey, getActionInfo }) {
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null); // { type: 'local'|'minio', file: File|string }
    const [showBucketModal, setShowBucketModal] = useState(false);
    const fileInputRef = React.useRef(null);

    const action = getActionInfo(widget.actionId);

    const handleFileSelect = (e) => {
        if (e.target.files[0]) {
            setSelectedFile({ type: 'local', file: e.target.files[0] });
        }
    };

    const handleMinioSelect = (path) => {
        setSelectedFile({ type: 'minio', path: path });
        setShowBucketModal(false);
    };

    const handleRun = async () => {
        if (!action) {
            setError('Action definition not found');
            return;
        }

        setLoading(true);
        setResult(null);
        setError(null);
        try {
            const token = localStorage.getItem('jwt');
            let filePath = null;
            let dynamicHeaders = {};

            // 1. Dynamic Authentication
            if (action.authType === 'dynamic' && action.authUrl) {
                try {
                    const authRes = await fetch(action.authUrl, {
                        method: action.authMethod || 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: (action.authMethod !== 'GET' && action.authBody) ? action.authBody : undefined
                    });
                    
                    const authText = await authRes.text();
                    let authJson;
                    try { authJson = JSON.parse(authText); } catch(e) { authJson = authText; }

                    if (!authRes.ok) throw new Error('Auth request failed: ' + (authJson.error || authJson.message || authRes.statusText));

                    // Resolve token
                    let authToken = authJson;
                    if (action.tokenPath) {
                        const parts = action.tokenPath.split(/[.>]/);
                        for (const part of parts) {
                            if (authToken && typeof authToken === 'object') {
                                authToken = authToken[part.trim()];
                            }
                        }
                    }
                    
                    const finalToken = (action.tokenPrefix || '') + (typeof authToken === 'string' ? authToken : JSON.stringify(authToken));
                    dynamicHeaders['Authorization'] = finalToken;
                } catch (authErr) {
                    throw new Error(`Authentication Failed: ${authErr.message}`);
                }
            }

            // 2. Handle File Upload if needed
            if (selectedFile) {
                if (selectedFile.type === 'local') {
                    // Upload to Local Minio (Adminator Storage)
                    const formData = new FormData();
                    formData.append('file', selectedFile.file);
                    formData.append('path', `apps/${appKey}/uploads/`); // App-specific folder in local storage
                    
                    const uploadRes = await fetch(apiUrl('/upload'), {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` },
                        body: formData
                    });
                    
                    if (!uploadRes.ok) throw new Error('Failed to upload local file');
                    const uploadData = await uploadRes.json();
                    filePath = uploadData.key || uploadData.path; 
                } else {
                    filePath = selectedFile.path;
                }
            }
            
            let payload = {};
            if (input) {
                try {
                    // Replace {{filePath}} placeholder if present
                    let processedInput = input;
                    if (filePath) {
                        processedInput = processedInput.replace('{{filePath}}', filePath);
                    }
                    payload = JSON.parse(processedInput);
                } catch (e) {
                    payload = { input: input.replace('{{filePath}}', filePath || '') };
                }
            } else if (filePath) {
                // If no input but file exists, maybe just send it as filePath
                payload = { filePath };
            }

            const res = await fetch(apiUrl(`/apps/${appKey}/actions/${widget.actionId}/run`), {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ payload, dynamicHeaders })
            });
            
            let body;
            const text = await res.text();
            try { body = JSON.parse(text); } catch(e) { body = text; }

            if (!res.ok) throw new Error(body.error || body.message || 'Action failed');
            setResult(body);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!action) return <div style={{ color: 'red' }}>Action {widget.actionId} not found</div>;

    return (
        <div style={{ background: '#252525', padding: '1rem', borderRadius: '4px', border: '1px solid #333' }}>
            <div style={{ display: 'flex', alignItems: 'start', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0' }}>{widget.label || action.id}</h4>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#aaa' }}>
                        {action.type === 'http' ? `HTTP ${action.method || 'GET'} ${action.url}` : 'SQL Query'}
                    </p>
                    {action.description && (
                        <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: '#333', borderRadius: '4px', fontSize: '0.85rem', color: '#ddd', whiteSpace: 'pre-wrap' }}>
                            {action.description}
                        </div>
                    )}
                </div>
                
                <div style={{ flex: 1, minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {action.allowFile && (
                        <div style={{ background: '#1a1a1a', padding: '0.5rem', borderRadius: '4px', border: '1px solid #444' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: '#888', marginBottom: '0.5rem' }}>Attachment (File)</label>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <input 
                                    type="file" 
                                    ref={fileInputRef}
                                    style={{ display: 'none' }}
                                    onChange={handleFileSelect}
                                />
                                <button className="btn-secondary" onClick={() => fileInputRef.current.click()}>
                                    Local File
                                </button>
                                <button className="btn-secondary" onClick={() => setShowBucketModal(true)}>
                                    From External Bucket
                                </button>
                                {selectedFile && (
                                    <span style={{ fontSize: '0.8rem', color: '#4caf50', marginLeft: '0.5rem' }}>
                                        {selectedFile.type === 'local' ? `📄 ${selectedFile.file.name}` : `☁️ ${selectedFile.path}`}
                                        <button 
                                            onClick={() => setSelectedFile(null)}
                                            style={{ background: 'none', border: 'none', color: '#ff4d4d', cursor: 'pointer', marginLeft: '0.5rem' }}
                                        >×</button>
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {widget.input && (
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: '#888', marginBottom: '0.5rem' }}>Payload (JSON)</label>
                            <textarea 
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder={`Enter payload... ${action.allowFile ? 'Use {{filePath}} for the file location.' : ''}`}
                                style={{ 
                                    width: '100%', background: '#111', border: '1px solid #444', 
                                    color: '#ddd', padding: '0.5rem', borderRadius: '4px', minHeight: '80px',
                                    fontFamily: 'monospace', fontSize: '0.85rem'
                                }}
                            />
                        </div>
                    )}
                </div>

                <div>
                    <button 
                        className="btn-primary" 
                        onClick={handleRun} 
                        disabled={loading}
                        style={{ height: '100%', minHeight: '40px' }}
                    >
                        {loading ? 'Running...' : (widget.buttonText || 'Run Action')}
                    </button>
                </div>
            </div>

            {/* BUCKET SELECTION MODAL */}
            {showBucketModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)', zIndex: 2000,
                    display: 'flex', justifyContent: 'center', alignItems: 'center'
                }}>
                    <div style={{
                        background: '#1e1e1e', width: '80%', maxWidth: '800px', height: '70vh',
                        borderRadius: '8px', border: '1px solid #444', display: 'flex', flexDirection: 'column'
                    }}>
                        <div style={{ padding: '1rem', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0 }}>Select File from Bucket</h3>
                            <button className="btn-small" onClick={() => setShowBucketModal(false)}>Close</button>
                        </div>
                        <div style={{ flex: 1, overflow: 'auto', padding: '1rem' }}>
                            <BucketExplorer 
                                appKey={appKey} 
                                onSelect={(file) => handleMinioSelect(file.key || file.name)} 
                            />
                        </div>
                    </div>
                </div>
            )}

            {error && (
                <div style={{ marginTop: '1rem', padding: '0.5rem', background: 'rgba(255, 77, 77, 0.1)', border: '1px solid #ff4d4d', color: '#ff4d4d', borderRadius: '4px' }}>
                    <strong>Error:</strong> {error}
                </div>
            )}

            {result && (
                <div style={{ marginTop: '1rem', background: '#111', padding: '0.5rem', borderRadius: '4px', border: '1px solid #333' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.8rem', color: '#888' }}>Result</span>
                        <button className="btn-small" onClick={() => setResult(null)}>Clear</button>
                    </div>
                    <pre style={{ margin: 0, fontSize: '0.8rem', color: '#4caf50', maxHeight: '400px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                        {typeof result === 'object' ? JSON.stringify(result, null, 2) : result}
                    </pre>
                </div>
            )}
        </div>
    );
}
