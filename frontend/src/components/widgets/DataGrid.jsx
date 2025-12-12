import React, { useState, useEffect } from 'react';
import { apiUrl } from '../../utils/api';

export default function DataGrid({ appKey, tableName, tableConfig }) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [columns, setColumns] = useState([]);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
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

    if (loading) return <div style={{ padding: '1rem', color: '#aaa' }}>Loading data...</div>;
    if (error) return <div style={{ padding: '1rem', color: '#ff4d4d' }}>Error: {error}</div>;
    if (data.length === 0) return <div style={{ padding: '1rem', color: '#666' }}>No records found.</div>;

    return (
        <div style={{ width: '100%' }}>
            <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn-small" onClick={fetchData}>Refresh</button>
            </div>
            <div style={{ width: '100%', maxWidth: '100%', overflowX: 'auto', maxHeight: '600px', overflowY: 'auto', border: '1px solid #333' }}>
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
                            <tr key={idx} style={{ borderBottom: '1px solid #333' }}>
                                {columns.map(col => {
                                    const val = row[col];
                                    const strVal = val === null || val === undefined ? '' : (typeof val === 'object' ? JSON.stringify(val) : String(val));
                                    const displayVal = strVal.length > 20 ? strVal.substring(0, 20) + '...' : strVal;
                                    return (
                                        <td key={col} style={{ padding: '0.5rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={strVal}>
                                            {displayVal}
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
