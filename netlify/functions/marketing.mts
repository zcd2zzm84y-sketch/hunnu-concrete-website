import type { Config, Context } from "@netlify/functions"
import { settingsStore, json, clip } from "../lib/store.mts"
import { createHash, timingSafeEqual, scryptSync, randomBytes } from "node:crypto"

// Marketing board (hunnu.asia/talent/marketing): channel logins + task status.
// Access only with MARKETING_KEY (env). Logins live in Netlify Blobs, never in the page or git.
const sha = (t: string) => createHash("sha256").update(t).digest()
const same = (a: string, b: string) => timingSafeEqual(sha(a), sha(b))
const CH_IDS = ["fb", "ms", "fbhr", "talent", "ig", "x", "yt", "gm1", "gm2", "barilga", "web", "zangia", "r360", "barter"]
const ST = ["todo", "doing", "ok"]
const LOCK_N = 8, LOCK_MS = 15 * 60 * 1000

const getObj = async (k: string): Promise<Record<string, any>> => { const v: any = await settingsStore().get(k, { type: "json" }); return v && typeof v === "object" && !Array.isArray(v) ? v : {} }
const ipKey = (ctx: Context) => "mkt-fail-" + createHash("sha256").update(ctx.ip || "x").digest("hex").slice(0, 16)

// The board password is kept as a scrypt hash in Blobs (or MARKETING_KEY env, if set).
// First setup needs the HR dashboard key (ADMIN_KEY); later changes need the current board password.
const hashKey = (k: string, salt: string) => scryptSync(k, salt, 32).toString("hex")
const keyOk = async (k: string): Promise<boolean | null> => {
  const env = Netlify.env.get("MARKETING_KEY")
  if (env) return same(k, env)
  const st: any = await settingsStore().get("mkt-key", { type: "json" })
  if (!st?.hash) return null
  return timingSafeEqual(Buffer.from(hashKey(k, st.salt), "hex"), Buffer.from(st.hash, "hex"))
}
const saveKey = async (k: string) => { const salt = randomBytes(16).toString("hex"); await settingsStore().setJSON("mkt-key", { salt, hash: hashKey(k, salt), at: new Date().toISOString() }) }
const strong = (k: string) => k.length >= 10

// Requests from the marketing team (add/remove content, website errors, fixes). Read and answered by the
// Зөвлөх's assistant with BOT_KEY (env, never in git) via ?reqs=1 and action "reqset".
// Categories are board sections only: requests change this board, nothing else
const RQ_CAT = ["ch", "todo", "plan", "lead", "rules", "other"], RQ_ST = ["new", "doing", "done", "no"]
const getReqs = async (): Promise<any[]> => { const v: any = await settingsStore().get("mkt-req", { type: "json" }); return Array.isArray(v) ? v : [] }
const IMG_RE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/, IMG_MAX = 1_500_000, IMG_N = 3
const imgKey = (rid: string, n: number) => `mkt-img-${rid}-${n}`
const dropImgs = async (r: any) => { for (let n = 0; n < (r?.imgs || 0); n++) await settingsStore().delete(imgKey(r.id, n)) }
const getImg = async (q: string) => { const m = /^(r[0-9a-z]{4,20})-([0-2])$/.exec(q); if (!m) return null; const v: any = await settingsStore().get(imgKey(m[1], +m[2]), { type: "json" }); return v?.d ? json({ d: v.d }) : null }

// Facebook page numbers (read-only). FB_PAGE_TOKEN (env, never in git) = page access token with
// pages_read_engagement + pages_messaging. Cached 15 min in Blobs so the board does not hit Graph API on every open.
const FB_PAGE = "836673816358977", GRAPH = "https://graph.facebook.com/v21.0/"
const fbGet = async (path: string, tok: string) => {
  const r = await fetch(GRAPH + path + (path.includes("?") ? "&" : "?") + "access_token=" + encodeURIComponent(tok))
  const j: any = await r.json().catch(() => ({}))
  if (!r.ok || j.error) throw new Error(j?.error?.message || "Graph " + r.status)
  return j
}
const fbStats = async (force = false) => {
  const raw = Netlify.env.get("FB_PAGE_TOKEN")
  if (!raw) return { setup: true }
  const c: any = await settingsStore().get("mkt-fb", { type: "json" })
  if (!force && c?.at && Date.now() - Date.parse(c.at) < 15 * 60 * 1000) return c
  // A system-user token also works: ask Graph for the page's own token first (falls back to the given token).
  const tok = await fbGet(FB_PAGE + "?fields=access_token", raw).then(j => j.access_token || raw).catch(() => raw)
  const out: any = { at: new Date().toISOString() }
  const tasks: Promise<void>[] = [
    fbGet(FB_PAGE + "?fields=followers_count,fan_count", tok).then(j => { out.followers = j.followers_count ?? j.fan_count ?? null }),
    // Reaction/comment counts on post fields need pages_read_user_content (not granted on purpose).
    // Posts come without them; reactions are filled best-effort from post insights (read_insights).
    fbGet(FB_PAGE + "/published_posts?fields=id,message,created_time,permalink_url,shares&limit=3", tok).then(async j => {
      const d = j.data || []
      out.posts = d.map((p: any) => ({ t: clip(p.message || "", 140), at: p.created_time, url: p.permalink_url, s: p.shares?.count ?? 0 }))
      await Promise.allSettled(d.map((p: any, i: number) => fbGet(p.id + "/insights?metric=post_reactions_by_type_total", tok).then(x => {
        const v = x?.data?.[0]?.values?.[0]?.value
        if (v && typeof v === "object") out.posts[i].r = Object.values(v).reduce((a: number, n: any) => a + (Number(n) || 0), 0)
      })))
    }),
    fbGet(FB_PAGE + "/conversations?fields=unread_count,updated_time&limit=50", tok).then(j => {
      const d = j.data || []; out.unread = d.filter((x: any) => x.unread_count > 0).length
    }),
  ]
  const res = await Promise.allSettled(tasks)
  const errs = res.filter(r => r.status === "rejected").map((r: any) => String(r.reason?.message || r.reason))
  if (errs.length === tasks.length) { if (c?.at) return { ...c, stale: true, err: errs[0] }; return { err: errs[0] } }
  if (errs.length) out.err = errs[0]
  await settingsStore().setJSON("mkt-fb", out)
  return out
}
const botOk = (req: Request) => { const b = Netlify.env.get("BOT_KEY"), h = (req.headers.get("x-bot-key") || "").trim(); return !!b && !!h && same(h, b) }

export default async (req: Request, ctx: Context) => {
  const configured = await keyOk("probe")
  if (configured === null) {
    if (req.method !== "POST") return json({ error: "Самбарын нууц үг тохируулаагүй байна.", setup: true }, 503)
    let b: any
    try { b = await req.json() } catch { return json({ error: "Хүсэлт буруу байна." }, 400) }
    const admin = Netlify.env.get("ADMIN_KEY"), a = (req.headers.get("x-admin-key") || "").trim()
    if (b?.action !== "setup" || !admin || !a || !same(a, admin)) return json({ error: "HR самбарын түлхүүр буруу байна.", setup: true }, 401)
    const nk = String(b.key || "").trim()
    if (!strong(nk)) return json({ error: "Нууц үг дор хаяж 10 тэмдэгт байна.", setup: true }, 400)
    await saveKey(nk)
    return json({ ok: true })
  }
  // Task progress only (hashed task ids, state, time; no logins, no names) for Зөвлөх's private overview page
  if (req.method === "GET" && new URL(req.url).searchParams.has("summary")) {
    const st = await getObj("mkt-status"), out: Record<string, { s: string, at: string }> = {}
    for (const [id, v] of Object.entries<any>(st)) if (v?.s) out[id] = { s: String(v.s), at: String(v.at || "") }
    return new Response(JSON.stringify({ status: out }), { headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "access-control-allow-origin": "*" } })
  }
  // Assistant access to requests only (no logins, no board password)
  if (req.headers.get("x-bot-key")) {
    if (!botOk(req)) return json({ error: "Түлхүүр буруу." }, 401)
    if (req.method === "GET") {
      const q = new URL(req.url).searchParams.get("img")
      if (q) return (await getImg(q)) || json({ error: "Зураг олдсонгүй." }, 404)
      return json({ reqs: await getReqs() })
    }
    let b: any
    try { b = await req.json() } catch { return json({ error: "Хүсэлт буруу байна." }, 400) }
    if (b?.action !== "reqset") return json({ error: "Үйлдэл буруу." }, 400)
    const all = await getReqs(), r = all.find(x => x.id === String(b.id || ""))
    if (!r) return json({ error: "Хүсэлт олдсонгүй." }, 404)
    if (b.s !== undefined) { if (!RQ_ST.includes(String(b.s))) return json({ error: "Төлөв буруу." }, 400); r.s = String(b.s) }
    if (b.reply !== undefined) r.reply = clip(b.reply, 1000).trim()
    r.rat = new Date().toISOString()
    await settingsStore().setJSON("mkt-req", all)
    return json({ ok: true, req: r })
  }
  const k = (req.headers.get("x-mkt-key") || "").trim()
  // Opening the page sends no key: answer "log in" without counting it as a wrong try
  if (!k) return json({ error: "Нэвтэрнэ үү." }, 401)
  const fk = ipKey(ctx), fail: any = (await settingsStore().get(fk, { type: "json" })) || { n: 0, t: 0 }
  if (fail.n >= LOCK_N && Date.now() - fail.t < LOCK_MS) return json({ error: "Олон удаа буруу оруулсан. 15 минутын дараа дахин оролдоно уу." }, 429)
  if (!(await keyOk(k))) {
    await settingsStore().setJSON(fk, { n: (Date.now() - fail.t < LOCK_MS ? fail.n : 0) + 1, t: Date.now() })
    return json({ error: "Нууц үг буруу байна." }, 401)
  }
  if (fail.n) await settingsStore().delete(fk)
  const who = clip(decodeURIComponent(req.headers.get("x-mkt-name") || ""), 60).trim()

  if (req.method === "GET" && new URL(req.url).searchParams.get("img")) {
    return (await getImg(new URL(req.url).searchParams.get("img") || "")) || json({ error: "Зураг олдсонгүй." }, 404)
  }
  if (req.method === "GET" && new URL(req.url).searchParams.has("fb")) return json(await fbStats(new URL(req.url).searchParams.get("fb") === "fresh"))
  if (req.method === "GET") {
    const [creds, status, reqs] = await Promise.all([getObj("mkt-creds"), getObj("mkt-status"), getReqs()])
    return json({ creds, status, reqs })
  }
  let b: any
  try { b = await req.json() } catch { return json({ error: "Хүсэлт буруу байна." }, 400) }
  if (b?.action === "rekey") {
    if (Netlify.env.get("MARKETING_KEY")) return json({ error: "Нууц үгийг Netlify-д тохируулсан байна." }, 400)
    const nk = String(b.key || "").trim()
    if (!strong(nk)) return json({ error: "Нууц үг дор хаяж 10 тэмдэгт байна." }, 400)
    await saveKey(nk)
    return json({ ok: true })
  }
  if (b?.action === "cred") {
    const id = String(b.id || "")
    if (!CH_IDS.includes(id)) return json({ error: "Суваг олдсонгүй." }, 400)
    const all = await getObj("mkt-creds")
    all[id] = { u: clip(b.u, 200).trim(), p: clip(b.p, 200), n: clip(b.n, 300).trim(), at: new Date().toISOString(), by: who }
    await settingsStore().setJSON("mkt-creds", all)
    return json({ ok: true, creds: all })
  }
  if (b?.action === "status") {
    const id = clip(b.id, 40), s = String(b.s || "")
    if (!/^t[0-9a-z]{1,12}$/.test(id) || !ST.includes(s)) return json({ error: "Төлөв буруу." }, 400)
    const all = await getObj("mkt-status")
    all[id] = { s, at: new Date().toISOString(), by: who }
    await settingsStore().setJSON("mkt-status", all)
    return json({ ok: true, status: all })
  }
  if (b?.action === "req") {
    const t = clip(b.t, 2000).trim(), cat = String(b.cat || "other")
    if (t.length < 3 && !(Array.isArray(b.imgs) && b.imgs.length)) return json({ error: "Хүсэлтээ бичнэ үү." }, 400)
    if (!RQ_CAT.includes(cat)) return json({ error: "Төрөл буруу." }, 400)
    const imgs = (Array.isArray(b.imgs) ? b.imgs : []).slice(0, IMG_N).map(String)
    if (imgs.some(d => d.length > IMG_MAX || !IMG_RE.test(d))) return json({ error: "Зураг хэт том эсвэл буруу төрөлтэй байна." }, 400)
    const all = await getReqs(), id = "r" + Date.now().toString(36) + randomBytes(2).toString("hex")
    for (let n = 0; n < imgs.length; n++) await settingsStore().setJSON(imgKey(id, n), { d: imgs[n] })
    all.unshift({ id, cat, t, url: clip(b.url, 300).trim(), imgs: imgs.length, by: who, at: new Date().toISOString(), s: "new", reply: "" })
    const closed = all.filter(x => x.s === "done" || x.s === "no")
    const keep = all.filter(x => x.s !== "done" && x.s !== "no").concat(closed.slice(0, 100))
    for (const r of closed.slice(100)) await dropImgs(r)
    await settingsStore().setJSON("mkt-req", keep)
    return json({ ok: true, reqs: keep })
  }
  if (b?.action === "reqdel") {
    const all = await getReqs(), i = all.findIndex(x => x.id === String(b.id || ""))
    if (i < 0) return json({ error: "Хүсэлт олдсонгүй." }, 404)
    if (all[i].s !== "new") return json({ error: "Эхэлсэн хүсэлтийг устгах боломжгүй." }, 400)
    await dropImgs(all[i])
    all.splice(i, 1)
    await settingsStore().setJSON("mkt-req", all)
    return json({ ok: true, reqs: all })
  }
  return json({ error: "Үйлдэл буруу." }, 400)
}

export const config: Config = { path: "/api/marketing", method: ["GET", "POST"] }
