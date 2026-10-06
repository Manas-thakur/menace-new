import { gsap } from './gsap';
import { Draggable } from 'gsap/Draggable';
import { InertiaPlugin } from 'gsap/InertiaPlugin';

// Only the sticker wall and the radio knob drag, so these plugins live in their
// lazily-loaded chunks instead of the main bundle.
gsap.registerPlugin(Draggable, InertiaPlugin);

export { Draggable };
