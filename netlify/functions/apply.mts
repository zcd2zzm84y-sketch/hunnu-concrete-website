import type { Config } from "@netlify/functions"
import { applicantStore, cleanApplicant, isOpen, json } from "../lib/store.mts"

export default async (req: Request) => {
  let body: any
  try { body = await req.json() } catch { return json({ error: "Хүсэлт буруу байна." }, 400) }
  let app
  try { app = cleanApplicant(body?.applicant) } catch (e: any) { return json({ error: e?.message || "Мэдээлэл буруу байна." }, 400) }
  if (!(await isOpen(app.dept, app.position))) return json({ error: "Энэ ажлын байрны бүртгэл хаагдсан байна." }, 400)
  const id = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`
  await applicantStore().setJSON(id, { ...app, id, submittedAt: Date.now() })
  return json({ ok: true })
}

export const config: Config = {
  path: "/api/apply",
  method: "POST",
  rateLimit: { windowLimit: 5, windowSize: 60, aggregateBy: ["ip", "domain"] },
}
