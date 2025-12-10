import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/NotFound.css';

export default function NotFound() {
  return (
    <div className="not-found-container">
      <div className="not-found-card">
        <h1 className="not-found-title">404</h1>
        <p className="not-found-message">Page Not Found or Not Implemented</p>
        
        <Link to="/dashboard" className="not-found-button">
          Back to Dashboard
        </Link>

        <div className="not-found-footer">
          If this was supposed to work, submit a ticket with details to TASTY IT TEAM
        </div>
      </div>
    </div>
  );
}
