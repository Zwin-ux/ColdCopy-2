import React from 'react';
import { Link } from 'react-router-dom';
import { ProductDemo } from '../components/ProductDemo';
import { Header } from '../components/Header';

export const LandingPage = () => {
    return (
        <div className="landing-page">
            <Header />

            <section className="hero-section">
                <div className="hero-content">
                    <h1 className="hero-title">
                        Surgical Outreach.<br />
                        <span style={{ color: 'var(--accent-primary)' }}>Zero Drag.</span>
                    </h1>
                    <p className="hero-subtitle">
                        ColdCopy is an automated outbound machine that feels handcrafted.
                        Feed it a link, get a compliant, high-converting email sequence.
                    </p>
                    <div className="hero-actions">
                        <Link to="/app" className="btn btn-primary">LAUNCH ENGINE</Link>
                        <a href="#demo" className="btn btn-secondary">WATCH DEMO</a>
                    </div>
                </div>
                <div className="hero-demo" id="demo">
                    <ProductDemo />
                </div>
            </section>

            <section className="features-grid">
                <div className="feature-card">
                    <h3>Reconnaissance</h3>
                    <p>We scrape the target's public footprint to find actual hooks, not generic fluff.</p>
                </div>
                <div className="feature-card">
                    <h3>Angle Generation</h3>
                    <p>Deterministic AI creates value, curiosity, and social proof angles instantly.</p>
                </div>
                <div className="feature-card">
                    <h3>Compliance</h3>
                    <p>Built-in deliverability checks ensure you stay out of the spam folder.</p>
                </div>
            </section>

            <footer style={{
                marginTop: 'auto',
                padding: 'var(--space-lg)',
                borderTop: '1px solid var(--border-subtle)',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '12px'
            }}>
                © 2025 ColdCopy Inc. // PRECISION OUTREACH
            </footer>

            <style>{`
        .landing-page {
          max-width: 1200px;
          margin: 0 auto;
          padding: var(--space-md);
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        .hero-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-xl);
          align-items: center;
          padding: 80px 0;
        }

        .hero-title {
          font-size: 64px;
          line-height: 1.1;
          margin-bottom: var(--space-md);
        }

        .hero-subtitle {
          font-size: 18px;
          max-width: 480px;
          margin-bottom: var(--space-lg);
          line-height: 1.6;
        }

        .hero-actions {
          display: flex;
          gap: var(--space-md);
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--space-lg);
          padding: 80px 0;
          border-top: 1px solid var(--border-subtle);
        }

        .feature-card h3 {
          color: var(--text-primary);
          margin-bottom: var(--space-sm);
        }

        @media (max-width: 768px) {
          .hero-section {
            grid-template-columns: 1fr;
            padding: 40px 0;
          }
          .hero-title {
            font-size: 40px;
          }
          .features-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
        </div>
    );
};
