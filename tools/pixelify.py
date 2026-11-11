#!/usr/bin/env python3
"""
pixelify.py - gjor AI-genererte bilder om til "ekte" pixel art for Julemarked.

Pipeline:
  1. area-nedskaler til lav intern oppl. (fjerner blur ved aa snitte, ikke plukke)
  2. perseptuell palett-remap (Lab/naermeste) mot kanonisk palett (tools/palett.json)
  3. alfa-terskel (binariser gjennomsiktighet, fjerner myke kantpiksler)
  4. nearest-opp til visningsstorrelse (harde, like store piksler)

Bruk:
  # enkeltfil (input er allerede spillstorrelse, 128 px/rute):
  python tools/pixelify.py inn.png ut.png
  # stor original -> spillfil, oppgi rutenett:
  python tools/pixelify.py GFX/stor.png client/public/art/goods/vare.png --rute 2x2
  # velg palett manuelt (ellers auto etter mappe/fil):
  python tools/pixelify.py inn.png ut.png --palett noytral
  # chunky-nivaa (lavere intern res = grovere):  --div 4 (default 2 = 64 px/rute)
  # hel mappe (speiler treet, auto-palett, hopper over bg/ og .jpg):
  python tools/pixelify.py --batch GFX_assets/ChatGPT client/public/art
  # eksporter palett-swatcher til referanse:
  python tools/pixelify.py --swatches tools

Krever: Pillow + numpy.
"""
import argparse, json, os, sys
from pathlib import Path
import numpy as np
from PIL import Image

HER = Path(__file__).resolve().parent
PALETT = json.loads((HER / "palett.json").read_text(encoding="utf-8"))

# ---------- farge ----------
def hex2rgb(h):
    h = h.lstrip("#")
    return [int(h[i:i+2], 16) for i in (0, 2, 4)]

def pal_rgb(navn):
    return np.array([hex2rgb(h) for h in PALETT[navn]], dtype=np.float64)

def srgb2lin(c):
    c = c / 255.0
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)

def rgb2lab(rgb):
    lin = srgb2lin(np.asarray(rgb, dtype=np.float64))
    M = np.array([[0.4124, 0.3576, 0.1805],
                  [0.2126, 0.7152, 0.0722],
                  [0.0193, 0.1192, 0.9505]])
    xyz = lin @ M.T / np.array([0.95047, 1.0, 1.08883])
    d = 6 / 29
    f = np.where(xyz > d ** 3, np.cbrt(xyz), xyz / (3 * d * d) + 4 / 29)
    return np.stack([116 * f[..., 1] - 16,
                     500 * (f[..., 0] - f[..., 1]),
                     200 * (f[..., 1] - f[..., 2])], axis=-1)

_LAB_CACHE = {}
def palett_lab(navn):
    if navn not in _LAB_CACHE:
        _LAB_CACHE[navn] = (pal_rgb(navn), rgb2lab(pal_rgb(navn)))
    return _LAB_CACHE[navn]

def remap(rgb_arr, navn):
    prgb, plab = palett_lab(navn)
    flat = rgb_arr.reshape(-1, 3)
    lab = rgb2lab(flat)
    d = ((lab[:, None, :] - plab[None, :, :]) ** 2).sum(-1)
    return prgb[d.argmin(1)].astype(np.uint8).reshape(rgb_arr.shape)

# ---------- materialrekker ----------
# Vekter i Lab naar rekka velges: fargetone/metning teller mest, lyshet lite (lysheten er jo
# det rekka selv dekker). Inne i rekka velges trinnet med vanlig Lab-avstand.
W_VELG = np.array([0.35, 1.0, 1.0])

def rekke_lab(navn):
    key = ("rekke", navn)
    if key not in _LAB_CACHE:
        rgb = np.array([hex2rgb(h) for h in PALETT["rekker"][navn]], dtype=np.float64)
        _LAB_CACHE[key] = (rgb, rgb2lab(rgb))
    return _LAB_CACHE[key]

def avstand_til_rekke(lab, rlab):
    """Avstand fra hver piksel til polylinja gjennom rekka (vektet Lab)."""
    P = lab * W_VELG
    R = rlab * W_VELG
    if len(R) == 1:
        return ((P - R[0]) ** 2).sum(-1)
    A, B = R[:-1], R[1:]
    AB = B - A
    t = ((P[:, None, :] - A[None]) * AB[None]).sum(-1) / np.maximum((AB ** 2).sum(-1), 1e-9)[None]
    t = np.clip(t, 0, 1)
    Q = A[None] + t[..., None] * AB[None]
    return ((P[:, None, :] - Q) ** 2).sum(-1).min(1)

def glatt_flater(rgb, mask, runder, sigma=7.0):
    """Kantbevarende utjevning: snitter 3x3-naboer som ligner (Lab), saa smaa flekker paa
    rolige flater forsvinner mens skarpe kanter staar."""
    if runder <= 0:
        return rgb
    lab = rgb2lab(rgb.astype(np.float64))
    cur = rgb.astype(np.float64)
    h, w = mask.shape
    for _ in range(runder):
        acc = np.zeros_like(cur); wsum = np.zeros((h, w))
        padc = np.pad(cur, ((1, 1), (1, 1), (0, 0)), mode="edge")
        padl = np.pad(lab, ((1, 1), (1, 1), (0, 0)), mode="edge")
        padm = np.pad(mask, 1, mode="constant")
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                c = padc[1 + dy:1 + dy + h, 1 + dx:1 + dx + w]
                l = padl[1 + dy:1 + dy + h, 1 + dx:1 + dx + w]
                m = padm[1 + dy:1 + dy + h, 1 + dx:1 + dx + w]
                wt = np.exp(-((l - lab) ** 2).sum(-1) / (2 * sigma * sigma)) * m
                acc += c * wt[..., None]; wsum += wt
        cur = np.where(mask[..., None], acc / np.maximum(wsum, 1e-9)[..., None], cur)
        lab = rgb2lab(cur)
    return np.clip(cur, 0, 255)

def flertall_filter(lab_idx, mask, grense=6):
    """Rekkevalg som avviker fra minst `grense` av 8 naboer, tar naboenes valg (mindre prikkete)."""
    h, w = lab_idx.shape
    pad = np.pad(lab_idx, 1, constant_values=-1)
    stack = np.stack([pad[1 + dy:1 + dy + h, 1 + dx:1 + dx + w]
                      for dy in (-1, 0, 1) for dx in (-1, 0, 1) if dy or dx])
    out = lab_idx.copy()
    for k in np.unique(lab_idx[mask]):
        cnt = (stack == k).sum(0)
        flip = mask & (lab_idx != k) & (cnt >= grense)
        out[flip] = k
    return out

def fjern_oyer(idx, mask, minste):
    """Sammenhengende flekker (4-nabo) mindre enn `minste` piksler faar fargen rundt seg."""
    if minste <= 1:
        return idx
    h, w = idx.shape
    sett = np.zeros((h, w), bool)
    out = idx.copy()
    for y0 in range(h):
        for x0 in range(w):
            if sett[y0, x0] or not mask[y0, x0]:
                continue
            k = idx[y0, x0]; stk = [(y0, x0)]; sett[y0, x0] = True; comp = []
            while stk:
                y, x = stk.pop(); comp.append((y, x))
                for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                    if 0 <= ny < h and 0 <= nx < w and not sett[ny, nx] and mask[ny, nx] and idx[ny, nx] == k:
                        sett[ny, nx] = True; stk.append((ny, nx))
            if len(comp) >= minste:
                continue
            nab = {}
            cs = set(comp)
            for y, x in comp:
                for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                    if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and (ny, nx) not in cs:
                        nab[idx[ny, nx]] = nab.get(idx[ny, nx], 0) + 1
            if nab:
                ny = max(nab, key=nab.get)
                for y, x in comp:
                    out[y, x] = ny
    return out

def remap_material(rgb, mask, cfg):
    """Rekke foerst (fargetone), saa trinn (lyshet). Returnerer RGB."""
    navn = ["kontur"] + [r for r in cfg.get("rekker", list(PALETT["rekker"])) if r != "kontur"]
    rgb = glatt_flater(rgb, mask, cfg.get("glatt", 1))
    h, w = mask.shape
    lab = rgb2lab(rgb.astype(np.float64)).reshape(-1, 3)
    d = np.stack([avstand_til_rekke(lab, rekke_lab(n)[1]) for n in navn], 1)
    valg = d.argmin(1).reshape(h, w)
    valg = flertall_filter(valg, mask)
    # felles fargeliste: indeks = (rekke, trinn)
    farger, flat_lab, start = [], [], {}
    for i, n in enumerate(navn):
        r, l = rekke_lab(n); start[i] = len(farger); farger.extend(r); flat_lab.extend(l)
    farger = np.array(farger); flat_lab = np.array(flat_lab)
    idx = np.zeros(h * w, int)
    vflat = valg.reshape(-1)
    for i, n in enumerate(navn):
        sel = vflat == i
        if not sel.any():
            continue
        rl = rekke_lab(n)[1]
        dd = ((lab[sel][:, None, :] - rl[None]) ** 2).sum(-1)
        idx[sel] = start[i] + dd.argmin(1)
    idx = fjern_oyer(idx.reshape(h, w), mask, cfg.get("oy", 2))
    return farger[idx].astype(np.uint8)

def material_cfg(*paths):
    m = PALETT.get("materialer", {})
    for p in paths:
        if p and Path(p).name.lower() in m:
            return m[Path(p).name.lower()]
    return None

# ---------- pipeline ----------
def pixelify(im, navn, div=2, rute=None, alfa_terskel=128, cfg=None):
    im = im.convert("RGBA")
    if rute:
        disp = (128 * rute[0], 128 * rute[1])
    else:
        disp = im.size
    internal = (max(1, disp[0] // div), max(1, disp[1] // div))
    small = im.resize(internal, Image.LANCZOS)          # 1) area-nedskaler
    arr = np.array(small)
    mask = arr[..., 3] >= alfa_terskel                  # 3) alfa-terskel
    if navn == "material":                              # 2) palett-remap
        rgb = remap_material(arr[..., :3], mask, cfg or {})
    else:
        rgb = remap(arr[..., :3], navn)
    out = np.dstack([rgb, np.where(mask, 255, 0).astype(np.uint8)])
    return Image.fromarray(out, "RGBA").resize(disp, Image.NEAREST)  # 4) nearest-opp

# ---------- auto-palett etter sti ----------
def velg_palett(*paths):
    """Material hvis fila har oppsett i 'materialer', ellers noytral hvis EN av stiene
    (input/output) peker paa en noytral mappe/fil, ellers varm."""
    if material_cfg(*paths):
        return "material"
    nmapper = set(PALETT["noytral_mapper"])
    nfiler = set(f.lower() for f in PALETT["noytral_filer"])
    for rel_path in paths:
        if not rel_path:
            continue
        p = Path(rel_path)
        if set(part.lower() for part in p.parts) & nmapper:
            return "noytral"
        if p.name.lower() in nfiler:
            return "noytral"
    return "varm"

def skal_hoppes_over(rel_path):
    p = Path(rel_path)
    if p.suffix.lower() != ".png":
        return True
    if set(part.lower() for part in p.parts) & set(PALETT["hopp_over_mapper"]):
        return True
    return False

# ---------- swatcher ----------
def eksporter_swatcher(utdir):
    from PIL import ImageDraw, ImageFont
    try:
        F = ImageFont.truetype("arialbd.ttf", 14)
    except Exception:
        F = ImageFont.load_default()
    utdir = Path(utdir); utdir.mkdir(parents=True, exist_ok=True)
    for navn in ("varm", "noytral"):
        pal = PALETT[navn]; cols = 16; sw = 32
        rows = (len(pal) + cols - 1) // cols
        img = Image.new("RGB", (cols * sw + 2, 24 + rows * sw + 2), (34, 30, 26))
        d = ImageDraw.Draw(img)
        d.text((4, 4), f"{navn} ({len(pal)})", fill=(244, 236, 210), font=F)
        for i, h in enumerate(pal):
            r, c = divmod(i, cols)
            x, y = 1 + c * sw, 24 + r * sw
            d.rectangle([x, y, x + sw - 2, y + sw - 2], fill=h, outline=(60, 56, 50))
        f = utdir / f"palett-{navn}.png"
        img.save(f); print("skrev", f)

# ---------- cli ----------
def main():
    ap = argparse.ArgumentParser(description="Fake ekte pixel art mot kanonisk palett.")
    ap.add_argument("input", nargs="?")
    ap.add_argument("output", nargs="?")
    ap.add_argument("--palett", choices=["auto", "varm", "noytral", "material"], default="auto")
    ap.add_argument("--div", type=int, default=2, help="2=64px/rute (default), 4=32px/rute (grovt)")
    ap.add_argument("--rute", help="rutenett WxH for stor original, f.eks. 2x2")
    ap.add_argument("--batch", nargs=2, metavar=("SRC", "DST"))
    ap.add_argument("--swatches", metavar="DIR")
    a = ap.parse_args()

    if a.swatches:
        eksporter_swatcher(a.swatches); return

    def parse_rute(s):
        if not s: return None
        w, h = s.lower().split("x"); return (int(w), int(h))

    if a.batch:
        src, dst = map(Path, a.batch)
        maks = PALETT.get("maks_dim", 0)
        n = hoppet = 0
        for f in src.rglob("*.png"):
            rel = f.relative_to(src)
            if skal_hoppes_over(rel):
                continue
            im = Image.open(f)
            if maks and max(im.size) > maks:
                hoppet += 1
                print(f"  [stor, hoppet over] {rel}  ({im.size[0]}x{im.size[1]})")
                continue
            navn = velg_palett(rel) if a.palett == "auto" else a.palett
            ut = dst / rel
            ut.parent.mkdir(parents=True, exist_ok=True)
            pixelify(im, navn, div=a.div, cfg=material_cfg(rel)).save(ut)
            n += 1
            print(f"  [{navn[0].upper()}] {rel}")
        print(f"ferdig: {n} filer -> {dst}  ({hoppet} store hoppet over)")
        return

    if not a.input or not a.output:
        ap.error("oppgi input og output (eller --batch / --swatches)")
    navn = velg_palett(a.input, a.output) if a.palett == "auto" else a.palett
    out = pixelify(Image.open(a.input), navn, div=a.div, rute=parse_rute(a.rute),
                   cfg=material_cfg(a.input, a.output))
    Path(a.output).parent.mkdir(parents=True, exist_ok=True)
    out.save(a.output)
    print(f"[{navn}] {a.input} -> {a.output}  ({out.size[0]}x{out.size[1]})")

if __name__ == "__main__":
    main()
