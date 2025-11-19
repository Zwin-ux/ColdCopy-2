import React from 'react';

interface ActionButtonsProps {
    onGenerate: () => void;
    onRegenerate: () => void;
    onCopy: () => void;
    onExport: () => void;
    hasResult: boolean;
    isLoading: boolean;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
    onGenerate,
    onRegenerate,
    onCopy,
    onExport,
    hasResult,
    isLoading
}) => {
    return (
        <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'auto' }}>
            {!hasResult ? (
                <button
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                    onClick={onGenerate}
                    disabled={isLoading}
                >
                    {isLoading ? 'PROCESSING...' : 'GENERATE SEQUENCE'}
                </button>
            ) : (
                <>
                    <button
                        className="btn btn-secondary"
                        onClick={onRegenerate}
                        disabled={isLoading}
                        style={{ flex: 1 }}
                    >
                        REGENERATE
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={onCopy}
                        style={{ flex: 1 }}
                    >
                        COPY
                    </button>
                    <button
                        className="btn btn-icon"
                        onClick={onExport}
                        title="Export to CRM"
                    >
                        ⬇
                    </button>
                </>
            )}
        </div>
    );
};
