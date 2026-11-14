import { readFile } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';

function varekatalog(): Plugin {
  const repo = dirname(fileURLToPath(import.meta.url));
  const graphics = resolve(repo, 'GFX_assets/planlagte');
  const documents = new Set(['/GRAFIKK.md', '/VARELISTE.md', '/VAREPLAN.md', '/julemarked_simulator_konsept.md']);
  const imageTypes: Record<string, string> = {
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp',
  };
  return {
    name: 'varekatalog',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        let path: string;
        try { path = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname); }
        catch { res.statusCode = 400; res.end(); return; }
        const catalog = ['/vareliste', '/vareliste/', '/vareliste.html'].includes(path);
        let file: string;
        let contentType: string;
        if (catalog) {
          file = resolve(repo, 'vareliste.html');
          contentType = 'text/html; charset=utf-8';
        } else if (documents.has(path)) {
          file = resolve(repo, path.slice(1));
          contentType = 'text/plain; charset=utf-8';
        } else if (path.startsWith('/GFX_assets/planlagte/')) {
          file = resolve(repo, path.slice(1));
          contentType = imageTypes[extname(file).toLowerCase()];
          if (!file.startsWith(graphics + sep) || !contentType) { res.statusCode = 404; res.end(); return; }
        } else { next(); return; }
        try {
          const data = await readFile(file);
          res.setHeader('Content-Type', contentType);
          res.setHeader('Cache-Control', 'no-cache');
          // Keep the standalone file intact; adapt its relative links for the game server.
          res.end(catalog ? data.toString('utf8').replace(/(<html\b[^>]*>)/i, '$1\n<base href="/">').replaceAll('client/public/art/', 'art/') : data);
        } catch { res.statusCode = 404; res.end('Fant ikke filen.'); }
      });
    },
  };
}

export default defineConfig({
  plugins: [varekatalog()],
  root: 'client',
  build: { outDir: '../dist', emptyOutDir: true },
  server: {
    port: 5173,
    host: true, // også tilgjengelig fra andre enheter på lokalnettet (telefon)
    proxy: {
      '/api': 'http://localhost:8787',
      '/ws': { target: 'ws://localhost:8787', ws: true },
    },
  },
});
