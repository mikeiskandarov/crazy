import type {CandidateEvent} from './event-detector';

const typeWeight: Record<CandidateEvent['type'], number> = {
  'near-death': 1_250,
  recovery: 1_180,
  'new-peak': 900,
  'big-hit': 1_040,
  'mass-elimination': 1_100,
  'leader-change': 920,
  bust: 1_300,
  'target-hit': 1_450,
};

export function scoreInterestingness(event: CandidateEvent): number {
  const magnitudeScore = Math.min(2_000, Math.round(Math.log10(Math.max(1, event.magnitude)) * 420));
  return typeWeight[event.type] + magnitudeScore + event.rarityEstimateMilli;
}

export function rankInterestingEvents(events: CandidateEvent[]): CandidateEvent[] {
  return [...events].sort((left, right) => scoreInterestingness(right) - scoreInterestingness(left) || left.round - right.round || left.eventId.localeCompare(right.eventId));
}
