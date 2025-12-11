import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import '../../styles/Header.css';

export default function Header() {
  const { user, logout, refreshUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);

  const handleRefresh = async () => {
      setIsRefreshing(true);
      await refreshUser();
      setTimeout(() => setIsRefreshing(false), 500);
  };

  const getPathDisplay = () => {
    const path = location.pathname;
    if (path === '/' || path === '/dashboard') return <span className="path-segment">Dashboard</span>;
    
    const segments = path.split('/').filter(Boolean);
    
    // Filter out 'apps' if it's the first segment to make it cleaner
    const displaySegments = segments[0] === 'apps' ? segments.slice(1) : segments;

    if (displaySegments.length === 0) return <span className="path-segment">Dashboard</span>;

    return displaySegments.map((segment, index) => {
      // Capitalize and replace hyphens
      let label = segment.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      
      return (
        <React.Fragment key={index}>
           {index > 0 && <span className="path-separator">&gt;</span>}
           <span className="path-segment">{label}</span>
        </React.Fragment>
      );
    });
  };

  const handleLogout = () => {
      logout();
      navigate('/login');
  }

  return (
    <header className="app-header">
      <div className="header-left">
        <Link to="/" className="tech-logo">Adminator</Link>
        <div className="header-path">
            {getPathDisplay()}
        </div>
      </div>
      
      {user && (
        <div className="header-right" ref={dropdownRef}>
            <button 
                onClick={handleRefresh} 
                title="Refresh Profile & Apps"
                disabled={isRefreshing}
                style={{ 
                    marginRight: '1rem', 
                    background: 'transparent', 
                    border: 'none', 
                    color: '#aaa', 
                    cursor: 'pointer', 
                    fontSize: '1.2rem',
                    transition: 'transform 0.5s ease'
                }}
            >
                <span style={{ display: 'inline-block', transform: isRefreshing ? 'rotate(360deg)' : 'none', transition: 'transform 0.5s ease' }}>↻</span>
            </button>
            <div className="user-box" onClick={() => setDropdownOpen(!dropdownOpen)}>
                {user.email || user.username || 'User'}
            </div>
            {dropdownOpen && (
                <div className="user-dropdown">
                    {user.isGlobalAdmin && (
                        <>
                            <Link to="/user-control" className="dropdown-item" style={{textDecoration: 'none', color: 'inherit', display: 'block'}} onClick={() => setDropdownOpen(false)}>
                                User Management
                            </Link>
                            <Link to="/user-permissions" className="dropdown-item" style={{textDecoration: 'none', color: 'inherit', display: 'block'}} onClick={() => setDropdownOpen(false)}>
                                User Permissions
                            </Link>
                        </>
                    )}
                    <div className="dropdown-item" onClick={handleLogout}>Logout</div>
                </div>
            )}
        </div>
      )}
    </header>
  );
}
