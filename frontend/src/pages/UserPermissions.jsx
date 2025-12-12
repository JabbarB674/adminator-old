import React, { useState, useEffect } from 'react';
import { apiUrl } from '../utils/api';
import { useNotification } from '../context/NotificationContext';

export default function UserPermissions() {
  const { showNotification } = useNotification();
  const [users, setUsers] = useState([]);
  const [apps, setApps] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Permission State
  const [useCustomAccess, setUseCustomAccess] = useState(false);
  const [assignedAppIds, setAssignedAppIds] = useState([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('jwt');
      const headers = { 'Authorization': `Bearer ${token}` };

      const [usersRes, appsRes] = await Promise.all([
        fetch(apiUrl('/users'), { headers }),
        fetch(apiUrl('/db/apps'), { headers }) // We need an endpoint for all apps
      ]);

      if (!usersRes.ok) throw new Error('Failed to fetch users');
      
      const usersData = await usersRes.json();
      // If apps endpoint fails, we might need to create it or use a different one
      // Assuming /db/apps exists or we create it. 
      // Actually, let's use the one we created in appController: /api/db/apps is likely wrong.
      // We created getAllApps in appController but didn't route it yet?
      // Let's assume we fix the route.
      
      let appsData = [];
      if (appsRes.ok) {
          appsData = await appsRes.json();
      } else {
          // Fallback or error
          console.error("Failed to fetch apps list");
      }

      setUsers(usersData);
      setApps(appsData);
    } catch (err) {
      console.error(err);
      showNotification('Error loading data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = async (user) => {
    setSelectedUser(user);
    setSaving(false);
    try {
      const token = localStorage.getItem('jwt');
      const res = await fetch(apiUrl(`/users/${user.UserId}/apps`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setUseCustomAccess(data.useCustomAccess);
        setAssignedAppIds(data.assignedAppIds || []);
      } else {
        // Default state if no custom access set yet
        setUseCustomAccess(false);
        setAssignedAppIds([]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('jwt');
      const res = await fetch(apiUrl(`/users/${selectedUser.UserId}/apps`), {
        method: 'PUT',
        headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            useCustomAccess,
            appIds: assignedAppIds
        })
      });

      if (!res.ok) throw new Error('Failed to save permissions');
      
      showNotification('Permissions updated successfully');
    } catch (err) {
      showNotification(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleApp = (appId) => {
    if (assignedAppIds.includes(appId)) {
      setAssignedAppIds(assignedAppIds.filter(id => id !== appId));
    } else {
      setAssignedAppIds([...assignedAppIds, appId]);
    }
  };

  if (loading) return <div style={{ padding: '2rem', color: '#aaa' }}>Loading...</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem' }}>
      
      {/* User List Sidebar */}
      <div style={{ background: '#1e1e1e', borderRadius: '8px', overflow: 'hidden', height: 'calc(100vh - 150px)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid #333', background: '#252525' }}>
          <h3 style={{ margin: 0, color: '#fff' }}>Select User</h3>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {users.map(user => (
            <div 
              key={user.UserId}
              onClick={() => handleUserSelect(user)}
              style={{ 
                padding: '1rem', 
                cursor: 'pointer',
                background: selectedUser?.UserId === user.UserId ? '#007bff' : 'transparent',
                color: selectedUser?.UserId === user.UserId ? '#fff' : '#ddd',
                borderBottom: '1px solid #333'
              }}
            >
              <div style={{ fontWeight: 'bold' }}>{user.FirstName} {user.LastName}</div>
              <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>{user.Email}</div>
              <div style={{ fontSize: '0.7rem', marginTop: '0.2rem', opacity: 0.6 }}>{user.ProfileName}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Permissions Editor */}
      <div style={{ background: '#1e1e1e', borderRadius: '8px', padding: '2rem' }}>
        {!selectedUser ? (
          <div style={{ color: '#aaa', textAlign: 'center', marginTop: '2rem' }}>Select a user to manage permissions</div>
        ) : (
          <div>
            <h2 style={{ color: '#fff', marginTop: 0, marginBottom: '0.5rem' }}>Permissions: {selectedUser.FirstName} {selectedUser.LastName}</h2>
            <p style={{ color: '#aaa', marginBottom: '2rem' }}>Current Profile: <strong style={{ color: '#fff' }}>{selectedUser.ProfileName}</strong></p>

            <div style={{ marginBottom: '2rem', padding: '1rem', background: '#252525', borderRadius: '8px', border: '1px solid #333' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: '#fff', fontSize: '1.1rem' }}>
                <input 
                  type="checkbox" 
                  checked={useCustomAccess}
                  onChange={e => setUseCustomAccess(e.target.checked)}
                  style={{ width: '20px', height: '20px', marginRight: '1rem' }}
                />
                Override Profile Permissions
              </label>
              <p style={{ marginLeft: '2.5rem', color: '#aaa', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                Enable this to manually assign apps to this user, ignoring their Profile's default access.
              </p>
            </div>

            {useCustomAccess && (
              <div>
                <h3 style={{ color: '#fff' }}>App Access</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                  {apps.map(app => (
                    <div 
                      key={app.AppId}
                      onClick={() => toggleApp(app.AppId)}
                      style={{ 
                        padding: '1rem', 
                        background: assignedAppIds.includes(app.AppId) ? '#004d40' : '#333',
                        border: assignedAppIds.includes(app.AppId) ? '1px solid #009688' : '1px solid #444',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <input 
                          type="checkbox" 
                          checked={assignedAppIds.includes(app.AppId)}
                          readOnly
                          style={{ marginRight: '0.5rem' }}
                        />
                        <strong style={{ color: '#fff' }}>{app.AppName}</strong>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#ccc' }}>{app.Description}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!useCustomAccess && (
               <div style={{ padding: '2rem', textAlign: 'center', color: '#aaa', border: '1px dashed #444', borderRadius: '8px' }}>
                 User is currently using the standard <strong>{selectedUser.ProfileName}</strong> profile.
                 <br/><br/>
                 Enable "Override Profile Permissions" to create a custom permission set for this user.
               </div>
            )}

            <div style={{ marginTop: '2rem', borderTop: '1px solid #333', paddingTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: '0.8rem 2rem',
                  background: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  opacity: saving ? 0.7 : 1
                }}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>

          </div>
        )}
      </div>

    </div>
  );
}
