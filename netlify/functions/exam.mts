import type { Config } from "@netlify/functions"
import { applicantStore, scoreTest, json, clip } from "../lib/store.mts"
import { KMAP } from "../lib/bank.mjs"
import { APP_MINUTES } from "../../public/assets/data.mjs"
import { createHash } from "node:crypto"

// Knowledge test taken at the HR office. HR starts it from the dashboard (admin action "examStart"),
// which draws the questions and gives a one-time link. The timer starts when the link is first opened.
const sha = (t: string) => createHash("sha256").update(t).digest("hex")
const LINK_HOURS = 12, GRACE_SEC = 90

async function find(id: string, token: string) {
  const store = applicantStore(), row: any = await store.get(id, { type: "json" })
  const ex = row?.exam
  if (!row || !ex?.hash || ex.hash !== sha(token)) return { err: json({ error: "Шалгалтын холбоос буруу эсвэл ашиглагдсан байна. Хүний нөөцийн ажилтанд хандана уу." }, 404) }
  if (Date.now() - ex.issuedAt > LINK_HOURS * 3600e3) return { err: json({ error: "Шалгалтын холбоосын хугацаа дууссан. Хүний нөөцийн ажилтан шинээр эхлүүлнэ." }, 410) }
  return { store, row, ex }
}

export default async (req: Request) => {
  if (req.method === "GET") {
    const u = new URL(req.url), f = await find(clip(u.searchParams.get("id"), 80), clip(u.searchParams.get("t"), 80))
    if (f.err) return f.err
    const { store, row, ex } = f
    if (!ex.startedAt) { ex.startedAt = Date.now(); await store.setJSON(row.id, { ...row, exam: ex }) }
    return json({
      name: row.name, dept: row.dept, position: row.position, family: row.family, minutes: APP_MINUTES,
      startedAt: ex.startedAt, now: Date.now(), order: ex.order, common: ex.common,
      qs: Object.fromEntries(ex.order.filter((id: string) => KMAP[id]).map((id: string) => [id, { q: KMAP[id].q, o: KMAP[id].o }])),
    })
  }
  let b: any
  try { b = await req.json() } catch { return json({ error: "Хүсэлт буруу байна." }, 400) }
  const f = await find(clip(b?.id, 80), clip(b?.t, 80))
  if (f.err) return f.err
  const { store, row, ex } = f
  const started = ex.startedAt || Date.now(), elapsed = Math.round((Date.now() - started) / 1000)
  const res = scoreTest(ex, b)
  const { exam, ...rest } = row
  const next = {
    ...rest, ...res, tested: true, testedAt: Date.now(), startedAt: started,
    durationSec: Math.min(elapsed, APP_MINUTES * 60), timedOut: b?.timedOut === true || elapsed > APP_MINUTES * 60 + GRACE_SEC,
  }
  await store.setJSON(row.id, next)
  return json({ ok: true })
}

export const config: Config = {
  path: "/api/exam",
  method: ["GET", "POST"],
  rateLimit: { windowLimit: 30, windowSize: 60, aggregateBy: ["ip", "domain"] },
}
