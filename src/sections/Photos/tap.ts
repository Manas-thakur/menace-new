/**
 * Taps here act on pointerup (a click can be lost to the browser's double-tap window
 * after a drag). The click the browser still sends a moment later would then land on
 * whatever the tap just opened — the viewer — and close it again. Eat that one click.
 */
export function swallowNextClick(within = 500) {
  const eat = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
  };
  window.addEventListener('click', eat, { capture: true, once: true });
  window.setTimeout(() => window.removeEventListener('click', eat, { capture: true }), within);
}
