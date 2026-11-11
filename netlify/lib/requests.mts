import { settingsStore, json, clip } from "./store.mts"
import { createHash, timingSafeEqual, randomBytes } from "node:crypto"

// «Хүсэлт, засвар» lists (HR dashboard). Staff write requests with up to 3 screenshots;
// the Зөвлөх's assistant reads and answers them with BOT_KEY (env, never in git).
const sha = (t: string) => createHash("sha256").update(t).digest()
export const botOk = (req: Request) => { const b = Netlify.env.get("BOT_KEY"), h = (req.headers.get("x-bot-key") || "").trim(); return !!b && !!h && timingSafeEqual(sha(h), sha(b)) }
const RQ_ST = ["new", "doing", "done", "no"]
const IMG_RE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/, IMG_MAX = 1_500_000, IMG_N = 3

export function requestList(prefix: string, cats: string[]) {
  const listKey = `${prefix}-req`, imgKey = (rid: string, n: number) => `${prefix}-img-${rid}-${n}`
  const all = async (): Promise<any[]> => { const v: any = await settingsStore().get(listKey, { type: "json" }); return Array.isArray(v) ? v : [] }
  const dropImgs = async (r: any) => { for (let n = 0; n < (r?.imgs || 0); n++) await settingsStore().delete(imgKey(r.id, n)) }
  const img = async (q: string) => { const m = /^(r[0-9a-z]{4,20})-([0-2])$/.exec(q); if (!m) return json({ error: "Зураг олдсонгүй." }, 404); const v: any = await settingsStore().get(imgKey(m[1], +m[2]), { type: "json" }); return v?.d ? json({ d: v.d }) : json({ error: "Зураг олдсонгүй." }, 404) }
  const add = async (b: any, who: string) => {
    const t = clip(b?.t, 2000).trim(), cat = String(b?.cat || "other")
    if (t.length < 3 && !(Array.isArray(b?.imgs) && b.imgs.length)) return json({ error: "Хүсэлтээ бичнэ үү." }, 400)
    if (!cats.includes(cat)) return json({ error: "Төрөл буруу." }, 400)
    const imgs = (Array.isArray(b.imgs) ? b.imgs : []).slice(0, IMG_N).map(String)
    if (imgs.some((d: string) => d.length > IMG_MAX || !IMG_RE.test(d))) return json({ error: "Зураг хэт том эсвэл буруу төрөлтэй байна." }, 400)
    const list = await all(), id = "r" + Date.now().toString(36) + randomBytes(2).toString("hex")
    for (let n = 0; n < imgs.length; n++) await settingsStore().setJSON(imgKey(id, n), { d: imgs[n] })
    list.unshift({ id, cat, t, url: clip(b.url, 300).trim(), imgs: imgs.length, by: who, at: new Date().toISOString(), s: "new", reply: "" })
    const closed = list.filter(x => x.s === "done" || x.s === "no")
    const keep = list.filter(x => x.s !== "done" && x.s !== "no").concat(closed.slice(0, 100))
    for (const r of closed.slice(100)) await dropImgs(r)
    await settingsStore().setJSON(listKey, keep)
    return json({ ok: true, reqs: keep })
  }
  const del = async (b: any) => {
    const list = await all(), i = list.findIndex(x => x.id === String(b?.id || ""))
    if (i < 0) return json({ error: "Хүсэлт олдсонгүй." }, 404)
    if (list[i].s !== "new") return json({ error: "Эхэлсэн хүсэлтийг устгах боломжгүй." }, 400)
    await dropImgs(list[i]); list.splice(i, 1)
    await settingsStore().setJSON(listKey, list)
    return json({ ok: true, reqs: list })
  }
  // Assistant: GET list (or ?img=), POST {action:"reqset", id, s?, reply?}
  const bot = async (req: Request) => {
    if (req.method === "GET") { const q = new URL(req.url).searchParams.get("img"); return q ? img(q) : json({ reqs: await all() }) }
    let b: any
    try { b = await req.json() } catch { return json({ error: "Хүсэлт буруу байна." }, 400) }
    if (b?.action !== "reqset") return json({ error: "Үйлдэл буруу." }, 400)
    const list = await all(), r = list.find(x => x.id === String(b.id || ""))
    if (!r) return json({ error: "Хүсэлт олдсонгүй." }, 404)
    if (b.s !== undefined) { if (!RQ_ST.includes(String(b.s))) return json({ error: "Төлөв буруу." }, 400); r.s = String(b.s) }
    if (b.reply !== undefined) r.reply = clip(b.reply, 1000).trim()
    r.rat = new Date().toISOString()
    await settingsStore().setJSON(listKey, list)
    return json({ ok: true, req: r })
  }
  return { all, add, del, img, bot }
}
