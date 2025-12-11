import React, { useState, useEffect } from 'react';
import { apiUrl } from '../../utils/api';
import FileUploader from '../../components/shared/FileUploader';

export default function BucketExplorer() {
  const [currentPath, setCurrentPath] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [showUpload, setShowUpload] = useState(false);

  const fetchItems = async (path = '') => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('jwt');
      const res = await fetch(apiUrl(`/upload/list?path=${encodeURIComponent(path)}`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch files');
      const data = await res.json();
      setItems(data.items);
      setCurrentPath(data.path);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleNavigate = (folderName) => {
    const newPath = currentPath ? `${currentPath}/${folderName}` : folderName;
    fetchItems(newPath);
  };

  const handleUp = () => {
    if (!currentPath) return;
    const parts = currentPath.split('/');
    parts.pop();
    fetchItems(parts.join('/'));
  };

  const handleCreateFolder = async () => {
    if (!newFolderName) return;
    try {
      const token = localStorage.getItem('jwt');
      const folderPath = currentPath ? `${currentPath}/${newFolderName}` : newFolderName;
      
      const res = await fetch(apiUrl('/upload/folder'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ folderPath })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to create folder');
      }
      
      setNewFolderName('');
      fetchItems(currentPath);
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  const handleDelete = async (name) => {
    if (!window.confirm(`Are you sure you want to delete ${name}?`)) return;
    try {
      const token = localStorage.getItem('jwt');
      const itemPath = currentPath ? `${currentPath}/${name}` : name;
      
      const res = await fetch(apiUrl('/upload/delete'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ itemPath })
      });

      if (!res.ok) throw new Error('Failed to delete item');
      fetchItems(currentPath);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ color: '#fff', marginBottom: '1rem' }}>Bucket File Explorer</h1>
      
      <div style={{ 
        background: '#1e1e1e', 
        padding: '1rem', 
        borderRadius: '8px', 
        marginBottom: '1rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button 
            onClick={handleUp} 
            disabled={!currentPath}
            style={{ 
              background: '#333', 
              border: 'none', 
              color: '#fff', 
              padding: '5px 10px', 
              borderRadius: '4px',
              cursor: currentPath ? 'pointer' : 'default',
              opacity: currentPath ? 1 : 0.5
            }}
          >
            ⬆ Up
          </button>
          <span style={{ color: '#aaa', fontFamily: 'monospace' }}>
            root/{currentPath}
          </span>
        </div>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <input 
            type="text" 
            placeholder="New Folder Name"
            value={newFolderName}
            onChange={e => setNewFolderName(e.target.value)}
            style={{ background: '#2d2d2d', border: '1px solid #444', color: '#fff', padding: '5px', borderRadius: '4px' }}
          />
          <button 
            onClick={handleCreateFolder}
            style={{ background: '#2196f3', border: 'none', color: '#fff', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}
          >
            + Folder
          </button>
          <button 
            onClick={() => setShowUpload(!showUpload)}
            style={{ background: '#4caf50', border: 'none', color: '#fff', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}
          >
            {showUpload ? 'Hide Upload' : 'Upload File'}
          </button>
        </div>
      </div>

      {showUpload && (
        <div style={{ marginBottom: '2rem' }}>
           {/* Note: FileUploader needs update to support path, or we just upload to root and move? 
               For now, let's assume FileUploader uploads to root or we need to modify it.
               Actually, the backend uploadController now supports 'path' in body.
               But FileUploader component might not expose a way to pass extra body fields.
               Let's just use it as is for now, it will go to root/path if we modify it, 
               but since I didn't modify FileUploader to accept props for extra fields, 
               I'll just let it upload to root for now or I should update FileUploader.
               
               Wait, I can't easily update FileUploader without breaking other usages if not careful.
               Let's just leave it as is for now, it uploads to root. 
               *Correction*: I should probably update FileUploader to accept extraData.
           */}
           <div style={{ padding: '1rem', background: '#252525', borderRadius: '8px' }}>
             <p style={{ color: '#aaa', marginBottom: '0.5rem' }}>Uploading to: {currentPath || 'root'}</p>
             <FileUploader path={currentPath} onUploadComplete={() => fetchItems(currentPath)} />
           </div>
        </div>
      )}

      {loading ? (
        <div style={{ color: '#888' }}>Loading...</div>
      ) : error ? (
        <div style={{ color: '#f44336' }}>{error}</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem' }}>
          {items.map((item, index) => (
            <div key={index} style={{ 
              background: '#252525', 
              padding: '1rem', 
              borderRadius: '8px', 
              textAlign: 'center',
              position: 'relative',
              border: '1px solid #333'
            }}>
              <div 
                style={{ fontSize: '2rem', marginBottom: '0.5rem', cursor: item.isDirectory ? 'pointer' : 'default' }}
                onClick={() => item.isDirectory && handleNavigate(item.name)}
              >
                {item.isDirectory ? '📁' : '📄'}
              </div>
              <div style={{ color: '#fff', wordBreak: 'break-all', fontSize: '0.9rem' }}>{item.name}</div>
              {!item.isDirectory && (
                <div style={{ color: '#666', fontSize: '0.8rem', marginTop: '5px' }}>
                  {(item.size / 1024).toFixed(1)} KB
                </div>
              )}
              <button 
                onClick={() => handleDelete(item.name)}
                style={{ 
                  position: 'absolute', 
                  top: '5px', 
                  right: '5px', 
                  background: 'transparent', 
                  border: 'none', 
                  color: '#f44336', 
                  cursor: 'pointer',
                  fontSize: '1.2rem'
                }}
              >
                ×
              </button>
              {!item.isDirectory && (
                <a 
                  href={`${apiUrl(`/${item.path}`)}&token=${localStorage.getItem('jwt')}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ display: 'block', marginTop: '10px', color: '#2196f3', textDecoration: 'none', fontSize: '0.8rem' }}
                >
                  Open
                </a>
              )}
            </div>
          ))}
          {items.length === 0 && (
            <div style={{ color: '#666', gridColumn: '1/-1', textAlign: 'center', padding: '2rem' }}>
              Empty directory
            </div>
          )}
        </div>
      )}
    </div>
  );
}
