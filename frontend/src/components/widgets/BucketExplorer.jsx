import React, { useState, useEffect, useRef } from 'react';
import { apiUrl } from '../../utils/api';
import { useNotification } from '../../context/NotificationContext';

export default function BucketExplorer({ appKey, onSelect }) {
    const { showNotification } = useNotification();
    const [items, setItems] = useState([]);
    const [currentPrefix, setCurrentPrefix] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    const fetchFiles = async (prefix = '') => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('jwt');
            const res = await fetch(apiUrl(`/apps/${appKey}/bucket/list?prefix=${encodeURIComponent(prefix)}`), {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to fetch files');
            }

            const json = await res.json();
            setItems(json.items || []);
            setCurrentPrefix(prefix);
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFiles();
    }, [appKey]);

    const handleFolderClick = (folderName) => {
        fetchFiles(folderName);
    };

    const handleUpClick = () => {
        if (!currentPrefix) return;
        const parts = currentPrefix.split('/').filter(p => p);
        parts.pop();
        const newPrefix = parts.length > 0 ? parts.join('/') + '/' : '';
        fetchFiles(newPrefix);
    };

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('path', currentPrefix);

        try {
            const token = localStorage.getItem('jwt');
            const res = await fetch(apiUrl(`/apps/${appKey}/bucket/upload`), {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Upload failed');
            }

            showNotification('File uploaded successfully', 'success');
            fetchFiles(currentPrefix);
        } catch (err) {
            showNotification(err.message, 'error');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDelete = async (key) => {
        if (!window.confirm(`Are you sure you want to delete ${key}?`)) return;

        try {
            const token = localStorage.getItem('jwt');
            const res = await fetch(apiUrl(`/apps/${appKey}/bucket/delete`), {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ key })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Delete failed');
            }

            showNotification('File deleted successfully', 'success');
            fetchFiles(currentPrefix);
        } catch (err) {
            showNotification(err.message, 'error');
        }
    };

    const formatSize = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="bucket-explorer" style={{ background: '#1e1e1e', padding: '1rem', borderRadius: '8px', border: '1px solid #333' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, color: '#fff' }}>Bucket Explorer</h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                        className="btn-secondary" 
                        onClick={fetchFiles.bind(null, currentPrefix)}
                        disabled={loading}
                    >
                        Refresh
                    </button>
                    <input 
                        type="file" 
                        ref={fileInputRef}
                        style={{ display: 'none' }} 
                        onChange={handleUpload}
                    />
                    <button 
                        className="btn-primary" 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                    >
                        {uploading ? 'Uploading...' : 'Upload File'}
                    </button>
                </div>
            </div>

            {/* Breadcrumbs / Path */}
            <div style={{ marginBottom: '1rem', padding: '0.5rem', background: '#252526', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button 
                    onClick={handleUpClick} 
                    disabled={!currentPrefix}
                    style={{ background: 'none', border: 'none', color: currentPrefix ? 'var(--accent-color)' : '#666', cursor: currentPrefix ? 'pointer' : 'default' }}
                >
                    ⬆ Up
                </button>
                <span style={{ color: '#aaa' }}>/ {currentPrefix}</span>
            </div>

            {error && <div style={{ color: '#ff4d4d', marginBottom: '1rem' }}>{error}</div>}

            {loading ? (
                <div style={{ color: '#aaa', textAlign: 'center', padding: '2rem' }}>Loading...</div>
            ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', color: '#ddd' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid #333', textAlign: 'left' }}>
                            <th style={{ padding: '0.5rem' }}>Name</th>
                            <th style={{ padding: '0.5rem' }}>Size</th>
                            <th style={{ padding: '0.5rem' }}>Last Modified</th>
                            <th style={{ padding: '0.5rem', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.length === 0 && (
                            <tr>
                                <td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                                    Folder is empty
                                </td>
                            </tr>
                        )}
                        {items.map((item, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #2a2a2a' }}>
                                <td style={{ padding: '0.5rem' }}>
                                    {item.type === 'folder' ? (
                                        <span 
                                            onClick={() => handleFolderClick(item.name)}
                                            style={{ cursor: 'pointer', color: 'var(--accent-color)', fontWeight: 'bold' }}
                                        >
                                            📁 {item.name.split('/').filter(p=>p).pop()}/
                                        </span>
                                    ) : (
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span>📄 {item.name.split('/').pop()}</span>
                                            {onSelect && (
                                                <button 
                                                    className="btn-small" 
                                                    onClick={() => onSelect(item)}
                                                    style={{ fontSize: '0.7rem', padding: '2px 6px' }}
                                                >
                                                    Select
                                                </button>
                                            )}
                                        </span>
                                    )}
                                </td>
                                <td style={{ padding: '0.5rem', color: '#aaa' }}>
                                    {item.type === 'file' ? formatSize(item.size) : '-'}
                                </td>
                                <td style={{ padding: '0.5rem', color: '#aaa' }}>
                                    {item.type === 'file' ? new Date(item.lastModified).toLocaleString() : '-'}
                                </td>
                                <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                                    {item.type === 'file' && (
                                        <button 
                                            onClick={() => handleDelete(item.name)}
                                            style={{ background: 'none', border: 'none', color: '#ff4d4d', cursor: 'pointer' }}
                                        >
                                            🗑
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
