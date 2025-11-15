import { useEffect, useState } from 'react';

const BreathingCursor = () => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updatePosition = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
      if (!isVisible) setIsVisible(true);
    };

    const handleMouseLeave = () => setIsVisible(false);
    const handleMouseEnter = () => setIsVisible(true);

    window.addEventListener('mousemove', updatePosition);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      window.removeEventListener('mousemove', updatePosition);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, [isVisible]);

  return (
    <>
      <style>{`
        .breathing-cursor-active {
          cursor: none !important;
        }
        .breathing-cursor-active * {
          cursor: none !important;
        }
      `}</style>
      <div
        className="breathing-cursor-active"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          pointerEvents: 'none',
          zIndex: 9999,
        }}
      >
        {isVisible && (
          <>
            {/* Main cursor circle with breathing animation */}
            <div
              style={{
                position: 'absolute',
                left: `${position.x}px`,
                top: `${position.y}px`,
                width: '20px',
                height: '20px',
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none',
              }}
            >
              <div
                className="animate-breathing-cursor"
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  backgroundColor: 'hsl(var(--primary))',
                  boxShadow: '0 0 15px hsl(var(--primary) / 0.3)',
                }}
              />
            </div>
            {/* Subtle glow effect */}
            <div
              style={{
                position: 'absolute',
                left: `${position.x}px`,
                top: `${position.y}px`,
                width: '40px',
                height: '40px',
                transform: 'translate(-50%, -50%)',
                borderRadius: '50%',
                background: 'radial-gradient(circle, hsl(var(--primary) / 0.15) 0%, transparent 70%)',
                pointerEvents: 'none',
                animation: 'breathing-glow 2s ease-in-out infinite',
              }}
            />
          </>
        )}
      </div>
    </>
  );
};

export default BreathingCursor;
