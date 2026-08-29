import {
  getCard,
  playCostTotal,
  type CardId,
  type CardType,
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

const CARD_TYPES: readonly CardType[] = [
  "instant",
  "reaction",
  "equipment",
  "overload",
  "ritual",
];

export interface DeckCostCardEntry {
  readonly id: CardId;
  readonly name: string;
  readonly type: CardType;
  readonly attribute: string;
  readonly cost: number;
  readonly copies: number;
}

export interface DeckCostBucket {
  /** 0–4 exact; {@link COST_CURVE_CAP} means 5+. */
  readonly bucket: number;
  readonly label: string;
  readonly total: number;
  readonly byType: Readonly<Record<CardType, number>>;
  readonly cards: readonly DeckCostCardEntry[];
}

export interface DeckCostSummary {
  readonly cardCount: number;
  readonly uniqueCards: number;
  readonly averageCost: number;
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
    byType: emptyByType(),
    cards: [] as DeckCostCardEntry[],
  }));

  let cardCount = 0;
  let costSum = 0;

  for (const [id, { def, copies }] of cardMap) {
    const cost = playCostTotal(def);
    const bucket = costBucket(cost);
    const row = bucketRows[bucket];
    if (row === undefined) continue;

    row.total += copies;
    row.byType[def.type] += copies;
    row.cards.push({
      id,
      name: def.name,
      type: def.type,
      attribute: def.attribute,
      cost,
      copies,
    });
    cardCount += copies;
    costSum += cost * copies;
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
    peakBucket,
    peakCount,
    buckets: bucketRows,
  };
}

export const deckCostTypeOrder = (): readonly CardType[] => CARD_TYPES;
