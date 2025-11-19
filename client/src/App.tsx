import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { Header } from './components/Header';
import { OfferInput } from './components/OfferInput';
import { TargetInput } from './components/TargetInput';
import { ToneSelector, Tone } from './components/ToneSelector';
import { OutputDisplay } from './components/OutputDisplay';
import { ActionButtons } from './components/ActionButtons';

function App() {
    const [offer, setOffer] = useState('');
    const [target, setTarget] = useState('');
    const [tone, setTone] = useState<Tone>('professional');

    const [result, setResult] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleGenerate = async () => {
        if (!offer || !target) return;

        setIsLoading(true);
        try {
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    offer,
                    targetText: target,
                    tone
                })
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error);

            setResult(data);
        } catch (error) {
            console.error('Generation failed:', error);
            alert('Failed to generate email. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegenerate = () => {
        setResult(null);
        handleGenerate();
    };

    const handleCopy = () => {
        if (result?.email?.body) {
            navigator.clipboard.writeText(result.email.body);
        }
    };

    const handleExport = async () => {
        if (!result) return;

        try {
            const payload = {
                entries: [{
                    offer,
                    tone,
                    research: result.research,
                    email: result.email
                }]
            };

            const response = await fetch('/api/crm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `coldcopy-export-${Date.now()}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (error) {
            console.error('Export failed:', error);
            alert('Failed to export to CRM.');
        }
    };

    return (
        <Layout>
            <Header />
            <main className="main-content">
                <div className="panel">
                    <OfferInput value={offer} onChange={setOffer} disabled={isLoading} />
                    <TargetInput value={target} onChange={setTarget} disabled={isLoading} />
                    <ToneSelector value={tone} onChange={setTone} disabled={isLoading} />
                    <ActionButtons
                        onGenerate={handleGenerate}
                        onRegenerate={handleRegenerate}
                        onCopy={handleCopy}
                        onExport={handleExport}
                        hasResult={!!result}
                        isLoading={isLoading}
                    />
                </div>

                <div className="panel panel-glass">
                    <OutputDisplay
                        email={result?.email?.body}
                        research={result?.research}
                        isLoading={isLoading}
                    />
                </div>
            </main>
        </Layout>
    );
}

export default App;
