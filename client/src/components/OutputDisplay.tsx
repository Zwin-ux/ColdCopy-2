import React from 'react';

interface OutputDisplayProps {
    email: string | null;
    research: any | null;
    isLoading: boolean;
}

export const OutputDisplay: React.FC<OutputDisplayProps> = ({ email, research, isLoading }) => {
    if (isLoading) {
        return (
            <div className="output-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
                <div className="loading" style={{ color: 'var(--accent-primary)', fontSize: '14px', letterSpacing: '0.1em' }}>
          // RUNNING PIPELINE...
                </div>
            </div>
        );
    }

    if (!email) {
        return (
            <div className="output-container" style={{ justifyContent: 'center', alignItems: 'center', opacity: 0.3 }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>✉️</div>
                    <p>Ready to generate.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="output-container">
            <div className="email-preview">
                {email}
            </div>

            {research && (
                <div className="research-snapshot">
                    <div className="snapshot-item">
                        <h4>Buying Reason</h4>
                        <p>{research.signals.buying_reason}</p>
                    </div>
                    <div className="snapshot-item">
                        <h4>Credibility Hook</h4>
                        <p>{research.signals.credibility_hook}</p>
                    </div>
                    <div className="snapshot-item">
                        <h4>Emotional Hook</h4>
                        <p>{research.signals.emotional_hook}</p>
                    </div>
                    <div className="snapshot-item">
                        <h4>Risk Assessment</h4>
                        <p style={{
                            color: research.deliverability.riskLevel === 'high' ? 'var(--status-error)' :
                                research.deliverability.riskLevel === 'medium' ? 'var(--status-warning)' :
                                    'var(--status-success)'
                        }}>
                            {research.deliverability.riskLevel.toUpperCase()} - {research.deliverability.cues}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};
