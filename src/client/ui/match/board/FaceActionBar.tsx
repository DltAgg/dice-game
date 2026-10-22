import {
  dieForCreature,
  formatHitClass,
  getCreatureDefinition,
  legalFaceActions,
  matchingTechniques,
  showingFaceCard,
  type CreatureId,
  type DieId,
  type GameState,
  type HitStrength,
  type HitType,
  type PlayerId,
} from "@server";
import { btnHand, btnHandPrimary } from "../styles";

function roleLabel(role: string | undefined): string {
  if (role === "starter") return "Starter";
  if (role === "extender") return "Extender";
  if (role === "finisher") return "Finisher";
  return "";
}

function classLabel(hit: {
  readonly hitStrength?: HitStrength;
  readonly hitType?: HitType;
}): string {
  if (hit.hitStrength === undefined || hit.hitType === undefined) return "";
  return formatHitClass({ hitStrength: hit.hitStrength, hitType: hit.hitType });
}

/**
 * A showing face is a simple hit any of your Fighters can take. A Technique
 * pairs the Active Fighter's face with another of this player's rolled faces.
 */
export function FaceActionBar({
  state,
  playerId,
  onUseFace,
  onUseTechnique,
}: {
  state: GameState;
  playerId: PlayerId;
  onUseFace: (creatureId: CreatureId) => void;
  onUseTechnique: (creatureId: CreatureId, techniqueId: string, secondaryDieId: DieId) => void;
}) {
  const player = state.players[playerId];
  if (player === undefined) return null;
  const activeId = player.activeCreatureId;
  const creature = state.creatures[activeId];
  const definition = creature === undefined ? undefined : getCreatureDefinition(creature.definitionId);
  const hits = legalFaceActions(state, playerId);
  const matches = matchingTechniques(state, playerId, activeId);
  if (hits.length === 0 && matches.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {hits.map((creatureId) => {
        const die = dieForCreature(state, creatureId);
        const face = die === undefined ? undefined : showingFaceCard(state, die.id);
        if (face === undefined) return null;
        const fighter = state.creatures[creatureId];
        const name =
          fighter === undefined
            ? "Fighter"
            : (getCreatureDefinition(fighter.definitionId)?.name ?? "Fighter");
        const label = [name, face.name, classLabel(face), roleLabel(face.sequenceRole)]
          .filter((part) => part !== "")
          .join(" · ");
        return (
          <button
            key={creatureId}
            type="button"
            className={btnHandPrimary}
            onClick={() => onUseFace(creatureId)}
          >
            {label}
          </button>
        );
      })}
      {matches.map((match) => {
        const technique = definition?.techniques?.find((entry) => entry.id === match.techniqueId);
        const secondary = showingFaceCard(state, match.secondaryDieId);
        const role = roleLabel(technique?.sequenceRole);
        const strike = technique === undefined ? "" : classLabel(technique);
        const label = [technique?.name ?? "Technique", secondary?.name, strike, role]
          .filter((part) => part !== undefined && part !== "")
          .join(" · ");
        return (
          <button
            key={`${match.techniqueId}:${match.secondaryDieId}`}
            type="button"
            className={btnHand}
            onClick={() => onUseTechnique(activeId, match.techniqueId, match.secondaryDieId)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
