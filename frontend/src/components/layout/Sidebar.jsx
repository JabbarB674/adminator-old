import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import '../../styles/Sidebar.css';

export default function Sidebar() {
  const [expandedGroups, setExpandedGroups] = useState({
    settings: false,
    tools: false,
    apps: false
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
              <NavLink to="/settings/nuclear-commands" className={({ isActive }) => `nav-item nav-subitem ${isActive ? 'active' : ''}`}>
                Nuclear Commands
              </NavLink>
            </div>
          )}
        </div>
        
        <NavLink to="/user-control" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          User Control
        </NavLink>

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
              <NavLink to="/apps/app1" className={({ isActive }) => `nav-item nav-subitem ${isActive ? 'active' : ''}`}>
                App 1
              </NavLink>
              <NavLink to="/apps/app2" className={({ isActive }) => `nav-item nav-subitem ${isActive ? 'active' : ''}`}>
                App 2
              </NavLink>
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
