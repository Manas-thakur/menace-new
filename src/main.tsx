import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './styles/base.css';
import './styles/textures.css';
import './components/primitives/Drawer.css';
import './components/primitives/Marquee.css';
import './components/primitives/Print.css';
import App from './App';
import { ignoreStillPointers } from './lib/intent';

ignoreStillPointers();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// For whoever opens the console.
const token = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
console.log(
  '%cSide A is what I show.\n%cSide B is what I mean.',
  `font: 700 15px ${token('--font-serif')}; color: ${token('--color-gold')}`,
  `font: 700 15px ${token('--font-serif')}; color: ${token('--color-signal')}`
);
console.log('Nine deep cuts are pressed into this record. You found the console — this one is on the house.\nThe source: https://github.com/Manas-thakur/menace-new');
console.log(
  'The arch is a window onto Delhi: its sky is the sky over the city right now — the sun where it really is, tonight’s moon in its real phase. (?sky=dawn, day, dusk or night to look at another hour.)'
);
