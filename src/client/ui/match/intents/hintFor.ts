import {
  formatFaceKind,
  getCard,
  hasLegalReactionOffer,
  type CardInstanceId,
  type CardType,
  type CreatureChoiceFilter,
  type DieChoiceFilter,
  type DieSlotChoiceFilter,
  type GameState,
} from "@server";
import {
  type Intent,
} from "./types";

export function playDefHasOverload(state: GameState, cardInstanceId: CardInstanceId): boolean {
  const instance = state.cards[cardInstanceId];
  if (instance === undefined) return false;
  return getCard(instance.cardId)?.overload !== undefined;
}

export function forgeFacesNeededFor(state: GameState, cardInstanceId: CardInstanceId): number {
  const instance = state.cards[cardInstanceId];
  if (instance === undefined) return 1;
  return getCard(instance.cardId)?.forge.faces ?? 1;
}

export function chooseCreatureFilterHint(filter: CreatureChoiceFilter): string {
  switch (filter) {
    case "ally":
      return "Choose one of your creatures (overload / effect target).";
    case "enemy":
      return "Choose an enemy creature (overload / effect target).";
    case "self":
      return "Confirm the source creature, or pick it on the board.";
    case "ally-other":
      return "Choose a different allied creature.";
    case "allied-frontline":
      return "Choose an allied frontline creature.";
    case "allied-frontline-other":
      return "Choose a different allied frontline creature (reposition / swap).";
    case "ally-with-toxin":
      return "Choose an allied creature with toxin.";
    case "enemy-with-toxin":
      return "Choose an enemy creature with toxin.";
    case "ally-damage-over-half":
      return "Choose an allied creature with more than half damage.";
    case "ally-with-tokens":
      return "Choose an allied creature — the strip targets that owner's attribute pile.";
    case "adjacent-ally":
      return "Choose an adjacent allied creature.";
  }
}

export function chooseDieFilterHint(filter: DieChoiceFilter): string {
  switch (filter) {
    case "owned-retainable":
      return "Choose one of your rolled dice to retain.";
    case "owned-rolled":
      return "Choose one of your rolled dice.";
    case "any-synthetic-corruption":
      return "Choose a die that has a synthetic Corruption face.";
  }
}

export function chooseDieSlotFilterHint(filter: DieSlotChoiceFilter): string {
  switch (filter) {
    case "opposing-synthetic":
      return "Choose an opposing synthetic die face.";
    case "opposing-natural":
      return "Choose an opposing natural die face.";
    case "opposing-corrupted":
      return "Choose an opposing Corrupted face (Corruption markers).";
    case "opposing-corrupted-with-other-slot":
      return "Choose an opposing Corrupted face on a die that has another slot.";
    case "same-die-other-slot":
      return "Choose another face on the same die.";
    case "appeared-synthetic-this-roll":
      return "Choose a synthetic face that appeared this roll.";
  }
}

export function formatCardTypeList(types: readonly CardType[]): string {
  const labels = types.map((type) => type.charAt(0).toUpperCase() + type.slice(1));
  if (labels.length === 0) return "card";
  if (labels.length === 1) return labels[0] ?? "card";
  if (labels.length === 2) return `${labels[0] ?? ""} or ${labels[1] ?? ""}`;
  return `${labels.slice(0, -1).join(", ")}, or ${labels[labels.length - 1] ?? ""}`;
}

export function maxPlayCostPhrase(maxPlayCost: number): string {
  return maxPlayCost === 1
    ? "cost 1 pile token or less"
    : `cost ${String(maxPlayCost)} pile tokens or less`;
}

export function hintFor(intent: Intent, state: GameState, isPendingChooser: boolean): string {
  if (state.pendingDecision?.type === "search-deck") {
    const types = formatCardTypeList(state.pendingDecision.filter);
    return isPendingChooser
      ? `Choose ${types} cards from the deck search, then confirm.`
      : "Waiting for the opponent to search their deck.";
  }
  if (state.pendingDecision?.type === "search-graveyard") {
    const cost =
      state.pendingDecision.maxPlayCost !== undefined
        ? ` that ${maxPlayCostPhrase(state.pendingDecision.maxPlayCost)}`
        : "";
    return isPendingChooser
      ? `Choose up to ${String(state.pendingDecision.amount)} card(s)${cost} from your graveyard to return to hand.`
      : "Waiting for the opponent to choose from their graveyard.";
  }
  if (state.pendingDecision?.type === "discard-cards") {
    return isPendingChooser
      ? `Choose ${String(state.pendingDecision.amount)} card(s) from your hand to discard.`
      : "Waiting for the opponent to discard.";
  }
  if (state.pendingDecision?.type === "choose-creature") {
    if (!isPendingChooser) return "Waiting for the opponent to choose a creature.";
    const filterHint = chooseCreatureFilterHint(state.pendingDecision.filter);
    return state.pendingDecision.optional === true
      ? `${filterHint} Or Decline.`
      : filterHint;
  }
  if (state.pendingDecision?.type === "choose-ritual") {
    if (!isPendingChooser) return "Waiting for the opponent to choose a ritual.";
    return "Choose an opposing ritual on the field to destroy.";
  }
  if (state.pendingDecision?.type === "choose-equipment") {
    return isPendingChooser
      ? "Choose 1 Equipment on that creature to destroy."
      : "Waiting for the opponent to choose equipment to destroy.";
  }
  if (state.pendingDecision?.type === "choose-attribute-tokens") {
    const mode = state.pendingDecision.mode ?? "discard";
    if (mode === "transfer" || mode === "copy") {
      return isPendingChooser
        ? "Pack-feed move/copy is deferred — this choice cannot be completed yet."
        : "Waiting on a deferred pack-feed choice.";
    }
    return isPendingChooser
      ? `Choose ${String(state.pendingDecision.amount)} pip(s) from that creature owner's attribute pile to discard.`
      : "Waiting for the opponent to discard from an attribute pile.";
  }
  if (state.pendingDecision?.type === "forge-faces") {
    if (!isPendingChooser) {
      return "Waiting for the opponent to choose a face from their pool to install on your die.";
    }
    const pending = state.pendingDecision;
    const kind = formatFaceKind(pending.kind);
    const where = pending.target === "own-die" ? "one of your dice" : "one of the opponent's dice";
    return `Choose a ${kind} ${pending.attribute} face from your face pool, then install it on ${where} (${String(pending.faces)} ${pending.faces === 1 ? "copy" : "copies"}).`;
  }
  if (state.pendingDecision?.type === "replace-synthetic-face") {
    if (!isPendingChooser) {
      return "Waiting for the opponent to replace a Synthetic face on their die.";
    }
    const pending = state.pendingDecision;
    const kind = formatFaceKind(pending.kind);
    return `Choose a ${kind} ${pending.attribute} face on your die to uninstall, then a different matching face from your pool to install (no forge-draw).`;
  }
  if (state.pendingDecision?.type === "choose-die") {
    if (!isPendingChooser) return "Waiting for the opponent to choose a die.";
    const base = chooseDieFilterHint(state.pendingDecision.filter);
    return state.pendingDecision.optional === true ? `${base} Or Decline.` : base;
  }
  if (state.pendingDecision?.type === "convert-symbols") {
    return isPendingChooser
      ? `Convert up to ${String(state.pendingDecision.amount)} eligible symbol(s) into Natural attributes (or confirm with fewer / none).`
      : "Waiting for the opponent to convert symbols.";
  }
  if (state.pendingDecision?.type === "copy-pool-symbol") {
    return isPendingChooser
      ? "Choose another available pool symbol type to copy."
      : "Waiting for the opponent to copy a pool symbol.";
  }
  if (state.pendingDecision?.type === "replay-graveyard-tactic") {
    return isPendingChooser
      ? "Choose an Instant or Ritual from your graveyard to replay (no Energy / Requires)."
      : "Waiting for the opponent to replay a graveyard tactic.";
  }
  if (state.pendingDecision?.type === "look-top-deck") {
    return isPendingChooser
      ? "Look at the top cards: pick one to keep in hand (the other goes to the bottom)."
      : "Waiting for the opponent to look at their deck.";
  }
  if (state.pendingDecision?.type === "peek-deck") {
    return isPendingChooser
      ? "Peek at the top card: Keep it on top, or put it on the bottom."
      : "Waiting for the opponent to peek at their deck.";
  }
  if (state.pendingDecision?.type === "dark-pact") {
    return isPendingChooser
      ? "Choose exactly two Rituals from your deck with different attributes."
      : "Waiting for the opponent to resolve Dark Pact.";
  }
  if (state.pendingDecision?.type === "mind-control") {
    return isPendingChooser
      ? "Mind Control: strip all overloads from one opposing face, or one overload from each of up to two faces."
      : "Waiting for the opponent to resolve Mind Control.";
  }
  if (state.pendingDecision?.type === "split-damage") {
    return isPendingChooser
      ? `Assign ${String(state.pendingDecision.amount)} damage across up to ${String(state.pendingDecision.maxTargets)} creature(s).`
      : "Waiting for the opponent to assign split damage.";
  }
  if (state.pendingDecision?.type === "optional-reroll") {
    return isPendingChooser
      ? "Accept or decline the optional die reroll."
      : "Waiting for the opponent to decide on a reroll.";
  }
  if (state.pendingDecision?.type === "choose-die-slot") {
    if (!isPendingChooser) return "Waiting for the opponent to choose a die face.";
    const base = chooseDieSlotFilterHint(state.pendingDecision.filter);
    return state.pendingDecision.optional === true ? `${base} Or Decline.` : base;
  }
  if (state.pendingDecision?.type === "choose-pool-symbol") {
    return isPendingChooser
      ? "Choose a synthetic symbol from your pool (Catalyst wildcard)."
      : "Waiting for the opponent to choose a pool symbol.";
  }
  if (state.pendingDecision?.type === "optional-overcharge") {
    return isPendingChooser
      ? `Accept Overcharge (+${String(state.pendingDecision.amount)} Energy, suppress inherent next roll) or Decline.`
      : "Waiting for the opponent to decide on Overcharge.";
  }
  if (state.pendingDecision?.type === "optional-bonus-attack") {
    return isPendingChooser
      ? "Instinct: Decline, or declare this creature's basic attack (pick a legal target)."
      : "Waiting for the opponent to decide on a bonus basic attack.";
  }
  if (state.pendingDecision?.type === "reaction-priority") {
    const who = state.pendingDecision.priorityPlayerId;
    if (!hasLegalReactionOffer(state, who)) {
      return "No legal response — passing priority…";
    }
    return isPendingChooser
      ? `Your reaction priority (${who}): Pass, or play a Reaction / activate a ready ritual-reaction.`
      : `${who} holds reaction priority. Waiting.`;
  }
  if (state.status === "finished") {
    return "Match over — the opposing legendary was defeated. Start a new match to play again.";
  }

  switch (intent.kind) {
    case "absorb": {
      const pip = state.symbols[intent.symbolId];
      const name = pip?.symbol ?? "Shield";
      return `Absorb ${name}: click a living owned creature to grant Shield. Illegal targets stay dim.`;
    }
    case "attack":
      return intent.attackId === undefined
        ? "Choose an attack on the selected creature."
        : "Click an enemy creature to attack.";
    case "play":
      if (playDefHasOverload(state, intent.cardInstanceId)) {
        return "Overload: choose which face card to attach to (shared across all dice showing it).";
      }
      return "Click a legal creature (equipment / targeted effect).";
    case "forge":
      if (intent.dieId === undefined) {
        return forgeFacesNeededFor(state, intent.cardInstanceId) === 1
          ? "Forge: click the die face to overwrite."
          : "Forge: choose which die to modify.";
      }
      if ((intent.slotIndexes?.length ?? 0) < forgeFacesNeededFor(state, intent.cardInstanceId)) {
        const left =
          forgeFacesNeededFor(state, intent.cardInstanceId) - (intent.slotIndexes?.length ?? 0);
        return `Forge: pick ${String(left)} more face${left === 1 ? "" : "s"} on that die (highlighted).`;
      }
      return "Forge: choose which face card from your pool represents the new face.";
    default:
      break;
  }

  switch (state.phase) {
    case "roll":
      return "Dice roll automatically. Overloads on showing faces fire immediately, once per die that shows them. Rituals cannot activate during roll.";
    case "actions":
      return "Bank attribute pips into your pile (one click), grant Shield onto a creature, spend, attack, play tactics, forge, and activate ready rituals. End turn from the phase bar when finished.";
  }
}
