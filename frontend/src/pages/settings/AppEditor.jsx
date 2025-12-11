import React, { useState, useRef, useEffect } from 'react';
import LayoutEditor from './editors/LayoutEditor';
import DataSourceEditor from './editors/DataSourceEditor';
import ActionEditor from './editors/ActionEditor';
import { apiUrl } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import '../../styles/AppEditor.css';

export default function AppEditor() {
  const { refreshUser } = useAuth();
  const fileInputRef = useRef(null);
  const iconInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState('general');
  const [saving, setSaving] = useState(false);
  const [existingApps, setExistingApps] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [loadedAppKey, setLoadedAppKey] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  const [config, setConfig] = useState({
    meta: {
      displayName: '',
      appKey: '',
      description: '',
      icon: ''
    },
    connection: {
      productionUrl: '',
      localUrl: '',
      authType: 'none'
    },
    layout: {
      type: 'dashboard-grid',
      sections: []
    },
    dataSource: {
      type: 'mssql',
      config: { server: '', port: 1433, database: '', user: '', password: '' },
      tables: []
    },
    actions: []
  });

  useEffect(() => {
    fetchExistingApps();
  }, []);

  const fetchExistingApps = async () => {
    try {
      const token = localStorage.getItem('jwt');
      const res = await fetch(apiUrl('/apps/configs'), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setExistingApps(data);
      }
    } catch (err) {
      console.error('Failed to fetch existing apps', err);
    }
  };

  const loadApp = async (appKey) => {
    if (!appKey) {
        resetEditor();
        return;
    }
    try {
      const token = localStorage.getItem('jwt');
      // Encode the appKey to handle slashes (e.g. tasty-customers/config)
      const res = await fetch(apiUrl(`/apps/configs/${encodeURIComponent(appKey)}`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setConfig({
            meta: json.meta || { displayName: '', appKey: '', description: '', icon: '' },
            connection: json.connection || { productionUrl: '', localUrl: '', authType: 'none' },
            layout: json.layout || { type: 'dashboard-grid', sections: [] },
            dataSource: json.dataSource || { type: 'mssql', config: { server: '', port: 1433, database: '', user: '', password: '' }, tables: [] },
            actions: json.actions || []
        });
        setIsEditing(true);
        setLoadedAppKey(appKey);
      }
    } catch (err) {
      console.error('Failed to load app', err);
      alert('Failed to load app configuration');
    }
  };

  const resetEditor = () => {
    setConfig({
        meta: { displayName: '', appKey: '', description: '', icon: '' },
        connection: { productionUrl: '', localUrl: '', authType: 'none' },
        layout: { type: 'dashboard-grid', sections: [] },
        dataSource: { type: 'mssql', config: { server: '', port: 1433, database: '', user: '', password: '' }, tables: [] },
        actions: []
    });
    setIsEditing(false);
    setLoadedAppKey(null);
  };

  const handleDelete = async () => {
    if (deleteConfirmation !== 'DELETE FOREVER') return;
    
    try {
        const token = localStorage.getItem('jwt');
        const res = await fetch(apiUrl(`/apps/configs/${encodeURIComponent(loadedAppKey)}`), {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
            alert('App deleted successfully');
            setShowDeleteModal(false);
            setDeleteConfirmation('');
            resetEditor();
            fetchExistingApps();
            refreshUser(); // Refresh sidebar
        } else {
            alert('Failed to delete app');
        }
    } catch (err) {
        console.error(err);
        alert('Error deleting app');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('jwt');
      
      let url = apiUrl('/apps/save-config');
      let method = 'POST';

      if (isEditing && loadedAppKey) {
          url = apiUrl(`/apps/configs/${encodeURIComponent(loadedAppKey)}`);
          method = 'PUT';
      }

      const res = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(config)
      });
      
      const data = await res.json();
      if (res.ok) {
        alert(`Saved successfully to: ${data.path}`);
        fetchExistingApps(); // Refresh list
        refreshUser(); // Refresh sidebar
        setIsEditing(true); // Switch to edit mode
        if (!isEditing) {
            // If it was a new app, set the loaded key so subsequent saves are updates
            setLoadedAppKey(config.meta.appKey);
        }
      } else {
        alert(`Save failed: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      alert('Network error while saving');
    } finally {
      setSaving(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target.result);
          setConfig({
            meta: json.meta || { displayName: '', appKey: '', description: '', icon: '' },
            connection: json.connection || { productionUrl: '', localUrl: '', authType: 'none' },
            layout: json.layout || { type: 'dashboard-grid', sections: [] },
            dataSource: json.dataSource || { type: 'mssql', config: { server: '', port: 1433, database: '', user: '', password: '' }, tables: [] },
            actions: json.actions || []
          });
        } catch (error) {
          alert('Error parsing JSON: ' + error.message);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleIconUpload = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      if (!config.meta.appKey) {
          alert('Please enter an App Key first.');
          return;
      }

      const formData = new FormData();
      formData.append('icon', file);

      try {
          const token = localStorage.getItem('jwt');
          const res = await fetch(apiUrl(`/apps/configs/${config.meta.appKey}/icon`), {
              method: 'POST',
              headers: {
                  'Authorization': `Bearer ${token}`
              },
              body: formData
          });
          
          if (res.ok) {
              const data = await res.json();
              alert('Icon uploaded successfully!');
              setConfig(prev => ({
                  ...prev,
                  meta: { ...prev.meta, icon: data.path }
              }));
          } else {
              alert('Failed to upload icon');
          }
      } catch (err) {
          console.error(err);
          alert('Error uploading icon');
      }
  };

  const handleMetaChange = (e) => {
    const { name, value } = e.target;
    setConfig(prev => ({
      ...prev,
      meta: { ...prev.meta, [name]: value }
    }));
  };

  const handleConnectionChange = (e) => {
    const { name, value } = e.target;
    setConfig(prev => ({
      ...prev,
      connection: { ...prev.connection, [name]: value }
    }));
  };

  return (
    <div className="app-editor-container">
      {showDeleteModal && (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
            <div style={{ background: '#252525', padding: '2rem', borderRadius: '8px', maxWidth: '400px', border: '1px solid #ff4d4d' }}>
                <h3 style={{ color: '#ff4d4d', marginTop: 0 }}>Delete App?</h3>
                <p>This action cannot be undone. Please type <strong>DELETE FOREVER</strong> to confirm.</p>
                <input 
                    type="text" 
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem', background: '#111', border: '1px solid #444', color: '#fff' }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                    <button className="btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                    <button 
                        className="btn-primary" 
                        style={{ background: '#ff4d4d', opacity: deleteConfirmation === 'DELETE FOREVER' ? 1 : 0.5 }}
                        disabled={deleteConfirmation !== 'DELETE FOREVER'}
                        onClick={handleDelete}
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
      )}

      <header className="editor-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h1>App Configuration Editor</h1>
            <select 
                onChange={(e) => loadApp(e.target.value)} 
                value={isEditing ? config.meta.appKey : ''}
                style={{ padding: '0.5rem', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '4px' }}
            >
                <option value="">-- Create New App --</option>
                {existingApps.map(app => (
                    <option key={app.appKey} value={app.appKey}>{app.appKey}</option>
                ))}
            </select>
        </div>
        <div className="actions">
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            accept=".json" 
            onChange={handleFileChange} 
          />
          {isEditing && (
            <button 
                className="btn-secondary" 
                style={{ color: '#ff4d4d', borderColor: '#ff4d4d', marginRight: '1rem' }}
                onClick={() => setShowDeleteModal(true)}
            >
                Delete App
            </button>
          )}
          <button className="btn-secondary" onClick={handleImportClick}>Import JSON</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save App'}
          </button>
        </div>
      </header>

      <div className="editor-layout">
        <aside className="editor-sidebar">
          <nav>
            <button 
              className={activeTab === 'general' ? 'active' : ''} 
              onClick={() => setActiveTab('general')}
            >
              General Info
            </button>
            <button 
              className={activeTab === 'connection' ? 'active' : ''} 
              onClick={() => setActiveTab('connection')}
            >
              Connection & API
            </button>
            <button 
              className={activeTab === 'layout' ? 'active' : ''} 
              onClick={() => setActiveTab('layout')}
            >
              UI Layout
            </button>
            <button 
              className={activeTab === 'dataSource' ? 'active' : ''} 
              onClick={() => setActiveTab('dataSource')}
            >
              Data Source / DB
            </button>
            <button 
              className={activeTab === 'actions' ? 'active' : ''} 
              onClick={() => setActiveTab('actions')}
            >
              Actions / Functions
            </button>
          </nav>
        </aside>

        <main className="editor-content">
          {activeTab === 'general' && (
            <div className="editor-section">
              <h2>General Information</h2>
              <div className="form-group">
                <label>Display Name</label>
                <input 
                  type="text" 
                  name="displayName" 
                  value={config.meta.displayName} 
                  onChange={handleMetaChange} 
                  placeholder="e.g. Tasty Customers" 
                />
              </div>
              <div className="form-group">
                <label>App Key (Unique ID)</label>
                <input 
                  type="text" 
                  name="appKey" 
                  value={config.meta.appKey} 
                  onChange={handleMetaChange} 
                  placeholder="e.g. tasty-customers" 
                  disabled={isEditing}
                  style={isEditing ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                />
                {isEditing && <span style={{ fontSize: '0.8rem', color: '#888' }}>App Key cannot be changed for existing apps.</span>}
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea 
                  name="description" 
                  value={config.meta.description} 
                  onChange={handleMetaChange} 
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label>Icon (Emoji, URL, or Upload)</label>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <input 
                      type="text" 
                      name="icon" 
                      value={config.meta.icon} 
                      onChange={handleMetaChange} 
                      placeholder="🍔 or path/to/icon.png" 
                      style={{ flex: 1 }}
                    />
                    <input 
                        type="file" 
                        ref={iconInputRef} 
                        style={{ display: 'none' }} 
                        accept="image/*" 
                        onChange={handleIconUpload} 
                    />
                    <button 
                        className="btn-secondary" 
                        onClick={() => iconInputRef.current.click()}
                        disabled={!config.meta.appKey}
                        title={!config.meta.appKey ? "Enter App Key first" : "Upload Icon"}
                    >
                        Upload
                    </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'connection' && (
            <div className="editor-section">
              <h2>Connection Settings</h2>
              <div className="form-group">
                <label>Production API URL</label>
                <input 
                  type="text" 
                  name="productionUrl" 
                  value={config.connection.productionUrl} 
                  onChange={handleConnectionChange} 
                  placeholder="https://api.example.com" 
                />
              </div>
              <div className="form-group">
                <label>Local Dev URL</label>
                <input 
                  type="text" 
                  name="localUrl" 
                  value={config.connection.localUrl} 
                  onChange={handleConnectionChange} 
                  placeholder="http://localhost:3000" 
                />
              </div>
              <div className="form-group">
                <label>Authentication Type</label>
                <select 
                  name="authType" 
                  value={config.connection.authType} 
                  onChange={handleConnectionChange}
                >
                  <option value="none">None</option>
                  <option value="jwt-bearer">JWT Bearer Token</option>
                  <option value="api-key">API Key</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === 'layout' && (
            <div className="editor-section">
              <h2>UI Layout Configuration</h2>
              <p className="hint">Define the dashboard structure using the visual editor below.</p>
              <LayoutEditor 
                layout={config.layout} 
                onChange={(newLayout) => setConfig(prev => ({ ...prev, layout: newLayout }))}
              />
            </div>
          )}

          {activeTab === 'dataSource' && (
            <div className="editor-section">
              <h2>Data Source Configuration</h2>
              <p className="hint">Configure the remote database connection and specify which tables to expose.</p>
              <DataSourceEditor 
                dataSource={config.dataSource}
                onChange={(newDataSource) => setConfig(prev => ({ ...prev, dataSource: newDataSource }))}
              />
            </div>
          )}

          {activeTab === 'actions' && (
            <div className="editor-section">
              <h2>Configurable Actions</h2>
              <p className="hint">Define buttons or tools that trigger API calls (e.g. Lambda functions). You can define input fields for users to fill out before execution.</p>
              <ActionEditor 
                actions={config.actions}
                onChange={(newActions) => setConfig(prev => ({ ...prev, actions: newActions }))}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
