import type { Config } from "@netlify/functions"
import { staffStore, pulseStore, cleanStaff, cleanPulse, json } from "../lib/store.mts"

export default async (req: Request) => {
  let body: any
  try { body = await req.json() } catch { return json({ error: "Хүсэлт буруу байна." }, 400) }
  let staff
  try { staff = cleanStaff(body?.staff) } catch { return json({ error: "Алба, албан тушаал буруу байна." }, 400) }
  if (staff.name.length < 3) return json({ error: "Овог нэрээ бүтэн бичнэ үү." }, 400)
  const id = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`
  await staffStore().setJSON(id, { ...staff, id, submittedAt: Date.now() })
  if (body?.pulse) await pulseStore().setJSON(crypto.randomUUID(), cleanPulse(body.pulse, staff.dept, staff.tenure))
  return json({ ok: true })
}

export const config: Config = {
  path: "/api/submit",
  method: "POST",
  rateLimit: { windowLimit: 10, windowSize: 60, aggregateBy: ["ip", "domain"] },
}
