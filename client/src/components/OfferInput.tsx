import React from 'react';

interface OfferInputProps {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
}

export const OfferInput: React.FC<OfferInputProps> = ({ value, onChange, disabled }) => {
    return (
        <div className="input-group">
            <label htmlFor="offer-input">What are you selling?</label>
            <textarea
                id="offer-input"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="e.g. AI-driven lead generation services for B2B SaaS..."
                disabled={disabled}
                style={{ height: '120px' }}
            />
        </div>
    );
};
