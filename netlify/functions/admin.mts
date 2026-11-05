import type { Config } from "@netlify/functions"
import { staffStore, pulseStore, applicantStore, settingsStore, getOpenings, isPosition, summarizePulse, json, clip, STATUS } from "../lib/store.mts"
import { KMAP } from "../lib/bank.mjs"
import { COMP } from "../../public/assets/data.mjs"

// HR (ADMIN_KEY) can do everything; leaders (MANAGER_KEY) can read results and enter their own skill ratings only
const roleOf = (req: Request) => {
  const k = req.headers.get("x-admin-key"), admin = Netlify.env.get("ADMIN_KEY"), mgr = Netlify.env.get("MANAGER_KEY")
  if (!k) return null
  if (admin && k === admin) return "admin"
  if (mgr && k === mgr) return "manager"
  return null
}

async function readAll(store: ReturnType<typeof staffStore>) {
  const { blobs } = await store.list()
  const rows = await Promise.all(blobs.map(b => store.get(b.key, { type: "json" })))
  return rows.filter(Boolean)
}

const scores = (src: any) => {
  const out: Record<string, number> = {}
  for (const c of COMP) { const v = Number(src?.[c.id]); if (Number.isInteger(v) && v >= 1 && v <= 5) out[c.id] = v }
  return out
}

export default async (req: Request) => {
  const role = roleOf(req)
  if (!role) return json({ error: "Нууц үг буруу байна." }, 401)
  if (req.method === "GET") {
    const [rows, pulse, apps, openings, roster] = await Promise.all([readAll(staffStore()), readAll(pulseStore()), readAll(applicantStore()), getOpenings(), settingsStore().get("roster", { type: "json" })])
    const newest = (a: any, b: any) => b.submittedAt - a.submittedAt
    rows.sort(newest); apps.sort(newest)
    // Answer key only for the questions that were actually asked, so HR can review mistakes
    const ids = new Set([...rows, ...apps].flatMap((r: any) => r.questions || []))
    const bank = Object.fromEntries([...ids].filter(id => KMAP[id]).map(id => [id, KMAP[id]]))
    return json({ role, staff: rows, pulse: summarizePulse(pulse), applicants: apps, bank, openings, roster: Array.isArray(roster) ? roster : [] })
  }
  let body: any
  try { body = await req.json() } catch { return json({ error: "Хүсэлт буруу байна." }, 400) }
  const mgrOnly = body?.action === "update" && body?.kind !== "app" && body?.patch && typeof body.patch === "object" && Object.keys(body.patch).every(k => k === "mgr")
  if (role === "manager" && !mgrOnly) return json({ error: "Удирдлагын эрхээр зөвхөн ур чадварын үнэлгээ оруулна." }, 403)
  if (body?.action === "openings") {
    const list = [...new Set((Array.isArray(body.openings) ? body.openings : []).map(String).filter(isPosition))]
    await settingsStore().setJSON("openings", list)
    return json({ ok: true, openings: list })
  }
  // Staff in scope of the assessment (HR's list): base for the participation rate and the "not yet taken" list
  if (body?.action === "roster") {
    const list = (Array.isArray(body.roster) ? body.roster : []).slice(0, 300)
      .map((r: any) => ({ dept: clip(r?.dept, 80), name: clip(r?.name, 80), position: clip(r?.position, 80) }))
      .filter((r: any) => r.name)
    await settingsStore().setJSON("roster", list)
    return json({ ok: true, roster: list })
  }
  // Clears staff passports and pulse answers before the real survey starts; applicants are kept
  if (body?.action === "purgeSurvey") {
    const wipe = async (store: ReturnType<typeof staffStore>) => {
      const { blobs } = await store.list()
      await Promise.all(blobs.map(b => store.delete(b.key)))
      return blobs.length
    }
    const [staff, pulse] = await Promise.all([wipe(staffStore()), wipe(pulseStore())])
    return json({ ok: true, staff, pulse })
  }
  const store = body?.kind === "app" ? applicantStore() : staffStore()
  const id = clip(body?.id, 80)
  const cur: any = await store.get(id, { type: "json" })
  if (!cur) return json({ error: "Олдсонгүй." }, 404)
  if (body.action === "delete") { await store.delete(id); return json({ ok: true }) }
  if (body.action === "update") {
    const p = body.patch || {}
    const next = { ...cur }
    if (p.mgr) next.mgr = scores(p.mgr)
    if (p.interview) next.interview = scores(p.interview)
    if (STATUS.includes(p.status)) next.status = p.status
    if ("plan" in p) next.plan = clip(p.plan, 3000)
    if (p.iAns && typeof p.iAns === "object") {
      const out: Record<string, { r?: number, t?: string }> = {}
      for (const [k, v] of Object.entries(p.iAns).slice(0, 60) as [string, any][]) {
        if (!/^q[0-9a-z]{1,8}$/.test(k)) continue
        const r = Number(v?.r), t = clip(v?.t, 500).trim(), o: { r?: number, t?: string } = {}
        if ([1, 2, 3].includes(r)) o.r = r
        if (t) o.t = t
        if (o.r || o.t) out[k] = o
      }
      next.iAns = out
    }
    if (p.chk && typeof p.chk === "object") {
      const out: Record<string, boolean | string> = {}
      for (const [k, v] of Object.entries(p.chk).slice(0, 40) as [string, any][]) {
        if (!/^[a-z0-9_]{1,20}$/.test(k)) continue
        if (k === "reason") { const t = clip(v, 120).trim(); if (t) out.reason = t }
        else if (v === true) out[k] = true
      }
      next.chk = out
    }
    if ("hrNote" in p) next.hrNote = clip(p.hrNote, 3000)
    await store.setJSON(id, next)
    return json({ ok: true, row: next })
  }
  return json({ error: "Үйлдэл буруу." }, 400)
}

export const config: Config = { path: "/api/admin", method: ["GET", "POST"] }
