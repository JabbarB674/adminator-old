import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { apiUrl } from '../utils/api';
import "../styles/auth.css";

export default function Dashboard() {
  const { user } = useAuth();
  const token = localStorage.getItem('jwt');

  return (
    <div>
      <main style={{ padding: '2rem' }}>
        <section>
          <h3 style={{ color: '#fff', marginBottom: '1.5rem' }}>Your Apps</h3>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            {user?.allowedApps?.length > 0 ? (
              user.allowedApps.map(app => (
                <Link 
                  key={app.appKey} 
                  to={app.routePath || `/apps/${app.appKey}`}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <div style={{ 
                    width: '260px',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    border: '1px solid #4a4a4a', // Secondary color mini border
                    background: '#1e1e1e',
                    transition: 'transform 0.2s',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                  onMouseOver={e => e.currentTarget.style.transform = 'translateY(-5px)'}
                  onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    <div style={{ 
                      width: '100%', 
                      height: '160px', 
                      background: '#000',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden'
                    }}>
                      {/* Default to icon.png if not specified */}
                      <img 
                        src={apiUrl(`/upload/view?key=${encodeURIComponent(`apps/${app.appKey}/${app.appIcon || 'icon.png'}`)}&token=${token}`)} 
                        alt={app.appName} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
                      />
                      <div style={{ display: 'none', fontSize: '3rem' }}>📱</div>
                    </div>
                    
                    {/* Chin Area */}
                    <div style={{ 
                      padding: '0.8rem 1rem',
                      background: '#252525',
                      borderTop: '1px solid #333'
                    }}>
                      <h4 style={{ margin: '0 0 0.2rem', color: '#fff', fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{app.appName}</h4>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: '#aaa', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{app.description || 'No description'}</p>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div style={{ color: '#aaa' }}>No apps assigned to your profile.</div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
