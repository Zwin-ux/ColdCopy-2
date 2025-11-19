import React from 'react';

export const Header: React.FC = () => {
    return (
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 var(--space-xs)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                <div style={{
                    width: '24px',
                    height: '24px',
                    background: 'var(--accent-primary)',
                    clipPath: 'polygon(0 0, 100% 0, 100% 70%, 70% 100%, 0 100%)'
                }} />
                <h1 style={{ fontSize: '18px', letterSpacing: '-0.03em' }}>
                    COLD<span style={{ color: 'var(--text-secondary)' }}>COPY</span>
                </h1>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                V2.0 // PRECISION ENGINE
            </div>
        </header>
    );
};
