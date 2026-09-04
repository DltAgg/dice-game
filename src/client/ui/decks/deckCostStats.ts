import {
  getCard,
  playCostTotal,
  type CardId,
  type CardType,
  type ForgeableFaceKind,
} from "@server";

/** Bucket label for costs ≥ 5. */
export const COST_CURVE_CAP = 5;

export const CARD_TYPE_LABELS: Record<CardType, string> = {
  instant: "Instant",
  reaction: "Reaction",
  equipment: "Equipment",
  overload: "Overload",
  ritual: "Ritual",
};

export const FORGE_KIND_LABELS: Record<ForgeableFaceKind, string> = {
  natural: "Natural",
  synthetic: "Synthetic",
};

const CARD_TYPES: readonly CardType[] = [
  "instant",
  "reaction",
  "equipment",
  "overload",
  "ritual",
];

const FORGE_KINDS: readonly ForgeableFaceKind[] = ["natural", "synthetic"];

export interface DeckCostCardEntry {
  readonly id: CardId;
  readonly name: string;
  readonly type: CardType;
  readonly forgeKind: ForgeableFaceKind;
  readonly attribute: string;
  readonly cost: number;
  readonly copies: number;
}

export interface DeckCostBucket {
  /** 0–4 exact; {@link COST_CURVE_CAP} means 5+. */
  readonly bucket: number;
  readonly label: string;
  readonly total: number;
  /** Sum of printed header cost × copies in this bucket. */
  readonly costWeight: number;
  readonly byType: Readonly<Record<CardType, number>>;
  readonly byForge: Readonly<Record<ForgeableFaceKind, number>>;
  readonly byForgeType: Readonly<
    Record<ForgeableFaceKind, Readonly<Record<CardType, number>>>
  >;
  readonly cards: readonly DeckCostCardEntry[];
}

export interface DeckCostSummary {
  readonly cardCount: number;
  readonly uniqueCards: number;
  readonly averageCost: number;
  readonly costWeight: number;
  readonly byForge: Readonly<Record<ForgeableFaceKind, number>>;
  readonly peakBucket: number;
  readonly peakCount: number;
  readonly buckets: readonly DeckCostBucket[];
}

function costBucket(total: number): number {
  return total >= COST_CURVE_CAP ? COST_CURVE_CAP : total;
}

function bucketLabel(bucket: number): string {
  return bucket >= COST_CURVE_CAP ? `${String(COST_CURVE_CAP)}+` : String(bucket);
}

function emptyByType(): Record<CardType, number> {
  return {
    instant: 0,
    reaction: 0,
    equipment: 0,
    overload: 0,
    ritual: 0,
  };
}

function emptyByForge(): Record<ForgeableFaceKind, number> {
  return { natural: 0, synthetic: 0 };
}

function emptyByForgeType(): Record<ForgeableFaceKind, Record<CardType, number>> {
  return { natural: emptyByType(), synthetic: emptyByType() };
}

/** Group deck copies into cost buckets for the tuning chart. */
export function summarizeDeckCosts(deck: readonly CardId[]): DeckCostSummary {
  const cardMap = new Map<
    CardId,
    { readonly def: NonNullable<ReturnType<typeof getCard>>; readonly copies: number }
  >();

  for (const id of deck) {
    const def = getCard(id);
    if (def === undefined) continue;
    const existing = cardMap.get(id);
    if (existing === undefined) {
      cardMap.set(id, { def, copies: 1 });
    } else {
      cardMap.set(id, { def: existing.def, copies: existing.copies + 1 });
    }
  }

  const bucketRows = Array.from({ length: COST_CURVE_CAP + 1 }, (_, bucket) => ({
    bucket,
    label: bucketLabel(bucket),
    total: 0,
    costWeight: 0,
    byType: emptyByType(),
    byForge: emptyByForge(),
    byForgeType: emptyByForgeType(),
    cards: [] as DeckCostCardEntry[],
  }));

  let cardCount = 0;
  let costSum = 0;
  const byForge = emptyByForge();

  for (const [id, { def, copies }] of cardMap) {
    const cost = playCostTotal(def);
    const bucket = costBucket(cost);
    const row = bucketRows[bucket];
    if (row === undefined) continue;

    const forgeKind = def.forge.kind;
    row.total += copies;
    row.costWeight += cost * copies;
    row.byType[def.type] += copies;
    row.byForge[forgeKind] += copies;
    row.byForgeType[forgeKind][def.type] += copies;
    row.cards.push({
      id,
      name: def.name,
      type: def.type,
      forgeKind,
      attribute: def.attribute,
      cost,
      copies,
    });
    cardCount += copies;
    costSum += cost * copies;
    byForge[forgeKind] += copies;
  }

  for (const row of bucketRows) {
    row.cards.sort((a, b) => a.name.localeCompare(b.name));
  }

  let peakBucket = 0;
  let peakCount = 0;
  for (const row of bucketRows) {
    if (row.total > peakCount) {
      peakCount = row.total;
      peakBucket = row.bucket;
    }
  }

  return {
    cardCount,
    uniqueCards: cardMap.size,
    averageCost: cardCount === 0 ? 0 : costSum / cardCount,
    costWeight: costSum,
    byForge,
    peakBucket,
    peakCount,
    buckets: bucketRows,
  };
}

export const deckCostTypeOrder = (): readonly CardType[] => CARD_TYPES;

export const deckCostForgeOrder = (): readonly ForgeableFaceKind[] => FORGE_KINDS;

export function formatTypeMix(byType: Readonly<Record<CardType, number>>): string {
  return deckCostTypeOrder()
    .filter((type) => byType[type] > 0)
    .map((type) => `${String(byType[type])} ${CARD_TYPE_LABELS[type]}`)
    .join(" / ");
}

/** Quantity × printed cost = pile-token weight for this bucket. */
export function formatBucketWeight(bucket: DeckCostBucket): string {
  if (bucket.total === 0) return "";
  return `${String(bucket.total)}×${bucket.label}=${String(bucket.costWeight)}`;
}
