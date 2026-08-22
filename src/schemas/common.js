// Common Zod building blocks shared across endpoint schemas.
// Keep small — split when it stops being obvious what's shared.

import { z } from 'zod'

// pg NUMERIC columns arrive as strings by default (no global type parser
// is configured in src/db/client.js). Some response paths `parseFloat`
// them (e.g. kingdom.total_earned → number), others hand them through raw
// (e.g. transactions[].amount → string). Accept both until a later
// session normalises — tracked in tech_debt_backlog.md under the coming
// "numeric-string normalisation" item.
export const NumberOrNumericString = z.union([
  z.number(),
  z.string().regex(/^-?\d+(\.\d+)?$/, 'numeric string'),
])

// Timestamps travel in two shapes at different points in the response
// lifecycle:
//
//   - Before `JSON.stringify` (what the Phase 2 `preSerialization` hook
//     sees): pg driver returns TIMESTAMPTZ columns as native JS `Date`
//     objects by default. Handlers that pass these straight into the
//     response body — e.g. `season[0].started_at` — thus hold Date
//     instances until Fastify serialises them.
//
//   - After serialisation (what smoke-e2e + any HTTP consumer sees):
//     Date objects round-trip through JSON as ISO-8601 strings.
//
// Schema must accept both so the same `IsoTimestamp` definition works
// from both validation vantage points. Using a union rather than
// `z.coerce.string()` preserves the exact runtime shape — smoke sees
// strings, middleware sees Date, neither gets coerced in place.
export const IsoTimestamp = z.union([z.string(), z.date()])

// Kingdom / territory / polygon id shapes are UUIDs in the DB but our
// routes often accept polygon-id aliases ("t_1234"). We don't lock these
// down at the schema level yet — tracked as a follow-up.
export const UuidLoose = z.string().min(1)

// ── Payload-key aliases (S0 fix, 2026-07-12) ─────────────────────────
// S0 traces: every fleet burned paid turns guessing key names — checkin
// vocabulary vs action payloads diverged (`building` vs `building_type`,
// `polygon_id` vs `territory_id`, `army` vs `committed_army`, `content`/
// `note` vs `text`, `race_id` vs `event_id`); k15 (llama-3.3) retried all
// five building types 25+ times off a misleading validation error.
//
// Fix has two layers sharing ONE dictionary:
//  1. withPayloadAliases(schema, map) — the schema silently accepts the
//     alias key and renames it to the canonical one (no round-trip lost;
//     docs keep teaching canonical names). Canonical key present → alias
//     is dropped, never overrides.
//  2. The global error handler (src/index.js) uses PAYLOAD_KEY_HINTS to
//     append "you sent 'X' — the field is called 'Y'" when validation
//     still fails — the safety net for schemas we didn't wrap.
export function withPayloadAliases(schema, aliases) {
  const wrapped = z.preprocess((value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return value
    const out = { ...value }
    for (const [alias, canonical] of Object.entries(aliases)) {
      if (!(alias in out)) continue
      if (!(canonical in out)) out[canonical] = out[alias]
      delete out[alias] // leftover alias must not trip strictObject
    }
    return out
  }, schema)
  // toMcpShape (src/mcp/adapter.js) introspects `.shape` to mirror HTTP
  // schemas into MCP tool inputs — preprocess wrappers don't expose it,
  // so carry the inner object's shape across (canonical fields only:
  // MCP tools teach canonical names, aliases are HTTP-side forgiveness).
  wrapped.shape = schema.shape
  return wrapped
}

// alias key → canonical field name. Used for error-message hints ONLY
// (never a blind global rename): the hint fires when the alias key is in
// the failing request body — precise, so a wrong suggestion can't happen.
export const PAYLOAD_KEY_HINTS = {
  building: 'building_type',
  polygon_id: 'territory_id',
  territory: 'territory_id',
  army: 'committed_army',
  troops: 'committed_army',
  content: 'text',
  note: 'text',
  race_id: 'event_id',
  treasure_id: 'event_id',
}
