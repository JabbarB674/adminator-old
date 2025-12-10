import React from 'react';

export default function NuclearCommands() {
  const handleDoomsday = () => {
    window.location.href = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100%',
      textAlign: 'center'
    }}>
      <h2 style={{ color: '#ff0000', fontSize: '2rem', marginBottom: '2rem' }}>⚠️ DANGER ZONE ⚠️</h2>
      
      <button 
        onClick={handleDoomsday}
        style={{
          backgroundColor: '#ff0000',
          color: 'white',
          border: 'none',
          padding: '2rem 4rem',
          fontSize: '1.5rem',
          fontWeight: 'bold',
          borderRadius: '12px',
          cursor: 'pointer',
          boxShadow: '0 0 20px rgba(255, 0, 0, 0.5)',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          transition: 'transform 0.1s, box-shadow 0.1s'
        }}
        onMouseDown={(e) => e.target.style.transform = 'scale(0.95)'}
        onMouseUp={(e) => e.target.style.transform = 'scale(1)'}
        onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
      >
        DO NOT PRESS UNLESS COMPLETE FAILURE IS IMMINENT
      </button>
    </div>
  );
}
