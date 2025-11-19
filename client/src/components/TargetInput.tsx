import React from 'react';

interface TargetInputProps {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
}

export const TargetInput: React.FC<TargetInputProps> = ({ value, onChange, disabled }) => {
    return (
        <div className="input-group">
            <label htmlFor="target-input">Who is the target?</label>
            <textarea
                id="target-input"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Paste a LinkedIn URL, company website, or description..."
                disabled={disabled}
                style={{ height: '120px' }}
            />
        </div>
    );
};
