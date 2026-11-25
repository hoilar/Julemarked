// Lastestolpen: vises mens boden hentes og bildene til første skjermbilde lastes.
// Den kommer først til syne etter et lite øyeblikk (CSS), så den aldri blinker når alt ligger i cachen.
// Etterpå hentes resten av grafikken i bakgrunnen, så den er klar når spilleren trenger den.

const MAX_WAIT_MS = 20_000; // aldri vent lenger enn dette på første skjermbilde
const BACKGROUND_PARALLEL = 3;

let el: HTMLElement | null = null;

function ensure(): HTMLElement {
  if (el) return el;
  el = document.createElement('div');
  el.className = 'loader';
  el.setAttribute('role', 'progressbar');
  el.setAttribute('aria-valuemin', '0');
  el.setAttribute('aria-valuemax', '100');
  el.innerHTML = `<div class="loader-card">
      <h1>🎄 Julemarked Simulator</h1>
      <div class="loader-bar"><span></span></div>
      <p class="loader-text"></p>
    </div>`;
  document.body.append(el);
  return el;
}

/** Vis (eller oppdater) lastestolpen. frac = null: venter på noe vi ikke kan måle ennå. */
export function setLoader(text: string, frac: number | null = null) {
  const l = ensure();
  l.classList.remove('done');
  l.querySelector('.loader-text')!.textContent = text;
  const bar = l.querySelector<HTMLElement>('.loader-bar')!;
  bar.classList.toggle('busy', frac === null);
  bar.querySelector('span')!.style.width = `${Math.round((frac ?? 0) * 100)}%`;
  if (frac !== null) l.setAttribute('aria-valuenow', String(Math.round(frac * 100)));
}

export function hideLoader() {
  if (!el) return;
  const l = el;
  el = null;
  l.classList.add('done');
  l.addEventListener('transitionend', () => l.remove(), { once: true });
  setTimeout(() => l.remove(), 600); // også når overgangen ikke kjører (skjult fane)
}

const loaded = new Set<string>();

function loadImage(url: string): Promise<void> {
  if (loaded.has(url)) return Promise.resolve();
  return new Promise((resolve) => {
    const img = new Image();
    const done = () => {
      loaded.add(url);
      resolve();
    };
    img.onload = done;
    img.onerror = done; // et bilde som mangler, skal ikke stoppe spillet
    img.src = url;
  });
}

/** Alle bilder som brukes i et utsnitt av siden: <img> og bakgrunns- og maskebilder i CSS. */
export function imagesIn(root: ParentNode): string[] {
  const urls = new Set<string>();
  for (const img of root.querySelectorAll('img')) if (img.src) urls.add(img.src);
  for (const node of root.querySelectorAll<HTMLElement>('*')) {
    const cs = getComputedStyle(node);
    for (const v of [cs.backgroundImage, cs.maskImage, cs.getPropertyValue('-webkit-mask-image')]) {
      if (!v || v === 'none') continue;
      for (const m of v.matchAll(/url\(["']?([^"')]+)["']?\)/g)) urls.add(m[1]);
    }
  }
  return [...urls].filter((u) => !u.startsWith('data:'));
}

/** Last bildene med lastestolpe. Ferdig når alle er hentet (eller feilet), eller etter MAX_WAIT_MS. */
export async function preloadWithBar(urls: string[], text: string): Promise<void> {
  const list = [...new Set(urls)];
  let n = list.filter((u) => loaded.has(u)).length;
  const update = () => setLoader(`${text} (${n} av ${list.length})`, list.length ? n / list.length : 1);
  update();
  const all = Promise.all(
    list
      .filter((u) => !loaded.has(u))
      .map((u) =>
        loadImage(u).then(() => {
          n++;
          update();
        }),
      ),
  );
  await Promise.race([all, new Promise((r) => setTimeout(r, MAX_WAIT_MS))]);
}

/** Hent resten av grafikken stille, noen få om gangen, så den ikke stjeler båndbredde fra spillet. */
export function preloadInBackground(urls: string[]) {
  const queue = [...new Set(urls)].filter((u) => !loaded.has(u));
  const next = (): Promise<void> => {
    const u = queue.shift();
    return u ? loadImage(u).then(next) : Promise.resolve();
  };
  for (let i = 0; i < BACKGROUND_PARALLEL; i++) void next();
}
