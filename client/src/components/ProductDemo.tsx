import React, { useEffect, useState } from 'react';

const DEMO_STEPS = [
    { type: 'type', field: 'offer', text: 'AI-driven compliance automation for fintechs' },
    { type: 'type', field: 'target', text: 'VP of Ops at scaling payment startups' },
    { type: 'process', text: 'Scraping target profile...' },
    { type: 'process', text: 'Extracting pain points: "Manual KYC bottlenecks"...' },
    { type: 'process', text: 'Generating angles: "Reduce onboarding time by 40%"...' },
    { type: 'result', email: "Subject: 40% faster onboarding\n\nHi Sarah,\n\nNoticed you're scaling the ops team at PayFlow. Most VPs I talk to are drowning in manual KYC checks right now.\n\nWe automate that specific bottleneck. It usually cuts onboarding time by 40% in the first month.\n\nWorth a quick look?\n\nBest,\n[Name]" }
];

export const ProductDemo = () => {
    const [stepIndex, setStepIndex] = useState(0);
    const [offerText, setOfferText] = useState('');
    const [targetText, setTargetText] = useState('');
    const [status, setStatus] = useState('');
    const [email, setEmail] = useState('');

    useEffect(() => {
        let timeout: NodeJS.Timeout;

        const processStep = async () => {
            const step = DEMO_STEPS[stepIndex];

            if (!step) {
                // Reset loop
                timeout = setTimeout(() => {
                    setStepIndex(0);
                    setOfferText('');
                    setTargetText('');
                    setStatus('');
                    setEmail('');
                }, 5000);
                return;
            }

            if (step.type === 'type') {
                const fullText = step.text || '';
                let currentText = '';
                // Simulate typing
                for (let i = 0; i <= fullText.length; i++) {
                    currentText = fullText.slice(0, i);
                    if (step.field === 'offer') setOfferText(currentText);
                    if (step.field === 'target') setTargetText(currentText);
                    await new Promise(r => setTimeout(r, 30)); // Typing speed
                }
                setStepIndex(prev => prev + 1);
            } else if (step.type === 'process') {
                setStatus(step.text || '');
                timeout = setTimeout(() => {
                    setStepIndex(prev => prev + 1);
                }, 800); // Processing delay
            } else if (step.type === 'result') {
                setStatus('Ready.');
                setEmail(step.email || '');
                setStepIndex(prev => prev + 1);
            }
        };

        processStep();

        return () => clearTimeout(timeout);
    }, [stepIndex]);

    return (
        <div className="demo-container" style={{
            background: 'var(--bg-panel)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-lg)',
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
        }}>
            <div style={{ display: 'grid', gap: 'var(--space-md)', opacity: email ? 0.5 : 1, transition: 'opacity 0.5s' }}>
                <div className="input-mock">
                    <div style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>OFFER</div>
                    <div style={{ color: 'var(--text-primary)', height: '20px' }}>{offerText}<span className="cursor">|</span></div>
                </div>
                <div className="input-mock">
                    <div style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>TARGET</div>
                    <div style={{ color: 'var(--text-primary)', height: '20px' }}>{targetText}</div>
                </div>
            </div>

            <div style={{
                marginTop: 'var(--space-lg)',
                color: 'var(--accent-primary)',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
            }}>
                {status && !email && <span className="loading-dot">●</span>}
                {status}
            </div>

            {email && (
                <div style={{
                    marginTop: 'var(--space-md)',
                    background: 'var(--bg-input)',
                    padding: 'var(--space-md)',
                    borderRadius: 'var(--radius-md)',
                    borderLeft: '2px solid var(--accent-primary)',
                    whiteSpace: 'pre-wrap',
                    animation: 'slideUp 0.5s ease-out'
                }}>
                    {email}
                </div>
            )}

            <style>{`
        .cursor { animation: blink 1s step-end infinite; }
        @keyframes blink { 50% { opacity: 0; } }
        @keyframes slideUp { from { transform: translateY(10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .loading-dot { animation: pulse 1s infinite; }
      `}</style>
        </div>
    );
};
