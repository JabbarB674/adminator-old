import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import '../../styles/Switch.css';

export default function AppConfiguration() {
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    maintenanceMode: false,
    debugLogging: true,
    allowSignups: true,
    emailNotifications: false,
    betaFeatures: false
  });

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

  const toggleSetting = (key) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const SettingItem = ({ label, description, settingKey }) => (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      padding: '1.5rem 0', 
      borderBottom: '1px solid #333' 
    }}>
      <div>
        <div style={{ fontSize: '1.1rem', fontWeight: '500', marginBottom: '0.25rem' }}>{label}</div>
        <div style={{ color: '#888', fontSize: '0.9rem' }}>{description}</div>
      </div>
      <label className="switch">
        <input 
          type="checkbox" 
          checked={settings[settingKey]} 
          onChange={() => toggleSetting(settingKey)} 
        />
        <span className="slider"></span>
      </label>
    </div>
  );

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '2rem', borderBottom: '1px solid #333', paddingBottom: '1rem' }}>App Configuration</h2>
      
      <div style={{ 
        background: '#1e1e1e', 
        padding: '0 2rem', 
        borderRadius: '8px', 
        border: '1px solid #333' 
      }}>
        <SettingItem 
          label="Maintenance Mode" 
          description="Put the entire application into read-only mode for users."
          settingKey="maintenanceMode"
        />
        <SettingItem 
          label="Debug Logging" 
          description="Enable verbose logging for troubleshooting."
          settingKey="debugLogging"
        />
        <SettingItem 
          label="Allow New Signups" 
          description="Let new users register accounts."
          settingKey="allowSignups"
        />
        <SettingItem 
          label="System Email Notifications" 
          description="Receive alerts for system events."
          settingKey="emailNotifications"
        />
        <SettingItem 
          label="Beta Features" 
          description="Enable experimental features for this environment."
          settingKey="betaFeatures"
        />
      </div>
    </div>
  );
}
