import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../styles/Sidebar.css';

export default function Sidebar() {
  const { user } = useAuth();
  const [expandedGroups, setExpandedGroups] = useState({
    settings: false,
    tools: false,
    users: false,
    apps: true // Default open for apps
  });
  const location = useLocation();

  const toggleGroup = (group) => {
    setExpandedGroups(prev => ({
      ...prev,
      [group]: !prev[group]
    }));
  };

  const isActive = (path) => location.pathname === path;

  return (
    <aside className="app-sidebar">
      <nav className="sidebar-nav">
        <NavLink to="/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          Dashboard
        </NavLink>
        
        {/* Settings Dropdown */}
        <div className="nav-group">
          <div 
            className={`nav-item nav-group-header`}
            onClick={() => toggleGroup('settings')}
          >
            <span>Settings</span>
            <span className={`arrow-icon ${expandedGroups.settings ? 'open' : ''}`}>▶</span>
          </div>
          {expandedGroups.settings && (
            <div className="nav-group-items">
              <NavLink to="/settings/my-details" className={({ isActive }) => `nav-item nav-subitem ${isActive ? 'active' : ''}`}>
                My Details
              </NavLink>
              <NavLink to="/settings/app-configuration" className={({ isActive }) => `nav-item nav-subitem ${isActive ? 'active' : ''}`}>
                App Configuration
              </NavLink>
              <NavLink to="/settings/app-editor" className={({ isActive }) => `nav-item nav-subitem ${isActive ? 'active' : ''}`}>
                App Editor (New)
              </NavLink>
              <NavLink to="/settings/nuclear-commands" className={({ isActive }) => `nav-item nav-subitem ${isActive ? 'active' : ''}`}>
                Nuclear Commands
              </NavLink>
            </div>
          )}
        </div>
        
        {user?.isGlobalAdmin && (
          <div className="nav-group">
            <div 
              className={`nav-item nav-group-header`}
              onClick={() => toggleGroup('users')}
            >
              <span>User Control</span>
              <span className={`arrow-icon ${expandedGroups.users ? 'open' : ''}`}>▶</span>
            </div>
            {expandedGroups.users && (
              <div className="nav-group-items">
                <NavLink to="/user-control" className={({ isActive }) => `nav-item nav-subitem ${isActive ? 'active' : ''}`}>
                  User Management
                </NavLink>
                <NavLink to="/user-permissions" className={({ isActive }) => `nav-item nav-subitem ${isActive ? 'active' : ''}`}>
                  User Permissions
                </NavLink>
              </div>
            )}
          </div>
        )}

        {/* Tools Dropdown */}
        <div className="nav-group">
          <div 
            className={`nav-item nav-group-header`}
            onClick={() => toggleGroup('tools')}
          >
            <span>Tools</span>
            <span className={`arrow-icon ${expandedGroups.tools ? 'open' : ''}`}>▶</span>
          </div>
          {expandedGroups.tools && (
            <div className="nav-group-items">
              <NavLink to="/tools/curl" className={({ isActive }) => `nav-item nav-subitem ${isActive ? 'active' : ''}`}>
                cURL
              </NavLink>
              <NavLink to="/tools/db-lookup" className={({ isActive }) => `nav-item nav-subitem ${isActive ? 'active' : ''}`}>
                DB Lookup
              </NavLink>
              <NavLink to="/tools/bucket-explorer" className={({ isActive }) => `nav-item nav-subitem ${isActive ? 'active' : ''}`}>
                Bucket Explorer
              </NavLink>
            </div>
          )}
        </div>

        {/* Apps Dropdown */}
        <div className="nav-group">
          <div 
            className={`nav-item nav-group-header`}
            onClick={() => toggleGroup('apps')}
          >
            <span>Apps</span>
            <span className={`arrow-icon ${expandedGroups.apps ? 'open' : ''}`}>▶</span>
          </div>
          {expandedGroups.apps && (
            <div className="nav-group-items">
              {user?.allowedApps?.length > 0 ? (
                user.allowedApps.map(app => (
                  <NavLink 
                    key={app.appKey}
                    to={app.routePath || `/apps/${app.appKey}`} 
                    className={({ isActive }) => `nav-item nav-subitem ${isActive ? 'active' : ''}`}
                  >
                    {app.appName}
                  </NavLink>
                ))
              ) : (
                <div style={{ padding: '0.5rem 1rem', color: '#666', fontSize: '0.8rem' }}>
                  No apps available
                </div>
              )}
            </div>
          )}
        </div>
      </nav>
      <div className="sidebar-footer">
        &copy; Adminator
      </div>
    </aside>
  );
}
