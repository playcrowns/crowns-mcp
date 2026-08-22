// Zod schemas for /api/v1/vassal/* routes.
// See src/schemas/README.md for how these get used.
//
// Vassal is the largest mutation surface in Crowns (23 body-bearing
// POST endpoints covering: vassalage negotiation, buyout, release
// proposal chains, rebellion). Request schemas cover every body-bearing
// endpoint (launch prep #5 tier 6). Response schemas follow the
// smoke-land-together rule: each smoke phase adds the response schemas
// for the routes it newly exercises. Routes outside the smoke Phase K
// cycle stay unschema'd on the response side (drift trap avoided).

import { z } from 'zod'
import { IsoTimestamp, UuidLoose } from './common.js'

// ── Primitives ─────────────────────────────────────────────────────

// Tribute percentage bounds come from config.game.vassal (typically
// 10–50). The route enforces the exact range; schema just validates
// shape (number in [0, 100]). Tight range kept as handler check.
const TributePct = z.number().min(0).max(100)

// USDC amount — used for buyout + release-proposal values. Non-negative;
// the route enforces the upper bound (config.game.vassal.maxTransferUsd,
// $100) so the ceiling stays one tunable knob rather than duplicated here.
const UsdcAmount = z.number().nonnegative()

// Battle plan for rebellion — same min-50 rule the attack plan uses.
const BattlePlan = z.string().min(50, 'Battle plan required (min 50 chars)')

// Defense plan for rebellion-defense.
const DefensePlan = z.string().min(50, 'Defense plan required (min 50 chars)')

// Generic message attachment (optional) — used across many vassal
// negotiation endpoints as a free-text note. No length requirement.
// F3: одно число с MAX_LENGTHS.vassal_message (sanitizer.js).
const OptionalMessage = z.string().max(1000, 'Vassal message is capped at 1000 characters').optional()

// ── Vassalage negotiation ──────────────────────────────────────────

// POST /vassal/request — propose vassalage to a liege.
// preferred_territory_id optional; liege decides what to grant.
export const VassalRequestRequestSchema = z.object({
  liege_kingdom_id: UuidLoose,
  message: OptionalMessage,
  proposed_tribute: TributePct,
  preferred_territory_id: UuidLoose.optional(),
})

// POST /vassal/cancel-request — vassal withdraws own pending request.
export const VassalCancelRequestRequestSchema = z.object({
  liege_kingdom_id: UuidLoose,
})

// POST /vassal/reject — liege rejects incoming vassal request.
export const VassalRejectRequestSchema = z.object({
  vassal_kingdom_id: UuidLoose,
  message: OptionalMessage,
})

// POST /vassal/counter — liege counters vassal's proposed_tribute.
export const VassalCounterRequestSchema = z.object({
  vassal_kingdom_id: UuidLoose,
  counter_tribute: TributePct,
  message: OptionalMessage,
})

// POST /vassal/accept-counter — vassal accepts liege counter.
export const VassalAcceptCounterRequestSchema = z.object({
  liege_kingdom_id: UuidLoose,
})

// POST /vassal/reject-counter — vassal rejects liege counter, ends
// negotiation.
export const VassalRejectCounterRequestSchema = z.object({
  liege_kingdom_id: UuidLoose,
})

// POST /vassal/accept — liege accepts vassal request; grants territory
// (optional — route picks a default if omitted). Auto-cancels the
// vassal's other pending requests.
export const VassalAcceptRequestSchema = z.object({
  vassal_kingdom_id: UuidLoose,
  territory_id: UuidLoose.optional(),
})

// POST /vassal/banish — liege expels vassal from service.
export const VassalBanishRequestSchema = z.object({
  vassal_kingdom_id: UuidLoose,
  message: OptionalMessage,
})

// ── Rebellion (war-v2 W5b1) — declare = a war with kind='rebellion'.
// The manifesto is the war_goal: public by design (§8 force-voice beat),
// same length bounds as a war goal.
export const RebellionRequestSchema = z.object({
  manifesto: z.string().min(20).max(2000),
})

// ── Freedom (vassal-initiated) ─────────────────────────────────────

// POST /vassal/request-freedom — vassal asks liege for peaceful release.
// No field required beyond an optional message.
export const VassalRequestFreedomRequestSchema = z.object({
  message: OptionalMessage,
})

// POST /vassal/grant-freedom — liege grants peaceful release.
export const VassalGrantFreedomRequestSchema = z.object({
  vassal_kingdom_id: UuidLoose,
})

// POST /vassal/deny-freedom — liege denies freedom request.
export const VassalDenyFreedomRequestSchema = z.object({
  vassal_kingdom_id: UuidLoose,
  message: OptionalMessage,
})

// ── Buyout (vassal-initiated paid release) ────────────────────────

// POST /vassal/buyout — vassal offers USDC to liege for freedom.
export const VassalBuyoutRequestSchema = z.object({
  amount: UsdcAmount,
  message: OptionalMessage,
})

// POST /vassal/accept-buyout — liege accepts buyout, receives payment.
export const VassalAcceptBuyoutRequestSchema = z.object({
  vassal_kingdom_id: UuidLoose,
})

// POST /vassal/reject-buyout — liege rejects buyout offer.
export const VassalRejectBuyoutRequestSchema = z.object({
  vassal_kingdom_id: UuidLoose,
  message: OptionalMessage,
})

// ── Release proposal chain (liege-initiated, possibly counter-offered) ──

// POST /vassal/propose-release — liege offers paid (or free) release to
// vassal. amount ≥ 0.
export const VassalProposeReleaseRequestSchema = z.object({
  vassal_kingdom_id: UuidLoose,
  amount: UsdcAmount,
  message: OptionalMessage,
})

// POST /vassal/cancel-release-proposal — liege withdraws a proposal.
export const VassalCancelReleaseProposalRequestSchema = z.object({
  vassal_kingdom_id: UuidLoose,
})

// POST /vassal/accept-release — vassal accepts release, pays amount.
export const VassalAcceptReleaseRequestSchema = z.object({
  proposal_id: UuidLoose,
})

// POST /vassal/counter-release — vassal counter-offers different amount.
export const VassalCounterReleaseRequestSchema = z.object({
  proposal_id: UuidLoose,
  counter_amount: UsdcAmount,
  message: OptionalMessage,
})

// POST /vassal/reject-release — vassal rejects liege's proposal.
export const VassalRejectReleaseRequestSchema = z.object({
  proposal_id: UuidLoose,
  reason: z.string().optional(),
})

// POST /vassal/accept-counter-release — liege accepts vassal's counter.
export const VassalAcceptCounterReleaseRequestSchema = z.object({
  proposal_id: UuidLoose,
})

// POST /vassal/reject-counter-release — liege rejects vassal's counter.
export const VassalRejectCounterReleaseRequestSchema = z.object({
  proposal_id: UuidLoose,
  reason: z.string().optional(),
})

// ── Rebellion ─────────────────────────────────────────────────────

// POST /vassal/rebellion — vassal declares war on liege for freedom.
// Needs 3+ territories + 72h cooldown (enforced in handler).
export const VassalRebellionRequestSchema = z.object({
  attack_plan: BattlePlan,
})

// POST /vassal/rebellion/defend — liege submits defense plan.
export const VassalRebellionDefendRequestSchema = z.object({
  vassal_kingdom_id: UuidLoose,
  defense_plan: DefensePlan,
})

// ── Response schemas (Phase K smoke — launch prep #7a.K) ──────────
//
// Responses for the four routes Phase K exercises. Response schemas
// for the other 19 vassal routes stay out of scope until a smoke phase
// exercises them (drift trap avoided).

// Response: POST /vassal/request — offer creation, no money moves yet.
// Handler returns a plain bag of the echoed request + pending-count
// budget state the UI uses to tell the requester how many more
// invitations they can send.
export const VassalRequestResponseSchema = z.strictObject({
  success: z.literal(true),
  message: z.string(),
  proposed_tribute: z.number(),
  preferred_territory_id: UuidLoose.nullable(),
  pending_requests_used: z.number().int().nonnegative(),
  pending_requests_max: z.number().int().positive(),
})

// Response: POST /vassal/accept — liege accepts, grants a territory,
// vassal goes `status='vassal'`. Returned by finalizeVassalage() inside
// the same transaction that flips the kingdom row + grants + builds
// fortress. `territory_granted.name` is nullable because the DB column
// is nullable (VARCHAR(64) NULL in schema.sql).
const GrantedTerritorySchema = z.strictObject({
  id: UuidLoose,
  polygon_id: z.string(),
  name: z.string().nullable(),
})

export const VassalAcceptResponseSchema = z.strictObject({
  success: z.literal(true),
  vassal: z.string(),
  liege: z.string(),
  tribute_percent: z.number(),
  territory_granted: GrantedTerritorySchema,
  immunity_until: IsoTimestamp,
})

// Response: POST /vassal/buyout — vassal offers USDC for freedom.
// The offer CARRIES the money (escrow-at-offer) — the response adds
// escrowed/event_id/expires_in_hours + tx_hash (settle) or idempotent
// (replayed payment).
export const VassalBuyoutResponseSchema = z.strictObject({
  success: z.literal(true),
  amount: z.number(),
  message: z.string(),
  escrowed: z.literal(true).optional(),
  event_id: UuidLoose.optional(),
  expires_in_hours: z.number().optional(),
  tx_hash: z.string().optional(),
  idempotent: z.literal(true).optional(),
})

// Response: POST /vassal/accept-buyout — on-chain vassal → operator →
// liege transfer via `vassal_payment_ledger`. `tx_hash` is the
// vassal_debit leg. Ledger reconciler advances to `confirmed` terminal
// state after applyVassalGameState runs inline.
export const VassalAcceptBuyoutResponseSchema = z.strictObject({
  success: z.literal(true),
  amount: z.number(),
  tx_hash: z.string(),
  message: z.string(),
})

// ── Remaining vassal responses ────────────────────────────────────
//
// The rest of the /vassal/* surface is covered here so Phase 2 middleware
// sees every route. Shapes are derived from the handler return statements.
// Each is intentionally narrow at the top + loose where the handler
// passes through payload fragments (scout's map rows, status's pending
// event payloads) whose column sets evolve with gameplay changes.

// GET /vassal/status — my liege / vassals / pending-negotiation summary.
const StatusVassalEntrySchema = z.strictObject({
  id: UuidLoose,
  name: z.string(),
  tribute_percent: z.number(),
  territory_count: z.number(),
})

const StatusLiegeSchema = z.strictObject({
  id: UuidLoose,
  name: z.string(),
  tribute_percent: z.number(),
})

export const VassalStatusResponseSchema = z.strictObject({
  kingdom_id: UuidLoose,
  kingdom_name: z.string(),
  status: z.string(),
  is_vassal: z.boolean(),
  liege: StatusLiegeSchema.nullable(),
  vassals: z.array(StatusVassalEntrySchema),
  max_vassals: z.number(),
  pending_incoming: z.array(z.looseObject({})),
  pending_outgoing: z.array(z.looseObject({})),
})

// POST /vassal/cancel-request — minimal ack.
export const VassalCancelRequestResponseSchema = z.strictObject({
  success: z.literal(true),
  message: z.string(),
})

// GET /vassal/scout — full political-map snapshot for a landless agent.
// Inner rows stay loose because scout grows with gameplay metadata
// (blocked_reasons, enrichedGrantable neighbor analysis, etc.) — the
// envelope + key identifiers are the stable contract.
export const VassalScoutResponseSchema = z.strictObject({
  kingdom_id: UuidLoose,
  kingdom_name: z.string(),
  kingdom_status: z.string(),
  map: z.strictObject({
    territories: z.array(z.looseObject({ polygon_id: z.string() })),
  }),
  viable_lieges: z.array(z.looseObject({
    id: UuidLoose,
    name: z.string(),
  })),
  my_pending_request_count: z.number(),
  my_pending_request_max: z.number(),
  tribute_range: z.strictObject({
    min: z.number(),
    max: z.number(),
  }),
})

// POST /vassal/reject — minimal ack.
export const VassalRejectResponseSchema = z.strictObject({
  success: z.literal(true),
  message: z.string(),
})

// POST /vassal/counter — counter-offer acknowledged, awaiting vassal.
export const VassalCounterResponseSchema = z.strictObject({
  success: z.literal(true),
  message: z.string(),
  counter_tribute: z.number(),
})

// POST /vassal/accept-counter — returns finalizeVassalage() shape.
// Aliased to VassalAcceptResponseSchema.
export const VassalAcceptCounterResponseSchema = VassalAcceptResponseSchema

// POST /vassal/reject-counter — minimal ack.
export const VassalRejectCounterResponseSchema = z.strictObject({
  success: z.literal(true),
  message: z.string(),
})

// POST /vassal/banish — minimal ack.
export const VassalBanishResponseSchema = z.strictObject({
  success: z.literal(true),
  message: z.string(),
})

// POST /vassal/request-freedom — minimal ack.
export const VassalRequestFreedomResponseSchema = z.strictObject({
  success: z.literal(true),
  message: z.string(),
})

// POST /vassal/grant-freedom — minimal ack.
export const VassalGrantFreedomResponseSchema = z.strictObject({
  success: z.literal(true),
  message: z.string(),
})

// POST /vassal/deny-freedom — minimal ack.
export const VassalDenyFreedomResponseSchema = z.strictObject({
  success: z.literal(true),
  message: z.string(),
})

// POST /vassal/reject-buyout — minimal ack.
export const VassalRejectBuyoutResponseSchema = z.strictObject({
  success: z.literal(true),
  message: z.string(),
})

// POST /vassal/propose-release — proposal id + expiry window.
export const VassalProposeReleaseResponseSchema = z.strictObject({
  success: z.literal(true),
  proposal_id: UuidLoose,
  amount: z.number(),
  expires_at: IsoTimestamp,
  message: z.string(),
})

// POST /vassal/cancel-release-proposal — minimal ack.
export const VassalCancelReleaseProposalResponseSchema = z.strictObject({
  success: z.literal(true),
  message: z.string(),
})

// POST /vassal/accept-release — two branches:
//   - paid amount > 0 → returns tx_hash + immunity_until.
//   - free amount === 0 → same fields but tx_hash is null.
// The handler shape is identical across branches; tx_hash nullable absorbs
// the free path.
export const VassalAcceptReleaseResponseSchema = z.strictObject({
  success: z.literal(true),
  proposal_id: UuidLoose,
  amount: z.number(),
  tx_hash: z.string().nullable(),
  immunity_until: IsoTimestamp,
  message: z.string(),
})

// POST /vassal/counter-release — counter registered, awaiting liege.
// x402 rail: the counter CARRIES the money (escrow-at-offer) — adds
// escrowed + tx_hash (settle) or idempotent (replayed payment).
export const VassalCounterReleaseResponseSchema = z.strictObject({
  success: z.literal(true),
  proposal_id: UuidLoose,
  original_amount: z.number(),
  counter_amount: z.number(),
  message: z.string(),
  escrowed: z.literal(true).optional(),
  tx_hash: z.string().optional(),
  idempotent: z.literal(true).optional(),
})

// POST /vassal/reject-release — minimal ack.
export const VassalRejectReleaseResponseSchema = z.strictObject({
  success: z.literal(true),
  message: z.string(),
})

// POST /vassal/accept-counter-release — paid/free branches identical
// envelope; tx_hash nullable for free branch (counter_amount = 0).
export const VassalAcceptCounterReleaseResponseSchema = z.strictObject({
  success: z.literal(true),
  proposal_id: UuidLoose,
  amount: z.number(),
  tx_hash: z.string().nullable(),
  message: z.string(),
})

// POST /vassal/reject-counter-release — minimal ack.
export const VassalRejectCounterReleaseResponseSchema = z.strictObject({
  success: z.literal(true),
  message: z.string(),
})

// POST /vassal/rebellion — a real war declaration since W5b1 (§8):
// same envelope as POST /war/declare (the rebellion IS a war row with
// kind='rebellion'); the registry reuses DeclareWarResponseSchema.
export { DeclareWarResponseSchema as VassalRebellionResponseSchema } from './war.js'

// 410 Gone since W5b1: rebellion defense lives on the war
// (POST /war/:id/defense); the stub answers with the pointer.
export const VassalRebellionDefendResponseSchema = z.strictObject({
  error: z.string(),
  use_instead: z.string().optional(),
})

export const VassalGrantableTerritoriesResponseSchema = z.strictObject({
  territories: z.array(z.looseObject({ id: UuidLoose })),
  count: z.number(),
})
