import type { Config } from "@netlify/functions"
import { getOpenings, json } from "../lib/store.mts"

// Public list of positions currently open for applications
export default async () => json({ openings: await getOpenings() })

export const config: Config = { path: "/api/openings", method: "GET" }
