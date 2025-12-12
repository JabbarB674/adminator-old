import React, { useState, useEffect } from 'react';
import { apiUrl } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

export default function UserControl() {
  const { showNotification } = useNotification();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    profileId: '',
    isActive: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('jwt');
      const headers = { 'Authorization': `Bearer ${token}` };

      const [usersRes, profilesRes] = await Promise.all([
        fetch(apiUrl('/users'), { headers }),
        fetch(apiUrl('/users/profiles'), { headers })
      ]);

      if (!usersRes.ok || !profilesRes.ok) throw new Error('Failed to fetch data');

      const usersData = await usersRes.json();
      const profilesData = await profilesRes.json();

      setUsers(usersData);
      setProfiles(profilesData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      email: user.Email,
      password: '', // Don't populate password
      firstName: user.FirstName || '',
      lastName: user.LastName || '',
      profileId: user.ProfileId,
      isActive: user.IsActive
    });
    setShowModal(true);
  };

  const handleCreate = () => {
    setEditingUser(null);
    setFormData({
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      profileId: profiles.length > 0 ? profiles[0].ProfileId : '',
      isActive: true
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('jwt');
      const headers = { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const url = editingUser 
        ? apiUrl(`/users/${editingUser.UserId}`)
        : apiUrl('/users');
      
      const method = editingUser ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Operation failed');
      }

      setShowModal(false);
      fetchData(); // Refresh list
    } catch (err) {
      showNotification(err.message);
    }
  };

  if (loading) return <div style={{ padding: '2rem', color: '#aaa' }}>Loading Users...</div>;
  if (error) return <div style={{ padding: '2rem', color: 'red' }}>Error: {error}</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ color: '#fff', margin: 0 }}>User Management</h2>
        <button 
          onClick={handleCreate}
          style={{
            padding: '0.8rem 1.5rem',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          + New User
        </button>
      </div>

      <div style={{ background: '#1e1e1e', borderRadius: '8px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', color: '#ddd' }}>
          <thead>
            <tr style={{ background: '#252525', textAlign: 'left' }}>
              <th style={{ padding: '1rem' }}>Name</th>
              <th style={{ padding: '1rem' }}>Email</th>
              <th style={{ padding: '1rem' }}>Profile</th>
              <th style={{ padding: '1rem' }}>Status</th>
              <th style={{ padding: '1rem' }}>Last Login</th>
              <th style={{ padding: '1rem' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.UserId} style={{ borderTop: '1px solid #333' }}>
                <td style={{ padding: '1rem' }}>{user.FirstName} {user.LastName}</td>
                <td style={{ padding: '1rem' }}>{user.Email}</td>
                <td style={{ padding: '1rem' }}>
                  <span style={{ 
                    background: user.IsGlobalAdmin ? '#4a148c' : '#333', 
                    padding: '0.2rem 0.5rem', 
                    borderRadius: '4px',
                    fontSize: '0.8rem'
                  }}>
                    {user.ProfileName}
                  </span>
                </td>
                <td style={{ padding: '1rem' }}>
                  <span style={{ color: user.IsActive ? '#4caf50' : '#f44336' }}>
                    {user.IsActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={{ padding: '1rem', fontSize: '0.9rem', color: '#aaa' }}>
                  {user.LastLogin ? new Date(user.LastLogin).toLocaleString() : 'Never'}
                </td>
                <td style={{ padding: '1rem' }}>
                  <button 
                    onClick={() => handleEdit(user)}
                    style={{
                      padding: '0.4rem 0.8rem',
                      background: '#444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      marginRight: '0.5rem'
                    }}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#1e1e1e',
            padding: '2rem',
            borderRadius: '8px',
            width: '500px',
            maxWidth: '90%',
            border: '1px solid #333'
          }}>
            <h3 style={{ color: '#fff', marginTop: 0 }}>{editingUser ? 'Edit User' : 'Create User'}</h3>
            
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', color: '#aaa', marginBottom: '0.5rem' }}>Email</label>
                <input 
                  type="email" 
                  required
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  style={{ width: '100%', padding: '0.8rem', background: '#333', border: 'none', color: '#fff', borderRadius: '4px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', color: '#aaa', marginBottom: '0.5rem' }}>First Name</label>
                  <input 
                    type="text" 
                    value={formData.firstName}
                    onChange={e => setFormData({...formData, firstName: e.target.value})}
                    style={{ width: '100%', padding: '0.8rem', background: '#333', border: 'none', color: '#fff', borderRadius: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#aaa', marginBottom: '0.5rem' }}>Last Name</label>
                  <input 
                    type="text" 
                    value={formData.lastName}
                    onChange={e => setFormData({...formData, lastName: e.target.value})}
                    style={{ width: '100%', padding: '0.8rem', background: '#333', border: 'none', color: '#fff', borderRadius: '4px' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', color: '#aaa', marginBottom: '0.5rem' }}>Access Profile</label>
                <select 
                  required
                  value={formData.profileId}
                  onChange={e => setFormData({...formData, profileId: e.target.value})}
                  style={{ width: '100%', padding: '0.8rem', background: '#333', border: 'none', color: '#fff', borderRadius: '4px' }}
                >
                  <option value="">Select Profile...</option>
                  {profiles.map(p => (
                    <option key={p.ProfileId} value={p.ProfileId}>{p.ProfileName}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', color: '#aaa', marginBottom: '0.5rem' }}>
                  Password {editingUser && <span style={{ fontSize: '0.8rem' }}>(Leave blank to keep current)</span>}
                </label>
                <input 
                  type="password" 
                  required={!editingUser}
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  style={{ width: '100%', padding: '0.8rem', background: '#333', border: 'none', color: '#fff', borderRadius: '4px' }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', color: '#fff', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={formData.isActive}
                    onChange={e => setFormData({...formData, isActive: e.target.checked})}
                    style={{ marginRight: '0.5rem' }}
                  />
                  Active Account
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ padding: '0.8rem 1.5rem', background: 'transparent', color: '#aaa', border: '1px solid #555', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  style={{ padding: '0.8rem 1.5rem', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Save User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
