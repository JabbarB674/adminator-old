import React, { useState } from 'react';
import { apiUrl } from '../../utils/api';

export default function FileUploader({ title, onUploadComplete, path }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);
  const [preview, setPreview] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setMessage(null);
    
    if (selectedFile && selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setPreview(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append('file', file);
    if (path) {
      formData.append('path', path);
    }

    try {
      const token = localStorage.getItem('jwt');
      // Fixed: Removed extra /api prefix since apiUrl handles base
      const res = await fetch(apiUrl('/upload'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!res.ok) throw new Error('Upload failed');

      const data = await res.json();
      setMessage({ type: 'success', text: 'File uploaded successfully!' });
      setFile(null);
      setPreview(null);
      
      if (onUploadComplete) {
        onUploadComplete(data.imageUrl);
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ 
      background: '#1e1e1e', 
      padding: '1.5rem', 
      borderRadius: '8px', 
      border: '1px solid #333',
      marginBottom: '2rem'
    }}>
      <h3 style={{ marginBottom: '1rem', color: '#fff' }}>{title || 'File Uploader'}</h3>
      
      <div style={{ 
        border: '2px dashed #444', 
        borderRadius: '8px', 
        padding: '2rem', 
        textAlign: 'center',
        background: '#252525',
        marginBottom: '1rem'
      }}>
        <input 
          type="file" 
          onChange={handleFileChange}
          style={{ display: 'none' }}
          id="file-upload"
        />
        <label 
          htmlFor="file-upload" 
          style={{ 
            cursor: 'pointer', 
            display: 'block',
            color: '#aaa'
          }}
        >
          {file ? file.name : 'Click to select a file'}
        </label>
        
        {preview && (
          <div style={{ marginTop: '1rem' }}>
            <img 
              src={preview} 
              alt="Preview" 
              style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '4px' }} 
            />
          </div>
        )}
      </div>

      {message && (
        <div style={{ 
          padding: '10px', 
          borderRadius: '4px', 
          marginBottom: '1rem',
          background: message.type === 'success' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
          color: message.type === 'success' ? '#4caf50' : '#f44336',
          border: `1px solid ${message.type === 'success' ? '#4caf50' : '#f44336'}`
        }}>
          {message.text}
        </div>
      )}

      <button 
        onClick={handleUpload} 
        disabled={!file || uploading}
        style={{
          background: '#2196f3',
          color: 'white',
          border: 'none',
          padding: '0.75rem 1.5rem',
          borderRadius: '4px',
          cursor: (!file || uploading) ? 'not-allowed' : 'pointer',
          opacity: (!file || uploading) ? 0.7 : 1,
          fontWeight: 'bold',
          width: '100%'
        }}
      >
        {uploading ? 'Uploading...' : 'Upload File'}
      </button>
    </div>
  );
}
