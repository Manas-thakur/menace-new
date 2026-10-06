import { useRef } from 'react';
import type { SectionProps } from '../../App';
import { Drawer } from '../../components/primitives/Drawer';
import { Marquee } from '../../components/primitives/Marquee';
import { gsap, useGSAP, SplitText } from '../../lib/gsap';
import { Draggable } from '../../lib/drag';
import { prefersReducedMotion } from '../../lib/motion';
import { drawerOf, onDrawerEnter } from '../../lib/enter';
import { profile, tapeLine, zones } from '../../data/profile';
import { StickerWall } from './StickerWall';
import './About.css';

// Where he is, and the three clocks he has shipped on.
const META = [profile.base.split(',')[0], ...zones.map((z) => z.tag)];

/**
 * ABOUT — the fusion statement and a laptop-lid sticker wall.
 * Studied from the reference's "Riot of Fusions" drawer: die-cut stickers over a
 * halftone peacock-feather field, a tilted tape marquee, huge worn letterpress type.
 */
export function About({ index }: SectionProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    (_ctx, contextSafe) => {
      const root = rootRef.current;
      const drawer = drawerOf(root);
      if (!root || !drawer || !contextSafe) return;

      const wall = root.querySelector<HTMLElement>('.about__wall');
      const slots = gsap.utils.toArray<HTMLElement>('.about__slot', root);
      const reduced = prefersReducedMotion();

      /* ── Drag: peel a sticker up, throw it, it settles where it lands ── */
      const mm = gsap.matchMedia();
      mm.add({ fine: '(hover: hover) and (pointer: fine)' }, (mmCtx) => {
        const fine = Boolean(mmCtx.conditions?.fine);
        let top = 20;
        const drags = slots.map((slot) => {
          const slap = slot.querySelector<HTMLElement>('.about__slap');
          return Draggable.create(slot, {
            // Touch: horizontal drag only, so vertical swipes still scroll the page.
            type: fine ? 'x,y' : 'x',
            allowNativeTouchScrolling: !fine,
            bounds: wall ?? undefined,
            inertia: !reduced,
            edgeResistance: 0.8,
            zIndexBoost: false,
            onPress() {
              slot.style.zIndex = String(++top);
              slot.classList.add('is-lifted');
              if (slap) gsap.to(slap, { scale: 1.06, duration: 0.25, ease: 'expoOut', overwrite: 'auto' });
            },
            onRelease() {
              slot.classList.remove('is-lifted');
              if (slap) gsap.to(slap, { scale: 1, duration: 0.4, ease: 'expoOut', overwrite: 'auto' });
            },
          })[0];
        });
        return () => drags.forEach((d) => d.kill());
      });

      if (reduced) return () => mm.revert();

      /* ── Entrance: stickers slap on, then the statement rises ── */
      const slaps = gsap.utils.toArray<HTMLElement>('.about__slap', root);
      const statement = root.querySelector<HTMLElement>('.about__statement');
      const split = statement ? SplitText.create(statement, { type: 'words', mask: 'words' }) : null;
      const bio = gsap.utils.toArray<HTMLElement>('.about__bio > *', root);

      gsap.set(slaps, { autoAlpha: 0, scale: 1.35, rotation: (i: number) => (i % 2 ? 12 : -12) });
      if (split) gsap.set(split.words, { yPercent: 110 });
      gsap.set(bio, { autoAlpha: 0, y: 18 });

      const play = contextSafe(() => {
        const tl = gsap.timeline();
        tl.to(slaps, { autoAlpha: 1, scale: 1, rotation: 0, duration: 0.55, ease: 'slap', stagger: 0.07 }, 0);
        if (split) tl.to(split.words, { yPercent: 0, duration: 0.85, ease: 'expoOut', stagger: 0.05 }, 0.2);
        tl.to(bio, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'expoOut', stagger: 0.06 }, 0.55);
      });
      const st = onDrawerEnter(drawer, play);

      return () => {
        st.kill();
        split?.revert();
        mm.revert();
      };
    },
    { scope: rootRef }
  );

  return (
    <Drawer id="about" index={index} label="About" className="about">
      {/* Worn letterpress: sparse speckled ink loss and a slight wobble (local, gentler than #distress) */}
      <svg className="about__defs" width="0" height="0" aria-hidden="true" focusable="false">
        <filter id="about-worn" x="-3%" y="-3%" width="106%" height="106%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="2" seed="17" result="speck" />
          <feColorMatrix in="speck" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -20 13.2" result="ink" />
          <feComposite in="SourceGraphic" in2="ink" operator="in" result="worn" />
          <feTurbulence type="fractalNoise" baseFrequency="0.022" numOctaves="2" seed="3" result="warp" />
          <feDisplacementMap in="worn" in2="warp" scale="3.5" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        {/* Phones: the same wear, sparser, so small type keeps its ink */}
        <filter id="about-worn-sm" x="-3%" y="-3%" width="106%" height="106%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="17" result="speck" />
          <feColorMatrix in="speck" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -24 16.8" result="ink" />
          <feComposite in="SourceGraphic" in2="ink" operator="in" result="worn" />
          <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="3" result="warp" />
          <feDisplacementMap in="worn" in2="warp" scale="2" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      <div className="about__bg about__bg--feather tx tx-feather" aria-hidden="true" />
      <div className="about__bg about__bg--scrim tx" aria-hidden="true" />

      <div className="about__tape">
        <Marquee items={tapeLine} variant="tape" tilt={-3.5} speed={46} />
      </div>

      <div ref={rootRef} className="about__root">
        <div className="about__copy">
          <h2 className="about__statement" aria-label="Think. Use tools. Finish the job.">
            <span className="about__line">Think.</span>
            <span className="about__line">Use tools.</span>
            <span className="about__line about__line--accent">Finish the job.</span>
          </h2>
          <div className="about__bio">
            <p className="about__lead">{profile.bio[0]}</p>
            <p>{profile.bio[1]}</p>
            <p>{profile.bio[2]}</p>
            <p className="about__meta">
              {META.map((m, i) => (
                <span key={m}>
                  {i > 0 && <span aria-hidden="true"> · </span>}
                  {m}
                </span>
              ))}
            </p>
          </div>
        </div>

        <div className="about__wall-wrap">
          <StickerWall />
        </div>
      </div>
    </Drawer>
  );
}
