import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { WebSocketServer, type WebSocket } from 'ws';
import {
  buyLotto,
  GameError,
  seasonOver,
  placeKlasOrder,
  buyFromStall,
  claimStall,
  ensureMarket,
  getState,
  join as joinMarket,
  login as loginPlayer,
  setPassword,
  migrate,
  moveItem,
  driveToStall,
  signPolicy,
  discardItem,
  fetchPaper,
  hangDevice,
  hangDecor,
  placeDecorOrder,
  takeDownDecor,
  togglePower,
  sellToRegular,
  answerOrder,
  pauseStory,
  stealDecor,
  dumpInOthersTrash,
  reportDumping,
  restartAfterBankruptcy,
  deliverOrder,
  stashItems,
  noteClock,
  setClock,
  devControl,
  setKettle,
  placeOrder,
  openDelivery,
  unpackBox,
  toggleSocket,
  toggleFuse,
  replaceFuse,
  setSign,
  setAutogiro,
  openSafe,
  lockSafe,
  writeNote,
  writeTickets,
  takeFromTrash,
  useLoupe,
  snoopStart,
  snoopTake,
  snoopSafe,
  snoopImprint,
  snoopLeave,
  snoopMove,
  snoopPlant,
  snoopForge,
  snoopRelabel,
  fixTampered,
  copyKey,
  buyCar,
  dumpTrash,
  renameFolderTab,
  renameBox,
  addDivider,
  closeCookieBox,
  renameBoxTab,
  loupeCell,
  loupeScan,
  setLook,
  dealerOrder,
  dealerSell,
  buyLicense,
  cutCoupon,
  answerGift,
  sellLead,
  helpBrowser,
  setOnline,
  setMaker,
  rollbackMeter,
  playerFromToken,
  setPrice,
  setFolder,
  setPlayer,
  unfoldBag,
  payBill,
  payAllBills,
  copyRecipe,
  cutWanted,
  relabel,
  tipPolice,
  tick,
} from './game.ts';
import type { Place } from '../shared/types.ts';

// I dev proxer Vite til 8787, uansett hva PORT er satt til.
const PORT = process.argv.includes('--dev') ? 8787 : Number(process.env.PORT ?? 8787);
const STATIC_DIR = 'dist';

ensureMarket();
migrate();

// ---------- HTTP ----------

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 10_000) throw new GameError('For stor forespørsel.');
  }
  return body ? JSON.parse(body) : {};
}

function send(res: ServerResponse, status: number, data: unknown) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function tokenOf(req: IncomingMessage): string | undefined {
  return req.headers.authorization?.replace(/^Bearer /, '');
}

// Feil innloggingsforsøk per IP-adresse (tidspunkter), så ingen kan prøve seg fram med passord.
const loginFails = new Map<string, number[]>();
const LOGIN_WINDOW = 10 * 60_000;
const LOGIN_MAX_FAILS = 10;

type Handler = (body: Record<string, unknown>, req: IncomingMessage) => unknown;

type Player = ReturnType<typeof playerFromToken>;

/** Handling som krever innlogging; varsler markedet etterpå. */
const action =
  (fn: (p: Player, b: Record<string, unknown>) => unknown): Handler =>
  (b, req) => {
    const p = playerFromToken(tokenOf(req));
    if (seasonOver(p)) throw new GameError('Julemarkedet er over for i år. God jul! 🎄');
    noteClock(p); // fanger strøm som har gått før handlingen (f.eks. en sikring som nå byttes)
    let result: unknown;
    try {
      result = fn(p, b);
    } finally {
      noteClock(p); // og strøm som handlingen selv tar (bryter, kontakt, sikring)
    }
    // Handlingen kan gi tilbake litt info (f.eks. hvor mange som ble flyttet).
    return { ...(result && typeof result === 'object' ? result : {}), marketId: p.market_id };
  };

const routes: Record<string, Handler> = {
  'POST /api/join': (b) => ({ token: joinMarket(String(b.name ?? ''), String(b.code ?? ''), String(b.password ?? '')) }),
  'POST /api/login': (b, req) => {
    const ip = req.socket.remoteAddress ?? '?';
    const now = Date.now();
    const f = (loginFails.get(ip) ?? []).filter((t) => now - t < LOGIN_WINDOW);
    if (f.length >= LOGIN_MAX_FAILS) throw new GameError('For mange feil forsøk. Vent noen minutter og prøv igjen.');
    try {
      const token = loginPlayer(String(b.name ?? ''), String(b.code ?? ''), String(b.password ?? ''));
      loginFails.delete(ip);
      return { token };
    } catch (err) {
      loginFails.set(ip, [...f, now]);
      throw err;
    }
  },
  'POST /api/password': (b, req) => {
    setPassword(playerFromToken(tokenOf(req)), String(b.password ?? ''), String(b.old ?? ''));
    return {};
  },
  'GET /api/state': (_b, req) => getState(playerFromToken(tokenOf(req))),
  'POST /api/claim': action((p, b) => claimStall(p, Number(b.slotIndex), String(b.stallName ?? ''))),
  'POST /api/stall/drive': action((p, b) => driveToStall(p, Number(b.stallId))),
  'POST /api/insurance/sign': action((p, b) => signPolicy(p, String(b.kind ?? ''))),
  'POST /api/klas/order': action((p, b) => placeKlasOrder(p, b.lines, b.mode === 'car' ? 'car' : b.mode === 'express' ? 'express' : 'standard', b.useShipCoupon !== false)),
  'POST /api/item/move': action((p, b) =>
    moveItem(p, Number(b.itemId), String(b.place) as Place, b.boxId == null ? null : Number(b.boxId), Number(b.x), Number(b.y)),
  ),
  'POST /api/paper/fetch': action((p) => fetchPaper(p)),
  'POST /api/bill/pay': action((p, b) => (b.all ? payAllBills(p) : payBill(p, Number(b.billId)))),
  'POST /api/device/hang': action((p, b) => hangDevice(p, Number(b.itemId ?? b.boxId))),
  'POST /api/decor/order': action((p, b) => placeDecorOrder(p, b.lines, b.mode === 'express' ? 'express' : 'standard', b.useShipCoupon !== false)),
  'POST /api/decor/hang': action((p, b) => hangDecor(p, Number(b.itemId))),
  'POST /api/decor/down': action((p, b) => takeDownDecor(p, String(b.slot ?? ''))),
  'POST /api/power/switch': action((p) => togglePower(p)),
  'POST /api/clock/set': action((p) => setClock(p)),
  'POST /api/shop/order': action((p, b) =>
    placeOrder(p, String(b.store), Array.isArray(b.lines) ? b.lines : [], b.mode === 'car' ? 'car' : b.mode === 'express' || b.express === true ? 'express' : 'standard', b.useCards !== false, b.useShipCoupon !== false),
  ),
  'POST /api/box/unpack': action((p, b) =>
    unpackBox(
      p,
      Number(b.boxId),
      b.to === 'counter' ? 'counter' : b.to === 'box' ? 'box' : 'storage',
      b.tab == null ? null : Number(b.tab),
      b.targetBox == null ? null : { boxId: Number(b.targetBox), tab: b.targetTab == null ? null : Number(b.targetTab) },
    ),
  ),
  'POST /api/delivery/open': action((p, b) => openDelivery(p, Number(b.itemId))),
  'POST /api/kettle': action((p, b) =>
    setKettle(p, Number(b.itemId), b.on === undefined ? undefined : !!b.on, b.level === undefined ? undefined : Number(b.level)),
  ),
  'POST /api/power/socket': action((p, b) =>
    toggleSocket(p, Number(b.index), b.strip == null ? null : Number(b.strip), typeof b.entry === 'string' ? b.entry : null),
  ),
  'POST /api/maker': action((p, b) =>
    setMaker(p, Number(b.itemId), b.on === undefined ? undefined : !!b.on, typeof b.program === 'string' ? b.program : undefined),
  ),
  'POST /api/order': action((p, b) => answerOrder(p, String(b.visitId ?? ''), !!b.accept)),
  'POST /api/story/pause': action((p, b) => pauseStory(p, String(b.id ?? ''), !!b.paused)),
  'POST /api/decor/steal': action((p, b) => stealDecor(p, Number(b.stallId), String(b.slot ?? ''))),
  'POST /api/restart': action((p) => restartAfterBankruptcy(p)),
  'POST /api/order/deliver': action((p, b) => deliverOrder(p, String(b.visitId ?? ''))),
  'POST /api/regular': action((p, b) => sellToRegular(p, String(b.visitId ?? ''), String(b.productId ?? ''), b.budget ? 'budget' : Number(b.pct ?? 0))),
  'POST /api/lead': action((p, b) => sellLead(p, String(b.leadId ?? ''), Number(b.pct ?? 0))),
  'POST /api/browse': action((p, b) => helpBrowser(p, String(b.leadId ?? ''), String(b.productId ?? ''))),
  'POST /api/autogiro': action((p, b) => setAutogiro(p, !!b.on)),
  'POST /api/license/buy': action((p) => buyLicense(p)),
  'POST /api/safe/open': action((p, b) => openSafe(p, Number(b.itemId), String(b.code ?? ''))),
  'POST /api/safe/lock': action((p, b) => lockSafe(p, Number(b.itemId))),
  'POST /api/note/write': action((p, b) => writeNote(p, b.kind === 'code' ? 'code' : 'text', String(b.text ?? ''))),
  'POST /api/note/tickets': action((p) => writeTickets(p)),
  'POST /api/trash/take': action((p, b) => takeFromTrash(p, Number(b.stallId), Number(b.itemId))),
  'POST /api/trash/put': action((p, b) => dumpInOthersTrash(p, Number(b.stallId), Number(b.itemId))),
  'POST /api/trash/report': action((p, b) => reportDumping(p, Number(b.itemId))),
  'POST /api/car/buy': action((p, b) => buyCar(p, String(b.car))),
  'POST /api/trash/dump': action((p) => dumpTrash(p)),
  'POST /api/cookiebox/close': action((p, b) => closeCookieBox(p, Number(b.itemId))),
  'POST /api/box/divider': action((p, b) => addDivider(p, Number(b.itemId))),
  'POST /api/box/tab': action((p, b) => renameBoxTab(p, Number(b.itemId), Number(b.tab), String(b.name ?? ''))),
  'POST /api/box/rename': action((p, b) => renameBox(p, Number(b.itemId), String(b.name ?? ''))),
  'POST /api/folder/rename': action((p, b) => renameFolderTab(p, Number(b.itemId), Number(b.tab), String(b.name ?? ''))),
  'POST /api/dealer/order': action((p, b) => dealerOrder(p, b.lines)),
  'POST /api/dealer/sell': action((p, b) => dealerSell(p, String(b.typeId ?? ''))),
  'POST /api/snoop/start': action((p, b) => snoopStart(p, Number(b.stallId))),
  'POST /api/snoop/take': action((p, b) => snoopTake(p, Number(b.stallId), Number(b.itemId))),
  'POST /api/snoop/safe': action((p, b) => snoopSafe(p, Number(b.stallId), Number(b.safeId), String(b.code ?? ''))),
  'POST /api/snoop/imprint': action((p, b) => snoopImprint(p, Number(b.stallId))),
  'POST /api/snoop/end': action((p) => snoopLeave(p)),
  'POST /api/snoop/move': action((p, b) => snoopMove(p, Number(b.stallId), Number(b.itemId), String(b.place), b.boxId == null ? null : Number(b.boxId), Number(b.x), Number(b.y))),
  'POST /api/snoop/plant': action((p, b) => snoopPlant(p, Number(b.stallId), Number(b.itemId), String(b.place), b.boxId == null ? null : Number(b.boxId), Number(b.x), Number(b.y))),
  'POST /api/snoop/forge': action((p, b) => snoopForge(p, Number(b.stallId), Number(b.itemId))),
  'POST /api/snoop/relabel': action((p, b) => snoopRelabel(p, Number(b.stallId), Number(b.itemId), String(b.as ?? ''))),
  'POST /api/item/fix': action((p, b) => fixTampered(p, Number(b.itemId))),
  'POST /api/key/copy': action((p, b) => copyKey(p, Number(b.itemId))),
  'POST /api/loupe/cell': action((p, b) => loupeCell(p, Number(b.x), Number(b.y))),
  'POST /api/loupe/scan': action((p, b) => loupeScan(p, b.cells)),
  'POST /api/look': action((p, b) => setLook(p, b.look)),
  'POST /api/loupe': action((p, b) => useLoupe(p, Number(b.stallId), String(b.productId ?? ''))),
  'POST /api/sign': action((p, b) => setSign(p, String(b.sign ?? ''))),
  'POST /api/fuse/replace': action((p, b) => replaceFuse(p, String(b.entry ?? ''))),
  'POST /api/fuse': action((p, b) => toggleFuse(p, String(b.entry ?? ''))),
  'POST /api/meter/rollback': action((p) => rollbackMeter(p)),
  'POST /api/folder': action((p, b) => setFolder(p, Number(b.itemId), !!b.on)),
  'POST /api/player': action((p, b) => setPlayer(p, Number(b.itemId), !!b.on)),
  'POST /api/bag/unfold': action((p, b) => unfoldBag(p, Number(b.itemId))),
  'POST /api/item/discard': action((p, b) => {
    discardItem(p, Number(b.itemId));
  }),
  'POST /api/item/stash': action((p, b) => ({
    moved: stashItems(p, String(b.typeId ?? ''), b.to === 'storage' ? 'storage' : b.to === 'box' ? 'box' : 'counter', b.boxId == null ? null : Number(b.boxId), b.qty == null ? 9999 : Number(b.qty), b.tab == null ? null : Number(b.tab)),
  })),
  'POST /api/paper/recipe': action((p, b) => copyRecipe(p, Number(b.edition), b.which === 'machine' ? 'machine' : 'kettle')),
  'POST /api/paper/coupon': action((p, b) => cutCoupon(p, Number(b.edition), Number(b.index))),
  'POST /api/gift': action((p, b) => answerGift(p, !!b.accept)),
  'POST /api/paper/cut': action((p, b) => cutWanted(p, Number(b.edition))),
  'POST /api/label': action((p, b) => ({ label: relabel(p, Number(b.itemId)) })),
  'POST /api/police/tip': action((p, b) => tipPolice(p, String(b.seed ?? ''))),
  'POST /api/lotto/buy': action((p, b) => buyLotto(p, b.nums, Number(b.quick ?? 0))),
  'POST /api/price': action((p, b) => setPrice(p, String(b.productId), Number(b.price), b.homemade === true)),
  'POST /api/buy': action((p, b) => buyFromStall(p, Number(b.stallId), String(b.productId), Number(b.qty), typeof b.homemade === 'boolean' ? b.homemade : undefined)),
};

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

async function serveStatic(path: string, res: ServerResponse) {
  const safe = normalize(path).replace(/^(\.\.[/\\])+/, '');
  const file = join(STATIC_DIR, safe === '/' || safe === '\\' ? 'index.html' : safe);
  try {
    const data = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(data);
  } catch {
    try {
      const data = await readFile(join(STATIC_DIR, 'index.html'));
      res.writeHead(200, { 'content-type': MIME['.html'] });
      res.end(data);
    } catch {
      res.writeHead(404).end('Ikke funnet. Kjør «npm run build», eller bruk «npm run dev».');
    }
  }
}

// Dev-panelet i klienten: fart, klokkeslett og vær. Finnes bare når serveren kjører med --dev.
if (process.argv.includes('--dev')) routes['POST /api/dev'] = action((p, b) => devControl(p, b));

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://x');
  const handler = routes[`${req.method} ${url.pathname}`];
  if (!handler) {
    if (url.pathname.startsWith('/api/')) return send(res, 404, { error: 'Ukjent endepunkt.' });
    return serveStatic(url.pathname, res);
  }
  try {
    const body = req.method === 'POST' ? await readJson(req) : {};
    const result = handler(body, req);
    send(res, 200, result ?? {});
    const marketId = (result as { marketId?: number } | undefined)?.marketId;
    if (marketId) broadcast(marketId);
  } catch (err) {
    if (err instanceof GameError) return send(res, 400, { error: err.message });
    console.error(err);
    send(res, 500, { error: 'Noe gikk galt på serveren.' });
  }
});

// ---------- WebSocket: varsler klientene om at noe har endret seg ----------

const wss = new WebSocketServer({ server, path: '/ws' });
const sockets = new Map<WebSocket, number>();

wss.on('connection', (ws, req) => {
  const token = new URL(req.url ?? '', 'http://x').searchParams.get('token') ?? undefined;
  let playerId: number;
  try {
    const p = playerFromToken(token);
    playerId = p.id;
    sockets.set(ws, p.market_id);
  } catch {
    ws.close(4001, 'unauthorized');
    return;
  }
  setOnline(playerId, 1); // står bak disken så lenge nettleseren er åpen
  ws.on('close', () => {
    sockets.delete(ws);
    setOnline(playerId, -1);
  });
});

function broadcast(marketId: number) {
  const msg = JSON.stringify({ type: 'update' });
  for (const [ws, m] of sockets) if (m === marketId && ws.readyState === ws.OPEN) ws.send(msg);
}

setInterval(() => {
  try {
    for (const marketId of tick()) broadcast(marketId);
  } catch (err) {
    console.error('Feil i tick:', err);
  }
}, 1000);

server.listen(PORT, () => console.log(`Julemarked-server på http://localhost:${PORT}`));
