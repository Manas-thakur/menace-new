import { useEffect, useRef, useState } from 'react';
import { profile } from '../../data/profile';

/** The address as a huge mailto link, plus a copy button that succeeds silently. */
export function CopyEmail() {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(profile.email);
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (permissions, insecure context): the mailto link remains the way in.
    }
  };

  return (
    <div className="contact__email" data-rise>
      <a className="contact__mail" href={`mailto:${profile.email}`}>
        {profile.email}
      </a>
      <button type="button" className="contact__copy" data-copied={copied} onClick={copy} aria-label="Copy email address">
        <svg className="contact__copy-icon" viewBox="0 0 24 24" aria-hidden="true">
          {copied ? (
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          ) : (
            <>
              <rect x="8.5" y="8.5" width="11" height="11" rx="2" />
              <path d="M15.5 8.5V6.5a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2" />
            </>
          )}
        </svg>
        <span aria-hidden="true">{copied ? 'Copied' : 'Copy'}</span>
      </button>
      <span className="visually-hidden" aria-live="polite">
        {copied ? 'Email address copied' : ''}
      </span>
    </div>
  );
}
