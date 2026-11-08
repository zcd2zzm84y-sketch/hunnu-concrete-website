import type { Config } from "@netlify/functions"
import { staffStore, pulseStore, applicantStore, settingsStore, getOpenings, isPosition, summarizePulse, json, clip, STATUS } from "../lib/store.mts"
import { KMAP, draw } from "../lib/bank.mjs"
import { COMP } from "../../public/assets/data.mjs"
import { createHash, randomBytes } from "node:crypto"

// HR (ADMIN_KEY) can do everything; leaders (MANAGER_KEY) can read results and enter their own skill ratings only
// Rating-only accounts (HR creates them): a department head sees only their departments' names and positions and enters 1–5 skill ratings.
// Only a hash of each code is stored; the code itself is shown once when created.
const sha = (t: string) => createHash("sha256").update(t).digest("hex")
const getRaters = async (): Promise<any[]> => { const r = await settingsStore().get("raters", { type: "json" }); return Array.isArray(r) ? r : [] }
const roleOf = async (req: Request): Promise<{ role: string, rater?: any } | null> => {
  const k = req.headers.get("x-admin-key"), admin = Netlify.env.get("ADMIN_KEY"), mgr = Netlify.env.get("MANAGER_KEY")
  if (!k) return null
  if (admin && k === admin) return { role: "admin" }
  if (mgr && k === mgr) return { role: "manager" }
  const h = sha(k.trim().toUpperCase()), rater = (await getRaters()).find(r => r.hash === h)
  return rater ? { role: "rater", rater } : null
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
  const who = await roleOf(req)
  if (!who) return json({ error: "Нууц үг буруу байна." }, 401)
  const role = who.role
  if (role === "rater") {
    const depts: string[] = who.rater.depts || []
    if (req.method === "GET") {
      const [rows, roster] = await Promise.all([readAll(staffStore()), settingsStore().get("roster", { type: "json" })])
      const mine = rows.filter((r: any) => depts.includes(r.dept)).map((r: any) => ({ id: r.id, name: r.name, position: r.position, dept: r.dept, mgr: r.mgr || {} }))
      return json({ role, label: who.rater.label, depts, staff: mine, roster: (Array.isArray(roster) ? roster : []).filter((r: any) => depts.includes(r.dept)) })
    }
    let b: any
    try { b = await req.json() } catch { return json({ error: "Хүсэлт буруу байна." }, 400) }
    if (b?.action !== "update" || b?.kind === "app" || !b?.patch?.mgr || Object.keys(b.patch).some(k => k !== "mgr")) return json({ error: "Энэ эрхээр зөвхөн ур чадварын үнэлгээ оруулна." }, 403)
    const id = clip(b.id, 80), cur: any = await staffStore().get(id, { type: "json" })
    if (!cur || !depts.includes(cur.dept)) return json({ error: "Олдсонгүй." }, 404)
    const next = { ...cur, mgr: scores(b.patch.mgr) }
    await staffStore().setJSON(id, next)
    return json({ ok: true, row: { id, name: cur.name, position: cur.position, dept: cur.dept, mgr: next.mgr } })
  }
  if (req.method === "GET") {
    const [rows, pulse, apps, openings, roster] = await Promise.all([readAll(staffStore()), readAll(pulseStore()), readAll(applicantStore()), getOpenings(), settingsStore().get("roster", { type: "json" })])
    const newest = (a: any, b: any) => b.submittedAt - a.submittedAt
    rows.sort(newest); apps.sort(newest)
    apps.forEach((a: any) => { if (a.exam) a.exam = { issuedAt: a.exam.issuedAt, startedAt: a.exam.startedAt } })
    // Answer key only for the questions that were actually asked, so HR can review mistakes
    const ids = new Set([...rows, ...apps].flatMap((r: any) => r.questions || []))
    const bank = Object.fromEntries([...ids].filter(id => KMAP[id]).map(id => [id, KMAP[id]]))
    const raters = role === "admin" ? (await getRaters()).map(r => ({ id: r.id, label: r.label, depts: r.depts, code: r.code || "", createdAt: r.createdAt })) : []
    return json({ role, staff: rows, pulse: summarizePulse(pulse), applicants: apps, bank, openings, roster: Array.isArray(roster) ? roster : [], raters })
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
  if (body?.action === "raterAdd") {
    const label = clip(body.label, 80).trim(), depts = (Array.isArray(body.depts) ? body.depts : []).map((d: any) => clip(d, 80)).filter(Boolean).slice(0, 12)
    if (!label || !depts.length) return json({ error: "Нэр болон алба сонгоно уу." }, 400)
    const code = "HUN-" + randomBytes(6).toString("base64url").replace(/[-_]/g, "x").slice(0, 8).toUpperCase()
    const list = await getRaters()
    list.push({ id: randomBytes(6).toString("hex"), label, depts, hash: sha(code), code, createdAt: Date.now() })
    await settingsStore().setJSON("raters", list)
    return json({ ok: true, code, raters: list.map(r => ({ id: r.id, label: r.label, depts: r.depts, code: r.code || "", createdAt: r.createdAt })) })
  }
  if (body?.action === "raterDel") {
    const list = (await getRaters()).filter(r => r.id !== clip(body.id, 40))
    await settingsStore().setJSON("raters", list)
    return json({ ok: true, raters: list.map(r => ({ id: r.id, label: r.label, depts: r.depts, code: r.code || "", createdAt: r.createdAt })) })
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
  // HR starts the knowledge test at the office: draw a fresh question set and hand back a one-time link token
  if (body?.action === "examStart") {
    const id = clip(body?.id, 80), cur: any = await applicantStore().get(id, { type: "json" })
    if (!cur) return json({ error: "Олдсонгүй." }, 404)
    const token = randomBytes(18).toString("base64url"), { order, common } = draw("apply", cur.dept, cur.position)
    const exam = { hash: sha(token), issuedAt: Date.now(), startedAt: null, order, common }
    await applicantStore().setJSON(id, { ...cur, exam })
    return json({ ok: true, token, row: { ...cur, exam: { issuedAt: exam.issuedAt } } })
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
    return json({ ok: true, row: next.exam ? { ...next, exam: { issuedAt: next.exam.issuedAt, startedAt: next.exam.startedAt } } : next })
  }
  return json({ error: "Үйлдэл буруу." }, 400)
}

export const config: Config = { path: "/api/admin", method: ["GET", "POST"] }
