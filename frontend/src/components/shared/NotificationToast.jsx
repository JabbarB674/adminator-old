import React, { useEffect, useState } from 'react';
import { useNotification } from '../../context/NotificationContext';

export default function NotificationToast() {
  const { notification, closeNotification } = useNotification();
  const [timeLeft, setTimeLeft] = useState(0);
  
  useEffect(() => {
    if (!notification) return;

    const duration = notification.duration || 5000;
    setTimeLeft(duration);
    
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, duration - elapsed);
      setTimeLeft(remaining);
      
      if (remaining <= 0) {
        clearInterval(interval);
        closeNotification();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [notification, closeNotification]);

  if (!notification) return null;

  const duration = notification.duration || 5000;
  const progress = timeLeft / duration;
  const radius = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div style={{
      position: 'absolute',
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)',
      background: '#333',
      color: '#fff',
      padding: '0.5rem 1rem',
      borderRadius: '4px',
      border: '1px solid #555',
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      zIndex: 2000,
      boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
      minWidth: '300px',
      justifyContent: 'space-between'
    }}>
      <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{notification.message}</span>
      
      <button 
        onClick={closeNotification}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          width: '24px',
          height: '24px'
        }}
      >
        {/* Timer Ring */}
        <svg width="24" height="24" style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
          <circle
            cx="12"
            cy="12"
            r={radius}
            fill="transparent"
            stroke="#555"
            strokeWidth="2"
          />
          <circle
            cx="12"
            cy="12"
            r={radius}
            fill="transparent"
            stroke="var(--accent-color, #ff0000)"
            strokeWidth="2"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        
        {/* X Icon */}
        <span style={{ color: '#fff', fontSize: '12px', fontWeight: 'bold', zIndex: 1 }}>✕</span>
      </button>
    </div>
  );
}
