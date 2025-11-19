import React from 'react';

export type Tone = "friendly" | "professional" | "aggressive" | "minimalist";

interface ToneSelectorProps {
    value: Tone;
    onChange: (tone: Tone) => void;
    disabled?: boolean;
}

const tones: Tone[] = ["friendly", "professional", "aggressive", "minimalist"];

export const ToneSelector: React.FC<ToneSelectorProps> = ({ value, onChange, disabled }) => {
    return (
        <div className="input-group">
            <label>Select Tone</label>
            <div className="tone-grid">
                {tones.map((tone) => (
                    <button
                        key={tone}
                        className={`tone-option ${value === tone ? 'selected' : ''}`}
                        onClick={() => onChange(tone)}
                        disabled={disabled}
                    >
                        {tone.charAt(0).toUpperCase() + tone.slice(1)}
                    </button>
                ))}
            </div>
        </div>
    );
};
