import React, { useState, useRef, useEffect } from 'react';

export default function NuclearCommands() {
  const [showVideo, setShowVideo] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    if (showVideo && videoRef.current) {
      videoRef.current.play().catch(error => {
        console.log("Autoplay prevented:", error);
      });
    }
  }, [showVideo]);

  const handleDoomsday = () => {
    setShowVideo(true);
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
      
      {!showVideo ? (
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
      ) : (
        <div style={{ 
          border: '2px solid #ff0000', 
          padding: '10px', 
          borderRadius: '8px',
          background: '#000',
          boxShadow: '0 0 30px rgba(255, 0, 0, 0.3)'
        }}>
          <video 
            ref={videoRef}
            width="640" 
            height="360" 
            controls 
            autoPlay
            src="/DANGER.mp4"
            style={{ display: 'block' }}
          >
            Your browser does not support the video tag.
          </video>
          <button 
            onClick={() => setShowVideo(false)}
            style={{
              marginTop: '1rem',
              background: 'transparent',
              border: '1px solid #ff0000',
              color: '#ff0000',
              padding: '0.5rem 1rem',
              cursor: 'pointer',
              borderRadius: '4px'
            }}
          >
            Abort Sequence
          </button>
        </div>
      )}
    </div>
  );
}
