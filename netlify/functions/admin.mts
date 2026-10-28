import type { Config } from "@netlify/functions"
import { staffStore, pulseStore, summarizePulse, json, clip } from "../lib/store.mts"
import { COMP } from "../../public/assets/data.mjs"

const authorized = (req: Request) => {
  const key = Netlify.env.get("ADMIN_KEY")
  return !!key && req.headers.get("x-admin-key") === key
}

async function readAll(store: ReturnType<typeof staffStore>) {
  const { blobs } = await store.list()
  const rows = await Promise.all(blobs.map(b => store.get(b.key, { type: "json" })))
  return rows.filter(Boolean)
}

export default async (req: Request) => {
  if (!authorized(req)) return json({ error: "Нууц үг буруу байна." }, 401)
  const staff = staffStore()
  if (req.method === "GET") {
    const [rows, pulse] = await Promise.all([readAll(staff), readAll(pulseStore())])
    rows.sort((a: any, b: any) => b.submittedAt - a.submittedAt)
    return json({ staff: rows, pulse: summarizePulse(pulse) })
  }
  let body: any
  try { body = await req.json() } catch { return json({ error: "Хүсэлт буруу байна." }, 400) }
  const id = clip(body?.id, 80)
  const cur: any = await staff.get(id, { type: "json" })
  if (!cur) return json({ error: "Олдсонгүй." }, 404)
  if (body.action === "delete") { await staff.delete(id); return json({ ok: true }) }
  if (body.action === "update") {
    const p = body.patch || {}
    const next = { ...cur }
    if (p.mgr) { next.mgr = {}; for (const c of COMP) { const v = Number(p.mgr[c.id]); if (Number.isInteger(v) && v >= 1 && v <= 5) next.mgr[c.id] = v } }
    if ("plan" in p) next.plan = clip(p.plan, 3000)
    if ("hrNote" in p) next.hrNote = clip(p.hrNote, 3000)
    await staff.setJSON(id, next)
    return json({ ok: true, row: next })
  }
  return json({ error: "Үйлдэл буруу." }, 400)
}

export const config: Config = { path: "/api/admin", method: ["GET", "POST"] }
