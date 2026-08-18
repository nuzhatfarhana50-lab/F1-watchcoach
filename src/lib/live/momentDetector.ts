import { createHash } from "node:crypto";

import type { OpenF1SessionEvidence } from "@/lib/f1/providers/contracts";

import type { LiveMomentCandidate, LiveMomentType } from "./types";

type CandidateInput = Omit<LiveMomentCandidate, "id" | "sessionKey">;

export function detectMoments(sessionKey: number, evidence: OpenF1SessionEvidence): readonly LiveMomentCandidate[] {
  const candidates: CandidateInput[] = [];

  for (const stop of evidence.pitStops) {
    candidates.push({
      type: "PIT_STOP",
      title: `Car ${stop.driverNumber} pits on lap ${stop.lapNumber}`,
      summary: `OpenF1 recorded a pit-lane visit for car ${stop.driverNumber}.`,
      confidence: 0.99,
      lapNumber: stop.lapNumber,
      occurredAt: stop.occurredAt,
      driverNumbers: [stop.driverNumber],
      evidenceExternalIds: [stop.provenance.externalId],
    });
  }

  for (const stint of evidence.stints.filter((item) => item.stintNumber > 1)) {
    candidates.push({
      type: "STRATEGY_CHANGE",
      title: `Car ${stint.driverNumber} starts a ${stint.compound} stint`,
      summary: `A new stint began on lap ${stint.startLap}, providing a structured strategy-change signal.`,
      confidence: 0.93,
      lapNumber: stint.startLap,
      driverNumbers: [stint.driverNumber],
      evidenceExternalIds: [stint.provenance.externalId],
    });
  }

  for (const event of evidence.raceControl) {
    const classification = classifyRaceControl(event.category, event.message, event.flag);
    if (!classification) continue;
    candidates.push({
      type: classification.type,
      title: classification.title,
      summary: event.message,
      confidence: classification.confidence,
      lapNumber: event.lapNumber,
      occurredAt: event.occurredAt,
      driverNumbers: event.driverNumber ? [event.driverNumber] : [],
      evidenceExternalIds: [event.provenance.externalId],
    });
  }

  candidates.push(...detectPositionChanges(evidence));

  const unique = new Map<string, LiveMomentCandidate>();
  for (const candidate of candidates.filter((item) => item.confidence >= 0.9)) {
    const id = deterministicUuid(`${sessionKey}:${candidate.type}:${candidate.evidenceExternalIds.join(":")}`);
    unique.set(id, { ...candidate, id, sessionKey });
  }
  return [...unique.values()].sort((left, right) => (left.occurredAt ?? "").localeCompare(right.occurredAt ?? ""));
}

function classifyRaceControl(category: string, message: string, flag?: string): { type: LiveMomentType; title: string; confidence: number } | null {
  const text = `${category} ${message} ${flag ?? ""}`.toUpperCase();
  if (text.includes("VIRTUAL SAFETY CAR") || text.includes(" VSC")) return { type: "VIRTUAL_SAFETY_CAR", title: "Virtual Safety Car deployed", confidence: 0.99 };
  if (text.includes("SAFETY CAR")) return { type: "SAFETY_CAR", title: "Safety Car deployed", confidence: 0.99 };
  if (/(^|\s)RED FLAG(\s|$)/.test(text)) return { type: "RED_FLAG", title: "Session red-flagged", confidence: 0.99 };
  if (text.includes("PENALTY")) return { type: "PENALTY", title: "Penalty issued", confidence: 0.98 };
  if (text.includes("CRASH") || text.includes("INCIDENT") || text.includes("STOPPED")) return { type: "CRASH", title: "On-track incident reported", confidence: 0.92 };
  if (text.includes("TYRE") && (text.includes("DEBRIS") || text.includes("PUNCTURE"))) return { type: "TYRE_DEGRADATION", title: "Tyre event reported", confidence: 0.9 };
  return null;
}

function detectPositionChanges(evidence: OpenF1SessionEvidence): CandidateInput[] {
  const byDriver = new Map<number, typeof evidence.positions[number][]>();
  for (const position of evidence.positions) {
    const records = byDriver.get(position.driverNumber) ?? [];
    records.push(position);
    byDriver.set(position.driverNumber, records);
  }
  const results: CandidateInput[] = [];
  for (const [driverNumber, records] of byDriver) {
    records.sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
    for (let index = 1; index < records.length; index += 1) {
      const before = records[index - 1];
      const after = records[index];
      if (!before || !after || after.position !== before.position - 1) continue;
      results.push({
        type: "OVERTAKE",
        title: `Car ${driverNumber} moves to position ${after.position}`,
        summary: `Successive timing records show car ${driverNumber} gaining exactly one position.`,
        confidence: 0.9,
        occurredAt: after.recordedAt,
        driverNumbers: [driverNumber],
        evidenceExternalIds: [before.provenance.externalId, after.provenance.externalId],
      });
    }
  }
  return results;
}

function deterministicUuid(value: string): string {
  const hash = createHash("sha256").update(value).digest("hex").slice(0, 32).split("");
  hash[12] = "4";
  hash[16] = ["8", "9", "a", "b"][Number.parseInt(hash[16] ?? "0", 16) % 4] ?? "8";
  const compact = hash.join("");
  return `${compact.slice(0, 8)}-${compact.slice(8, 12)}-${compact.slice(12, 16)}-${compact.slice(16, 20)}-${compact.slice(20)}`;
}
