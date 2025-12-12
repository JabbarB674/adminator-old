import React, { useState, useEffect } from 'react';
import { apiUrl } from '../../utils/api';
import { useNotification } from '../../context/NotificationContext';

export default function DataListEditor({ 
  title, 
  listEndpoint, 
  updateEndpoint, 
  deleteEndpoint,
  idField = 'id',
  displayFields = [], // Array of { key: 'name', label: 'Name', type: 'text' }
  allowDelete = false,
  allowEdit = true
}) {
  const { showNotification } = useNotification();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [error, setError] = useState(null);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('jwt');
      const res = await fetch(apiUrl(listEndpoint), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch items');
      const data = await res.json();
      setItems(Array.isArray(data) ? data : (data.items || []));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [listEndpoint]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      const token = localStorage.getItem('jwt');
      // If updateEndpoint has :id placeholder, replace it, otherwise append or use as is
      let url = updateEndpoint.replace(':id', editingItem[idField]);
      
      const res = await fetch(apiUrl(url), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editingItem)
      });

      if (!res.ok) throw new Error('Failed to update item');
      
      setEditingItem(null);
      fetchItems();
    } catch (err) {
      showNotification(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    
    try {
      const token = localStorage.getItem('jwt');
      let url = deleteEndpoint.replace(':id', id);
      
      const res = await fetch(apiUrl(url), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Failed to delete item');
      fetchItems();
    } catch (err) {
      showNotification(err.message);
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ color: '#fff', margin: 0 }}>{title || 'Data List'}</h3>
        <button 
          onClick={fetchItems}
          style={{ background: 'transparent', border: '1px solid #555', color: '#aaa', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}
        >
          Refresh
        </button>
      </div>

      {error && <div style={{ color: '#f44336', marginBottom: '1rem' }}>{error}</div>}

      {loading ? (
        <div style={{ color: '#888', textAlign: 'center', padding: '2rem' }}>Loading...</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', color: '#ddd' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #333', textAlign: 'left' }}>
                {displayFields.map(field => (
                  <th key={field.key} style={{ padding: '10px' }}>{field.label}</th>
                ))}
                {(allowEdit || allowDelete) && <th style={{ padding: '10px', width: '100px' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item[idField]} style={{ borderBottom: '1px solid #2a2a2a' }}>
                  {displayFields.map(field => (
                    <td key={field.key} style={{ padding: '10px' }}>
                      {field.type === 'boolean' ? (
                        item[field.key] ? 'Yes' : 'No'
                      ) : (
                        String(item[field.key] || '')
                      )}
                    </td>
                  ))}
                  {(allowEdit || allowDelete) && (
                    <td style={{ padding: '10px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {allowEdit && (
                          <button 
                            onClick={() => setEditingItem(item)}
                            style={{ background: '#2196f3', border: 'none', color: 'white', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}
                          >
                            Edit
                          </button>
                        )}
                        {allowDelete && (
                          <button 
                            onClick={() => handleDelete(item[idField])}
                            style={{ background: '#f44336', border: 'none', color: 'white', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}
                          >
                            Del
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={displayFields.length + 1} style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                    No items found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {editingItem && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{ background: '#252525', padding: '2rem', borderRadius: '8px', width: '500px', maxWidth: '90%' }}>
            <h3 style={{ color: '#fff', marginTop: 0 }}>Edit Item</h3>
            <form onSubmit={handleSave}>
              {displayFields.map(field => (
                <div key={field.key} style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', color: '#aaa', marginBottom: '0.5rem' }}>{field.label}</label>
                  {field.type === 'boolean' ? (
                    <select
                      value={editingItem[field.key] ? 'true' : 'false'}
                      onChange={e => setEditingItem({...editingItem, [field.key]: e.target.value === 'true'})}
                      style={{ width: '100%', padding: '8px', background: '#333', border: '1px solid #444', color: 'white', borderRadius: '4px' }}
                    >
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  ) : (
                    <input
                      type={field.type || 'text'}
                      value={editingItem[field.key] || ''}
                      onChange={e => setEditingItem({...editingItem, [field.key]: e.target.value})}
                      style={{ width: '100%', padding: '8px', background: '#333', border: '1px solid #444', color: 'white', borderRadius: '4px' }}
                    />
                  )}
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                <button 
                  type="button"
                  onClick={() => setEditingItem(null)}
                  style={{ background: 'transparent', border: '1px solid #555', color: '#aaa', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  style={{ background: '#4caf50', border: 'none', color: 'white', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
