import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { CustomEase } from 'gsap/CustomEase';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase, useGSAP);

// Named eases mirroring the CSS tokens so JS and CSS motion share one voice.
CustomEase.create('riot', '0.2, 0.8, 0.2, 1');
CustomEase.create('expoOut', '0.16, 1, 0.3, 1');
CustomEase.create('slap', '0.2, 0.9, 0.3, 1.2');

gsap.defaults({ ease: 'expoOut', duration: 0.9 });

export { gsap, ScrollTrigger, SplitText, useGSAP };
