import React, { useState, useEffect } from 'react';
import { apiUrl } from '../../utils/api';
import { useNotification } from '../../context/NotificationContext';

export default function DataGrid({ appKey, tableName, tableConfig, showHeader = true }) {
    const { showNotification } = useNotification();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [columns, setColumns] = useState([]);
    
    // Editing State
    const [isEditing, setIsEditing] = useState(false);
    const [pendingChanges, setPendingChanges] = useState({}); // { rowIndex: { col: val } }
    const [saving, setSaving] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        setIsEditing(false);
        setPendingChanges({});
        try {
            const token = localStorage.getItem('jwt');
            const res = await fetch(apiUrl(`/apps/${appKey}/data/${tableName}`), {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to fetch data');
            }

            const json = await res.json();
            setData(json);
            
            if (json.length > 0) {
                setColumns(Object.keys(json[0]));
            }
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [appKey, tableName]);

    const handleCellChange = (rowIndex, col, value) => {
        setPendingChanges(prev => ({
            ...prev,
            [rowIndex]: {
                ...prev[rowIndex],
                [col]: value
            }
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const updates = Object.entries(pendingChanges).map(([rowIndex, changes]) => {
                const row = data[rowIndex];
                // Assume first column is PK if not specified
                const pkCol = tableConfig.primaryKey || columns[0]; 
                const pkVal = row[pkCol];
                return { key: pkVal, changes };
            });

            const token = localStorage.getItem('jwt');
            const res = await fetch(apiUrl(`/apps/${appKey}/data/${tableName}`), {
                method: 'PUT',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    updates, 
                    primaryKey: tableConfig.primaryKey || columns[0] 
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to save changes');
            }

            await fetchData(); // Refresh data
        } catch (err) {
            showNotification('Error saving: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div style={{ padding: '1rem', color: '#aaa' }}>Loading data...</div>;
    if (error) return <div style={{ padding: '1rem', color: '#ff4d4d' }}>Error: {error}</div>;
    
    if (data.length === 0 && !loading && !error) {
         return (
             <div style={{ width: '100%', background: '#252525', borderRadius: '4px', border: '1px solid #333', overflow: 'hidden' }}>
                 {showHeader && (
                    <div style={{ padding: '0.75rem 1rem', background: '#333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4 style={{ margin: 0, fontSize: '0.9rem' }}>Data Grid: {tableName}</h4>
                        <button className="btn-small" onClick={fetchData}>Refresh</button>
                    </div>
                 )}
                 <div style={{ padding: '1rem', color: '#666' }}>No records found.</div>
             </div>
         );
    }

    return (
        <div style={{ width: '100%', background: '#252525', borderRadius: '4px', border: '1px solid #333', overflow: 'hidden' }}>
            {showHeader && (
                <div style={{ padding: '0.75rem 1rem', background: '#333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <h4 style={{ margin: 0, fontSize: '0.9rem' }}>Data Grid: {tableName}</h4>
                        <span style={{ fontSize: '0.75rem', color: '#aaa' }}>
                            {tableConfig?.allowEdit ? (isEditing ? 'Editing...' : 'Editable') : 'Read-Only'}
                        </span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {tableConfig?.allowEdit && !isEditing && (
                            <button className="btn-small" onClick={() => setIsEditing(true)}>Edit</button>
                        )}
                        {isEditing && (
                            <>
                                <button className="btn-small btn-primary" onClick={handleSave} disabled={saving}>
                                    {saving ? 'Saving...' : 'Save'}
                                </button>
                                <button className="btn-small" onClick={() => { setIsEditing(false); setPendingChanges({}); }} disabled={saving}>
                                    Cancel
                                </button>
                            </>
                        )}
                        <button className="btn-small" onClick={fetchData} disabled={isEditing}>Refresh</button>
                    </div>
                </div>
            )}

            <div style={{ width: '100%', maxWidth: '100%', overflowX: 'auto', maxHeight: '600px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', tableLayout: 'auto' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid #444' }}>
                            {columns.map(col => (
                                <th key={col} style={{ textAlign: 'left', padding: '0.5rem', color: '#888', position: 'sticky', top: 0, backgroundColor: '#121212', zIndex: 1, whiteSpace: 'nowrap' }}>{col}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #333', background: pendingChanges[idx] ? '#2a2a2a' : 'transparent' }}>
                                {columns.map(col => {
                                    const val = row[col];
                                    const pendingVal = pendingChanges[idx]?.[col];
                                    const currentVal = pendingVal !== undefined ? pendingVal : val;
                                    
                                    const strVal = currentVal === null || currentVal === undefined ? '' : (typeof currentVal === 'object' ? JSON.stringify(currentVal) : String(currentVal));
                                    const displayVal = strVal.length > 20 && !isEditing ? strVal.substring(0, 20) + '...' : strVal;
                                    
                                    const isPk = col === (tableConfig.primaryKey || columns[0]);

                                    return (
                                        <td key={col} style={{ padding: '0.5rem', maxWidth: isEditing ? 'auto' : '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={strVal}>
                                            {isEditing && !isPk ? (
                                                <input 
                                                    type="text" 
                                                    value={strVal} 
                                                    onChange={(e) => handleCellChange(idx, col, e.target.value)}
                                                    style={{ 
                                                        background: '#111', border: '1px solid #444', color: '#ddd', 
                                                        padding: '0.25rem', width: '100%', minWidth: '100px'
                                                    }}
                                                />
                                            ) : (
                                                displayVal
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
