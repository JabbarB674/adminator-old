import React, { useState } from 'react';
import { apiUrl } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

export default function DbLookup() {
  const { user } = useAuth();
  const [query, setQuery] = useState('SELECT TOP 10 * FROM Adminator_Users');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!user || !user.isGlobalAdmin) {
    return (
      <div style={{ 
        maxWidth: '800px', 
        margin: '2rem auto', 
        padding: '2rem',
        background: '#2a1515',
        border: '1px solid #ff4d4d',
        borderRadius: '8px',
        color: '#ff4d4d',
        textAlign: 'center'
      }}>
        <h2 style={{ marginBottom: '1rem' }}>Access Denied</h2>
        <p>You do not have enough permissions for this feature.</p>
        <p style={{ fontSize: '0.9rem', opacity: 0.8, marginTop: '0.5rem' }}>Required: Global Admin privileges</p>
      </div>
    );
  }

  const handleExecute = async () => {
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const token = localStorage.getItem('jwt');
      const res = await fetch(apiUrl('/db/query'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Query failed');
      
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ color: '#fff', marginBottom: '1rem' }}>DB Explorer</h1>
      <p style={{ color: '#aaa', marginBottom: '2rem' }}>
        Execute raw SQL queries against the database. <strong style={{color: '#f44336'}}>USE WITH CAUTION.</strong>
      </p>

      <div style={{ marginBottom: '1rem' }}>
        <textarea
          value={query}
          onChange={e => setQuery(e.target.value)}
          rows={5}
          style={{ 
            width: '100%', 
            padding: '1rem', 
            background: '#1e1e1e', 
            border: '1px solid #333', 
            color: '#d4d4d4', 
            fontFamily: 'monospace',
            borderRadius: '4px'
          }}
        />
      </div>

      <button 
        onClick={handleExecute}
        disabled={loading}
        style={{
          background: '#f44336',
          color: 'white',
          border: 'none',
          padding: '0.75rem 1.5rem',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontWeight: 'bold'
        }}
      >
        {loading ? 'Executing...' : 'Run Query'}
      </button>

      {error && (
        <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(244, 67, 54, 0.1)', color: '#f44336', borderRadius: '4px' }}>
          {error}
        </div>
      )}

      {results && (
        <div style={{ marginTop: '2rem' }}>
          <div style={{ marginBottom: '0.5rem', color: '#888' }}>
            Rows Affected: {results.rowsAffected}
          </div>
          {results.recordset && results.recordset.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', color: '#ddd', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: '#333' }}>
                    {Object.keys(results.recordset[0]).map(key => (
                      <th key={key} style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #444' }}>{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.recordset.map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #222' }}>
                      {Object.values(row).map((val, j) => (
                        <td key={j} style={{ padding: '10px' }}>{String(val)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: '2rem', background: '#1e1e1e', textAlign: 'center', color: '#666' }}>
              No records returned
            </div>
          )}
        </div>
      )}
    </div>
  );
}
