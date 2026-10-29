import type { Config } from "@netlify/functions"
import { json, clip, isOpen } from "../lib/store.mts"
import { draw } from "../lib/bank.mjs"
import { DEPTS } from "../../public/assets/data.mjs"

// Hands out a question set without the answer key; scoring happens in submit/apply
export default async (req: Request) => {
  let body: any
  try { body = await req.json() } catch { return json({ error: "Хүсэлт буруу байна." }, 400) }
  const dept = clip(body?.dept, 80), position = clip(body?.position, 120)
  if (!DEPTS[dept as keyof typeof DEPTS]?.some((p: any) => p[0] === position)) return json({ error: "Алба, албан тушаал буруу байна." }, 400)
  if (body?.mode === "apply" && !(await isOpen(dept, position))) return json({ error: "Энэ ажлын байрны бүртгэл хаагдсан байна." }, 400)
  return json(draw(body?.mode === "apply" ? "apply" : "staff", dept, position))
}

export const config: Config = {
  path: "/api/quiz",
  method: "POST",
  rateLimit: { windowLimit: 30, windowSize: 60, aggregateBy: ["ip", "domain"] },
}
