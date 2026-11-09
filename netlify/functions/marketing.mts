import type { Config, Context } from "@netlify/functions"
import { settingsStore, json, clip } from "../lib/store.mts"
import { createHash, timingSafeEqual } from "node:crypto"

// Marketing board (hunnu.asia/talent/marketing): channel logins + task status.
// Access only with MARKETING_KEY (env). Logins live in Netlify Blobs, never in the page or git.
const sha = (t: string) => createHash("sha256").update(t).digest()
const same = (a: string, b: string) => timingSafeEqual(sha(a), sha(b))
const CH_IDS = ["fb", "ms", "fbhr", "talent", "ig", "x", "yt", "gm1", "gm2", "barilga", "web", "zangia", "r360"]
const ST = ["todo", "doing", "ok"]
const LOCK_N = 8, LOCK_MS = 15 * 60 * 1000

const getObj = async (k: string): Promise<Record<string, any>> => { const v: any = await settingsStore().get(k, { type: "json" }); return v && typeof v === "object" && !Array.isArray(v) ? v : {} }
const ipKey = (ctx: Context) => "mkt-fail-" + createHash("sha256").update(ctx.ip || "x").digest("hex").slice(0, 16)

export default async (req: Request, ctx: Context) => {
  const want = Netlify.env.get("MARKETING_KEY")
  if (!want) return json({ error: "Самбар тохируулагдаагүй байна." }, 503)
  const fk = ipKey(ctx), fail: any = (await settingsStore().get(fk, { type: "json" })) || { n: 0, t: 0 }
  if (fail.n >= LOCK_N && Date.now() - fail.t < LOCK_MS) return json({ error: "Олон удаа буруу оруулсан. 15 минутын дараа дахин оролдоно уу." }, 429)
  const k = (req.headers.get("x-mkt-key") || "").trim()
  if (!k || !same(k, want)) {
    await settingsStore().setJSON(fk, { n: (Date.now() - fail.t < LOCK_MS ? fail.n : 0) + 1, t: Date.now() })
    return json({ error: "Нууц үг буруу байна." }, 401)
  }
  if (fail.n) await settingsStore().delete(fk)
  const who = clip(decodeURIComponent(req.headers.get("x-mkt-name") || ""), 60).trim()

  if (req.method === "GET") {
    const [creds, status] = await Promise.all([getObj("mkt-creds"), getObj("mkt-status")])
    return json({ creds, status })
  }
  let b: any
  try { b = await req.json() } catch { return json({ error: "Хүсэлт буруу байна." }, 400) }
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
  return json({ error: "Үйлдэл буруу." }, 400)
}

export const config: Config = { path: "/api/marketing", method: ["GET", "POST"] }
