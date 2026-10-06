// Cream shapes for the Community drawer, drawn in a 0–100 box and stretched
// (preserveAspectRatio="none") over their containers, so the waves always hug
// the content instead of a fixed pixel layout.

/** Wide screens: blob behind the intro column, wave on its right and bottom edges.
 *  The text never crosses x > 86 or y > 87, so the waves stay in the bleed. */
export const BLOB_WIDE =
  'M0 0H97C101 12 88 20 91 34C94 48 100 56 96 68C92 80 98 86 90 93C80 101 60 94 44 97C28 100 12 96 0 99Z';

/** Narrow screens: full-width blob with a wave along the bottom only. */
export const BLOB_NARROW =
  'M0 0H100V90C88 97 76 86 62 92C48 98 34 88 20 93C12 96 6 94 0 92Z';

/** The road the auto parks on: flat where it stands (left), easing up to the right. */
export const ROAD = 'M0 46C18 44 34 48 48 45C62 42 70 30 84 27C92 25 96 28 100 26V100H0Z';

/** A path as a CSS mask image. */
export const maskUri = (d: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'><path d='${d}'/></svg>`
  )}")`;
