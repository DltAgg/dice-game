import {
  attributeLabel,
  ATTRIBUTES,
  type GameState,
  type PlayerId,
} from "@server";

/** Persistent seat fuel for attacks / ritual Active-when / Spend (spec `016`). */
export function AttributePile({
  state,
  playerId,
  dense = false,
}: {
  state: GameState;
  playerId: PlayerId;
  dense?: boolean;
}) {
  const pile = state.players[playerId]?.attributePool ?? {};
  const held = ATTRIBUTES.filter((attribute) => (pile[attribute] ?? 0) > 0);

  return (
    <div
      className={
        dense
          ? "flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto"
          : "flex flex-wrap items-center gap-1.5"
      }
    >
      <span className="text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-stone-500">
        Attribute pile
      </span>
      <div className={dense ? "flex flex-wrap content-start gap-1.5" : "contents"}>
        {held.length === 0 ? (
          <span className="text-[0.65rem] text-stone-600">empty · rolls bank here</span>
        ) : (
          held.map((attribute) => (
            <span
              key={attribute}
              className="rounded border border-stone-700 bg-stone-900/90 px-1.5 py-0.5 text-[0.65rem] capitalize text-stone-100"
            >
              {attributeLabel(attribute)} {String(pile[attribute])}
            </span>
          ))
        )}
      </div>
    </div>
  );
}
