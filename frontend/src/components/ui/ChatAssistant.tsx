import { useState } from 'react';

export function ChatAssistant() {
  const [open, setOpen] = useState(false);

  return (
    <div className="assistant-widget">
      {open && (
        <section
          aria-labelledby="assistant-title"
          aria-modal="false"
          className="assistant-panel"
          id="assistant-panel"
          role="dialog"
        >
          <div className="assistant-panel-header">
            <div className="assistant-avatar" aria-hidden="true">N.</div>
            <div>
              <p className="assistant-kicker">YOUR PORTFOLIO GUIDE</p>
              <h2 id="assistant-title">A little help exploring?</h2>
            </div>
            <button
              aria-label="Close portfolio guide"
              className="assistant-close"
              onClick={() => setOpen(false)}
              type="button"
            >
              ×
            </button>
          </div>
          <div className="assistant-message">
            <span className="assistant-message-label">NEXUS · PREVIEW</span>
            <p>
              The AI connection is still being prepared, so I can&apos;t answer
              questions just yet. I can still point you to the work, the
              engineering approach, or the DSA log.
            </p>
          </div>
          <div className="assistant-links">
            <a href="#work" onClick={() => setOpen(false)}>Explore the work <span>↗</span></a>
            <a href="#about" onClick={() => setOpen(false)}>How I think <span>↗</span></a>
            <a href="#problems" onClick={() => setOpen(false)}>Browse solved problems <span>↗</span></a>
          </div>
          <p className="assistant-footnote">A thoughtful guide, not a working AI chat — for now.</p>
        </section>
      )}
      <button
        aria-controls="assistant-panel"
        aria-expanded={open}
        aria-label={open ? 'Close portfolio guide' : 'Open portfolio guide'}
        className={`assistant-launcher${open ? ' is-open' : ''}`}
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        {open ? (
          <span aria-hidden="true">×</span>
        ) : (
          <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
            <path d="M4.75 5.75h14.5v10.5H11l-4.5 3v-3H4.75V5.75Z" />
            <path d="M8 10h8M8 13h5" />
          </svg>
        )}
        <span className="assistant-pulse" />
      </button>
    </div>
  );
}
