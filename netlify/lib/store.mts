import { getStore } from "@netlify/blobs"
import { PULSE, COMP, MIN_GROUP, LEAVE, DEPTS, APP_N_COMMON, APP_N_JOB, migrateRole } from "../../public/assets/data.mjs"
import { KMAP, jobPool, commonPool } from "./bank.mjs"

export const staffStore = () => getStore({ name: "staff", consistency: "strong" })
// Anonymous answers: random keys, month only, nothing that ties them to a person
export const pulseStore = () => getStore({ name: "pulse", consistency: "strong" })
// Job applicants: application form + test, read only through the HR dashboard
export const applicantStore = () => getStore({ name: "applicants", consistency: "strong" })
// HR settings, e.g. which positions are open for applications
export const settingsStore = () => getStore({ name: "settings", consistency: "strong" })
const posKey = (dept: string, position: string) => `${dept}|${position}`
// Open positions as "dept|position"; nothing is open until HR ticks positions in the dashboard
export async function getOpenings(): Promise<string[]> {
  const v: any = await settingsStore().get("openings", { type: "json" })
  return Array.isArray(v) ? v.filter(isPosition) : []
}
export function isPosition(k: unknown) {
  const [dept, position] = String(k).split("|")
  return !!DEPTS[dept as keyof typeof DEPTS]?.some((p: any) => p[0] === position)
}
export const isOpen = async (dept: string, position: string) => (await getOpenings()).includes(posKey(dept, position))

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } })

export const clip = (v: unknown, n = 2000) => String(v ?? "").slice(0, n)
const int = (v: unknown, lo: number, hi: number) => { const n = Number(v); return Number.isInteger(n) && n >= lo && n <= hi ? n : null }

const cleanSelf = (src: any) => {
  const self: Record<string, number> = {}
  for (const c of COMP) { const v = int(src?.[c.id], 1, 5); if (v !== null) self[c.id] = v }
  return self
}

export function cleanStaff(s: any) {
  // Older drafts may carry pre-register titles; translate them instead of rejecting the whole survey
  const role = migrateRole(clip(s?.dept, 80), clip(s?.position, 120))
  if (!role.ok) throw new Error("role")
  const { dept, pos: position } = role
  const questions: string[] = (Array.isArray(s?.questions) ? s.questions : []).filter((id: string) => KMAP[id]).slice(0, 40)
  const common = new Set((Array.isArray(s?.common) ? s.common : []).filter((id: string) => KMAP[id]))
  const answers: Record<string, number> = {}
  const byPart = { common: { c: 0, t: 0 }, job: { c: 0, t: 0 } }
  let score = 0
  for (const id of questions) {
    const a = int(s?.answers?.[id], 0, KMAP[id].o.length - 1)
    if (a !== null) answers[id] = a
    const part = common.has(id) ? "common" : "job"
    byPart[part].t++
    if (a === KMAP[id].a) { byPart[part].c++; score++ }
  }
  const self = cleanSelf(s?.self)
  return {
    name: clip(s?.name, 80).trim(), dept, position, family: clip(s?.family, 20), tenure: clip(s?.tenure, 30),
    startedAt: Number(s?.startedAt) || null, durationSec: int(s?.durationSec, 0, 86400) ?? 0,
    questions, common: [...common], answers, score, max: questions.length, byPart, self,
    train: (Array.isArray(s?.train) ? s.train : []).slice(0, 15).map((t: unknown) => clip(t, 80)),
    trainOther: clip(s?.trainOther, 300), mgr: {}, plan: "", hrNote: "",
  }
}

export function cleanPulse(p: any, dept: string, tenure: string) {
  const items: Record<string, number> = {}
  for (const q of PULSE) { const v = int(p?.items?.[q.id], 1, 5); if (v !== null) items[q.id] = v }
  const now = new Date()
  return {
    dept, tenure, month: `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`,
    items, enps: int(p?.enps, 0, 10), leave: LEAVE.includes(p?.leave) ? p.leave : "",
    like: clip(p?.like, 1000), change: clip(p?.change, 1000),
  }
}

// Aggregates only; groups smaller than MIN_GROUP are never broken out
export function summarizePulse(rows: any[]) {
  const groups = [...new Set(PULSE.map(p => p.g))]
  const fav = (rs: any[], ids: string[]) => {
    const v = rs.flatMap(r => ids.map(id => r.items?.[id])).filter(Boolean)
    return v.length ? Math.round(v.filter((x: number) => x >= 4).length / v.length * 100) : null
  }
  const enps = (rs: any[]) => {
    const v = rs.map(r => r.enps).filter((x: unknown) => typeof x === "number")
    return v.length ? Math.round((v.filter((x: number) => x >= 9).length - v.filter((x: number) => x <= 6).length) / v.length * 100) : null
  }
  const n = rows.length
  if (n < MIN_GROUP) return { n, hidden: true }
  const byGroup = groups.map(g => ({ g, v: fav(rows, PULSE.filter(p => p.g === g).map(p => p.id)) }))
  const byItem = PULSE.map(p => ({ id: p.id, g: p.g, t: p.t, v: fav(rows, [p.id]) }))
  const depts = Object.keys(DEPTS).map(d => {
    const r = rows.filter(x => x.dept === d)
    if (!r.length) return null
    if (r.length < MIN_GROUP) return { d, n: r.length, hidden: true }
    return { d, n: r.length, groups: groups.map(g => fav(r, PULSE.filter(p => p.g === g).map(p => p.id))), enps: enps(r) }
  }).filter(Boolean)
  const leave: Record<string, number> = {}
  rows.forEach(r => { if (r.leave) leave[r.leave] = (leave[r.leave] || 0) + 1 })
  const comments = rows.flatMap(r => [r.like && { k: "like", t: r.like }, r.change && { k: "change", t: r.change }].filter(Boolean))
  for (let i = comments.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [comments[i], comments[j]] = [comments[j], comments[i]] }
  return { n, groups, enps: enps(rows), overall: fav(rows, PULSE.map(p => p.id)), stay: fav(rows, ["h1"]), byGroup, byItem, depts, leave, comments }
}

export const STATUS = ["new", "interview", "reserve", "hire", "reject"]
const EDU = ["Бүрэн дунд", "Мэргэжлийн (ТМС, коллеж)", "Бакалавр", "Магистр, доктор"]
const EXP = ["Туршлагагүй", "1 жил хүртэл", "1–3 жил", "3–5 жил", "5-аас дээш жил"]
const LIC = ["A", "B", "C", "D", "E", "M"]

// The test set must be the one the server could have drawn: general items plus the position's own job pool
export function cleanApplicant(s: any) {
  const dept = clip(s?.dept, 80), position = clip(s?.position, 120)
  if (!DEPTS[dept as keyof typeof DEPTS]?.some((p: any) => p[0] === position)) throw new Error("Албан тушаал буруу байна.")
  const name = clip(s?.name, 80).trim(), phone = clip(s?.phone, 20).replace(/[^\d+ ]/g, "").trim()
  if (name.length < 3) throw new Error("Овог нэрээ бүтэн бичнэ үү.")
  if (phone.replace(/\D/g, "").length < 8) throw new Error("Утасны дугаараа зөв бичнэ үү.")
  if (s?.consent !== true) throw new Error("Мэдээлэл ашиглах зөвшөөрөл шаардлагатай.")
  const { fam, pool } = jobPool(dept, position)
  const jobIds = new Set(pool.map((q: any) => q.id))
  const questions: string[] = [...new Set<string>((Array.isArray(s?.questions) ? s.questions : []).map(String))]
  const commonIds = new Set(commonPool("apply", fam))
  const common = questions.filter(id => commonIds.has(id)), job = questions.filter(id => jobIds.has(id) && !commonIds.has(id))
  if (common.length !== APP_N_COMMON || job.length !== APP_N_JOB || questions.length !== APP_N_COMMON + APP_N_JOB) throw new Error("Шалгалтын асуулт буруу байна. Хуудсаа шинэчлээд дахин эхэлнэ үү.")
  const answers: Record<string, number> = {}
  const byPart = { common: { c: 0, t: common.length }, job: { c: 0, t: job.length } }
  let score = 0
  for (const id of questions) {
    const a = int(s?.answers?.[id], 0, KMAP[id].o.length - 1)
    if (a !== null) answers[id] = a
    if (a === KMAP[id].a) { score++; byPart[common.includes(id) ? "common" : "job"].c++ }
  }
  return {
    name, phone, email: clip(s?.email, 120).trim(), birthYear: int(s?.birthYear, 1950, 2010),
    district: clip(s?.district, 80), dept, position, family: fam,
    edu: EDU.includes(s?.edu) ? s.edu : "", major: clip(s?.major, 120), exp: EXP.includes(s?.exp) ? s.exp : "",
    lastJob: clip(s?.lastJob, 200), license: (Array.isArray(s?.license) ? s.license : []).filter((x: string) => LIC.includes(x)),
    startDate: clip(s?.startDate, 10), salary: clip(s?.salary, 40), why: clip(s?.why, 1500),
    startedAt: Number(s?.startedAt) || null, durationSec: int(s?.durationSec, 0, 86400) ?? 0,
    timedOut: s?.timedOut === true, away: int(s?.away, 0, 999) ?? 0,
    questions, common, answers, score, max: questions.length, byPart, self: cleanSelf(s?.self),
    status: "new", interview: {}, hrNote: "",
  }
}
