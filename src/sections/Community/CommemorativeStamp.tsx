import { useId, useState } from 'react';
import { Stamp } from '../../components/primitives/Print';
import { portrait, profile } from '../../data/profile';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** Today in Delhi as "06 OCT 26" — the postmark is cancelled where Manas lives. */
function postmarkDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: profile.timeZone,
    day: '2-digit',
    month: 'numeric',
    year: '2-digit',
  }).formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('day')} ${MONTHS[Number(get('month')) - 1] ?? ''} ${get('year')}`;
}

/** Twelve-petal rosette drawn behind the monogram. */
function Rosette() {
  const petals = Array.from({ length: 12 }, (_, i) => (
    <path key={i} d="M50 18 Q55 27 50 36 Q45 27 50 18Z" transform={`rotate(${i * 30} 50 50)`} />
  ));
  const dots = Array.from({ length: 24 }, (_, i) => {
    const a = (i / 24) * Math.PI * 2;
    return <circle key={i} cx={50 + Math.cos(a) * 44} cy={50 + Math.sin(a) * 44} r="1.3" />;
  });
  return (
    <svg className="cstamp__rosette" viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="14" />
      <circle cx="50" cy="50" r="38" />
      <g className="cstamp__rosette-petals">{petals}</g>
      <g className="cstamp__rosette-dots">{dots}</g>
      <circle cx="50" cy="50" r="48" />
    </svg>
  );
}

function Postmark({ className = '' }: { className?: string }) {
  const id = useId().replace(/:/g, '');
  const date = postmarkDate();
  const phrase = `DELHI NCR · ${date} · `;
  const r = 39.5;
  const waves = [31, 43, 55, 67, 79].map((y) => `M104 ${y}q5.5 -4 11 0${' t11 0'.repeat(11)}`).join('');
  return (
    <svg className={`postmark ${className}`} viewBox="0 0 240 110" aria-hidden="true">
      <defs>
        <path id={`pm-ring-${id}`} d={`M55 55m-${r} 0a${r} ${r} 0 1 1 ${r * 2} 0a${r} ${r} 0 1 1 -${r * 2} 0`} />
      </defs>
      <circle className="postmark__line" cx="55" cy="55" r="47" />
      <circle className="postmark__line" cx="55" cy="55" r="32" />
      <text className="postmark__ring">
        <textPath href={`#pm-ring-${id}`} textLength={2 * Math.PI * r - 2} lengthAdjust="spacing">
          {phrase}
          {phrase}
        </textPath>
      </text>
      <text className="postmark__date" x="55" y="52" textAnchor="middle">
        {date}
      </text>
      <path className="postmark__star" d="M55 60l3.2 4.6 5.4-1.4-1.4 5.4 4.6 3.2-4.6 3.2 1.4 5.4-5.4-1.4L55 83.6l-3.2-4.6-5.4 1.4 1.4-5.4-4.6-3.2 4.6-3.2-1.4-5.4 5.4 1.4z" />
      <path className="postmark__waves" d={waves} />
    </svg>
  );
}

/**
 * An Indian commemorative stamp for Manas, cancelled with a Delhi NCR postmark.
 * Set `portrait` in data/profile.ts and the photo is printed in gold-and-maroon duotone;
 * until then the stamp carries an illustrated monogram.
 */
export function CommemorativeStamp() {
  const [photo, setPhoto] = useState<'pending' | 'ok' | 'none'>(portrait ? 'pending' : 'none');

  return (
    <div
      className="cstamp"
      role="img"
      aria-label={`Commemorative postage stamp: ${profile.first} ${profile.last}, ${profile.role}, cancelled at Delhi NCR`}
    >
      <div className="cstamp__tilt">
        <Stamp className="cstamp__stamp" hole={9}>
          <div className="cstamp__face">
            <div className="cstamp__rays" aria-hidden="true" />
            <div className="tx tx-halftone cstamp__dots" aria-hidden="true" />
            <p className="cstamp__country">
              <span lang="hi" className="cstamp__deva">
                भारत
              </span>{' '}
              <span>INDIA</span>
            </p>
            <p className="cstamp__denom">₹26</p>
            <div className={`cstamp__art ${photo === 'ok' ? 'has-photo' : ''}`}>
              {photo !== 'ok' && (
                <div className="cstamp__mono" aria-hidden="true">
                  <Rosette />
                  <span className="cstamp__mono-text">MT</span>
                </div>
              )}
              {portrait && photo !== 'none' && (
                <div className="cstamp__photo">
                  <img
                    src={portrait}
                    alt=""
                    onLoad={(e) => setPhoto(e.currentTarget.naturalWidth > 1 ? 'ok' : 'none')}
                    onError={() => setPhoto('none')}
                  />
                </div>
              )}
            </div>
            <p className="cstamp__caption">
              {profile.first} {profile.last} · {profile.role}
            </p>
          </div>
        </Stamp>
        <Postmark className="cstamp__postmark" />
      </div>
    </div>
  );
}
