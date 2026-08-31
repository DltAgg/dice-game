import {
  type GameState,
  type PlayerId,
} from "@server";
import {
  HandStrip,
} from "./HandStrip";
import {
  SymbolPool,
} from "./SymbolPool";
import {
  ZoneDocks,
} from "./ZoneDocks";

export function SpectatorSeatDock({
  state,
  playerId,
  phase,
  pendingReaction,
}: {
  state: GameState;
  playerId: PlayerId;
  phase: GameState["phase"];
  pendingReaction: boolean;
}) {
  return (
    <div className="space-y-2 rounded border border-stone-800/80 bg-black/20 p-2">
      <SymbolPool
        state={state}
        playerId={playerId}
        phase={phase}
        selected={null}
        onSelect={() => undefined}
      />
      <div className="flex items-end gap-3">
        <div className="min-w-0 flex-1 overflow-hidden">
          <HandStrip
            state={state}
            playerId={playerId}
            phase={phase}
            canAct={false}
            reactionWindow={pendingReaction}
            selected={null}
            onPlay={() => undefined}
            onForge={() => undefined}
            onOvercharge={() => undefined}
            onCancel={() => undefined}
            idleLabel="observing"
          />
        </div>
        <ZoneDocks state={state} playerId={playerId} />
      </div>
    </div>
  );
}
