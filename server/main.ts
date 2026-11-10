import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { WebSocketServer, type WebSocket } from 'ws';
import {
  GameError,
  autoMove,
  buy,
  buyFromStall,
  claimStall,
  ensureMarket,
  getState,
  join as joinMarket,
  migrate,
  moveItem,
  moveStall,
  signPolicy,
  discardItem,
  fetchPaper,
  buyDevice,
  togglePower,
  setKettle,
  placeOrder,
  openDelivery,
  unpackBox,
  toggleSocket,
  toggleFuse,
  replaceFuse,
  setSign,
  setAutogiro,
  cutCoupon,
  answerGift,
  sellLead,
  setOnline,
  setMaker,
  rollbackMeter,
  playerFromToken,
  setPrice,
  setFolder,
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

type Handler = (body: Record<string, unknown>, req: IncomingMessage) => unknown;

type Player = ReturnType<typeof playerFromToken>;

/** Handling som krever innlogging; varsler markedet etterpå. */
const action =
  (fn: (p: Player, b: Record<string, unknown>) => unknown): Handler =>
  (b, req) => {
    const p = playerFromToken(tokenOf(req));
    const result = fn(p, b);
    // Handlingen kan gi tilbake litt info (f.eks. hvor mange som ble flyttet).
    return { ...(result && typeof result === 'object' ? result : {}), marketId: p.market_id };
  };

const routes: Record<string, Handler> = {
  'POST /api/join': (b) => ({ token: joinMarket(String(b.name ?? ''), String(b.code ?? '')) }),
  'GET /api/state': (_b, req) => getState(playerFromToken(tokenOf(req))),
  'POST /api/claim': action((p, b) => claimStall(p, Number(b.slotIndex), String(b.stallName ?? ''))),
  'POST /api/stall/move': action((p, b) => moveStall(p, Number(b.slotIndex))),
  'POST /api/insurance/sign': action((p, b) => signPolicy(p, String(b.kind ?? ''))),
  'POST /api/buy-supplies': action((p, b) => buy(p, String(b.typeId), Number(b.qty))),
  'POST /api/item/move': action((p, b) =>
    moveItem(p, Number(b.itemId), String(b.place) as Place, b.boxId == null ? null : Number(b.boxId), Number(b.x), Number(b.y)),
  ),
  'POST /api/paper/fetch': action((p) => fetchPaper(p)),
  'POST /api/bill/pay': action((p, b) => (b.all ? payAllBills(p) : payBill(p, Number(b.billId)))),
  'POST /api/device/buy': action((p, b) => buyDevice(p, String(b.deviceId))),
  'POST /api/power/switch': action((p) => togglePower(p)),
  'POST /api/shop/order': action((p, b) =>
    placeOrder(p, String(b.store), Array.isArray(b.lines) ? b.lines : [], !!b.express, b.useCards !== false),
  ),
  'POST /api/box/unpack': action((p, b) => unpackBox(p, Number(b.boxId), b.to === 'counter' ? 'counter' : 'storage')),
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
  'POST /api/lead': action((p, b) => sellLead(p, String(b.leadId ?? ''))),
  'POST /api/autogiro': action((p, b) => setAutogiro(p, !!b.on)),
  'POST /api/sign': action((p, b) => setSign(p, String(b.sign ?? ''))),
  'POST /api/fuse/replace': action((p, b) => replaceFuse(p, String(b.entry ?? ''))),
  'POST /api/fuse': action((p, b) => toggleFuse(p, String(b.entry ?? ''))),
  'POST /api/meter/rollback': action((p) => rollbackMeter(p)),
  'POST /api/folder': action((p, b) => setFolder(p, Number(b.itemId), !!b.on)),
  'POST /api/bag/unfold': action((p, b) => unfoldBag(p, Number(b.itemId))),
  'POST /api/item/discard': action((p, b) => {
    discardItem(p, Number(b.itemId));
  }),
  'POST /api/item/auto':action((p, b) => {
    autoMove(p, String(b.productId), b.to === 'storage' ? 'storage' : 'counter', Number(b.qty));
  }),
  'POST /api/paper/recipe': action((p, b) => copyRecipe(p, Number(b.edition), b.which === 'machine' ? 'machine' : 'kettle')),
  'POST /api/paper/coupon': action((p, b) => cutCoupon(p, Number(b.edition), Number(b.index))),
  'POST /api/gift': action((p, b) => answerGift(p, !!b.accept)),
  'POST /api/paper/cut': action((p, b) => cutWanted(p, Number(b.edition))),
  'POST /api/label': action((p, b) => ({ changed: relabel(p, String(b.productId), b.to === 'store' ? 'store' : 'home') })),
  'POST /api/police/tip': action((p, b) => tipPolice(p, String(b.seed ?? ''))),
  'POST /api/price': action((p, b) => setPrice(p, String(b.productId), Number(b.price))),
  'POST /api/buy': action((p, b) => buyFromStall(p, Number(b.stallId), String(b.productId), Number(b.qty))),
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
