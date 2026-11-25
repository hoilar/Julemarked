// Finlandshetta fra Fyren bak containeren. Tas på (og av) i speilet på bilen, og tegnes som SVG over figuren
// din (DiceBear «Micah», samme lerret som tilbehøret i shared/portrait.ts: 360 × 360, hodet ca. y 45–250).
// Med hetta på kjenner ingen deg igjen: lavere risiko når du snoker eller stjeler pynt, og ingen får vite
// hvem det var hvis du blir tatt. Men kundene blir skremt av en selger i finlandshette.
// Alle tallene her er ment å være lette å justere.

export const BALACLAVA_ID = 'finlandshette';
/** Risikoen for å bli tatt (snoking og pyntetyveri) ganges med dette når du har hetta på. */
export const BALACLAVA_RISK = 0.5;
/** Kundene ved din egen bod (når du står bak disken) ganges med dette når du har hetta på. */
export const BALACLAVA_CROWD = 0.5;

const LINE = 'stroke="#000" stroke-width="5" stroke-linejoin="round"';

/** Hetta som SVG-elementer på Micah-lerretet (legges sist, over ansiktet). Øyesprekken er et hull. */
export const BALACLAVA_SVG = `<g>
<path fill-rule="evenodd" d="M182 22 C 110 22, 78 78, 80 150 C 82 210, 96 262, 112 300 L 252 300 C 268 262, 284 210, 286 150 C 288 78, 254 22, 182 22 Z
 M118 132 C 150 120, 214 120, 248 132 C 252 150, 250 168, 246 180 C 214 190, 150 190, 120 180 C 116 168, 114 150, 118 132 Z" fill="#26262b" ${LINE}/>
<path d="M100 92 C 150 70, 214 70, 266 92 M92 218 C 150 236, 214 236, 274 218 M100 262 C 150 278, 214 278, 264 262" fill="none" stroke="#3a3a42" stroke-width="6"/>
<path d="M112 300 L 252 300 L 262 330 L 102 330 Z" fill="#1d1d22" ${LINE}/>
</g>`;

/** Hetta alene (ikonet under disken og hos Fyren). */
export const BALACLAVA_ICON = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="70 12 226 326">${BALACLAVA_SVG}</svg>`,
)}`;

/** Legger hetta over en ferdig Micah-SVG. */
export const withBalaclava = (svg: string) => svg.replace(/<\/svg>\s*$/, `${BALACLAVA_SVG}</svg>`);
