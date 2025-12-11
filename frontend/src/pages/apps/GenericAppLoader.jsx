import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiUrl } from '../../utils/api';

export default function GenericAppLoader() {
  const { appKey } = useParams();
  const { user } = useAuth();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadConfig = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Find the app in the user's allowed list to get the ConfigPath
        const app = user?.allowedApps?.find(a => a.appKey === appKey);
        
        if (!app) {
          throw new Error('App not found or access denied');
        }

        // Default to config.json if not specified in DB (Convention over Configuration)
        const configFileName = app.configPath || 'config.json';

        // 2. Fetch the JSON config from the bucket
        // We use the view endpoint which streams the file
        // Construct path: apps/<appKey>/<configPath>
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

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem', borderBottom: '1px solid #333', paddingBottom: '1rem' }}>
        <h1 style={{ color: '#fff', margin: 0 }}>{config.title || appKey}</h1>
        {config.description && <p style={{ color: '#aaa', marginTop: '0.5rem' }}>{config.description}</p>}
      </header>

      <div style={{ display: 'grid', gap: '2rem' }}>
        {config.sections?.map((section, idx) => (
          <div key={idx} style={{ background: '#1e1e1e', padding: '1.5rem', borderRadius: '8px' }}>
            {section.title && <h3 style={{ color: '#fff', marginTop: 0 }}>{section.title}</h3>}
            
            {/* Render Widgets based on type */}
            {section.widgets?.map((widget, wIdx) => (
              <div key={wIdx} style={{ marginTop: '1rem' }}>
                {widget.type === 'markdown' && (
                  <div style={{ color: '#ddd', lineHeight: '1.6' }}>
                    {widget.content}
                  </div>
                )}

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

                {widget.type === 'iframe' && (
                    <iframe 
                        src={widget.url} 
                        title={widget.title || 'App Frame'}
                        style={{ width: '100%', height: widget.height || '500px', border: 'none', background: '#fff' }}
                    />
                )}
                
                {/* Add more widget types here (e.g. DataTable, Form) */}
                {widget.type === 'unknown' && <div style={{ color: 'orange' }}>Unknown widget type</div>}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
