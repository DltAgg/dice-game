import type { EffectCondition, EffectDefinition } from "../model/effects.js";
import type { StandingTrigger } from "../model/cards.js";
import {
  literal,
  type ConditionExpr,
  type EffectNode,
  type TriggerNode,
  type ValueExpr,
} from "./nodes.js";

export class AstCompiler {
  compile(effect: EffectDefinition | EffectNode): EffectNode {
    if ("op" in effect) return effect;
    return this.compileLegacy(effect);
  }

  compileAll(effects: readonly EffectDefinition[]): readonly EffectNode[] {
    return effects.map((effect) => this.compileLegacy(effect));
  }

  compileLegacy(effect: EffectDefinition): EffectNode {
    const amount = (value: number): ValueExpr => literal(value);
    switch (effect.type) {
      case "damage":
        return { op: "damage", amount: amount(effect.amount), target: effect.target };
      case "heal":
        return { op: "heal", amount: amount(effect.amount), target: effect.target };
      case "grant-shield":
        return { op: "mark", token: "shield", amount: amount(effect.amount), target: effect.target };
      case "apply-toxin":
        return { op: "mark", token: "toxin", amount: amount(effect.amount), target: effect.target };
      case "add-corruption-marker":
        return { op: "mark", token: "corruption", amount: amount(effect.amount) };
      case "add-pestilence-counter":
        return { op: "mark", token: "pestilence", amount: literal(1) };
      case "remove-shield":
        return { op: "strip", token: "shield", amount: amount(effect.amount), target: effect.target };
      case "generate-symbol":
        return { op: "generate-symbol", symbol: effect.symbol, amount: amount(effect.amount) };
      case "draw-cards":
        return {
          op: "draw",
          amount: amount(effect.amount),
          ...(effect.player !== undefined ? { player: effect.player } : {}),
        };
      case "discard-cards":
        return {
          op: "discard",
          amount: amount(effect.amount),
          ...(effect.optional === true ? { optional: true } : {}),
          ...(effect.then !== undefined ? { then: this.compileAll(effect.then) } : {}),
        };
      case "search-deck":
        return { op: "search", searchZone: "deck", amount: amount(effect.amount), filter: effect.filter };
      case "search-graveyard":
        return {
          op: "search-graveyard",
          amount: amount(effect.amount),
          ...(effect.maxPlayCost !== undefined ? { maxPlayCost: effect.maxPlayCost } : {}),
        };
      case "mill-cards":
        return { op: "mill", amount: amount(effect.amount), player: effect.player };
      case "destroy-equipment":
        return { op: "destroy-equipment", target: effect.target };
      case "destroy-ritual":
        return { op: "destroy-ritual", target: effect.target };
      case "destroy-overload":
        return { op: "destroy-overload", target: effect.target };
      case "drain-life":
        return {
          op: "drain-life",
          amount: amount(effect.amount),
          target: effect.target,
          with: effect.with,
        };
      case "next-attack-bonus":
        return {
          op: "modify",
          stat: "attack-damage",
          amount: amount(effect.amount),
          duration: { kind: "end-of-turn" },
        };
      case "grant-next-attack-bonus":
        return {
          op: "modify",
          stat: "next-attack-damage",
          amount: amount(effect.amount),
          duration: { kind: "until-consumed" },
          target: effect.target,
        };
      case "arm-attack-toxin":
        return {
          op: "modify",
          stat: "attack-toxin",
          amount: amount(effect.amount),
          duration: { kind: "end-of-turn" },
        };
      case "arm-ignore-shield":
        return {
          op: "modify",
          stat: "ignore-shield",
          amount: amount(effect.amount),
          duration: { kind: "end-of-turn" },
        };
      case "arm-prevent-draw":
        return {
          op: "modify",
          stat: "prevent-draw",
          amount: amount(effect.amount),
          duration: { kind: "until-consumed" },
        };
      case "arm-requirement-wildcard":
        return {
          op: "modify",
          stat: "requirement-wildcard",
          duration: { kind: "until-consumed" },
          ...(effect.fromSymbol !== undefined ? { fromSymbol: effect.fromSymbol } : {}),
        };
      case "arm-forge-discount":
        return {
          op: "modify",
          stat: "forge-discount",
          amount: amount(effect.amount),
          duration: { kind: "until-consumed" },
        };
      case "play-cost-discount":
        return {
          op: "modify",
          stat: "play-cost-discount",
          amount: amount(effect.amount),
          duration: { kind: "until-consumed" },
        };
      case "arm-redirect-damage":
        return {
          op: "modify",
          stat: "redirect-damage",
          amount: amount(effect.amount),
          duration: { kind: "end-of-turn" },
          target: effect.target,
        };
      case "arm-next-incoming-bonus":
        return {
          op: "modify",
          stat: "next-incoming-damage",
          amount: amount(effect.amount),
          duration: { kind: "until-consumed" },
          target: effect.target,
        };
      case "arm-blade-rain":
        return { op: "modify", stat: "blade-rain", duration: { kind: "end-of-turn" } };
      case "grant-attack-prevent":
        return {
          op: "modify",
          stat: "attack-prevent",
          amount: amount(effect.amount),
          duration: { kind: "until-consumed" },
          target: effect.target,
        };
      case "grant-extra-attack":
        return {
          op: "modify",
          stat: "extra-attacks",
          amount: amount(effect.amount),
          duration: { kind: "end-of-turn" },
          target: effect.target,
        };
      case "arm-toxin-receive-cap":
        return {
          op: "modify",
          stat: "toxin-receive-cap",
          amount: amount(effect.amount),
          duration: { kind: "until-owners-next-turn" },
          target: effect.target,
        };
      case "arm-resolve-next-face-effect-twice":
        return {
          op: "modify",
          stat: "resolve-next-face-effect-twice",
          duration: { kind: "until-consumed" },
        };
      case "negate-card":
        return { op: "negate", scope: "card", cardTypes: effect.cardTypes };
      case "negate-ritual":
        return { op: "negate", scope: "ritual" };
      case "forge-faces":
        return {
          op: "forge",
          faces: effect.faces,
          kind: effect.kind,
          attribute: effect.attribute,
          forgeTarget: effect.target,
        };
      case "reposition-creature":
        return {
          op: "reposition",
          target: effect.target,
          ...(effect.optional === true ? { optional: true } : {}),
        };
      case "swap-positions":
        return {
          op: "swap",
          with: effect.with,
          ...(effect.optional === true ? { optional: true } : {}),
        };
      case "conditional":
        return {
          op: "branch",
          when: this.compileCondition(effect.when),
          then: this.compileAll(effect.then),
        };
      case "convert-symbols":
        return {
          op: "convert-symbols",
          amount: amount(effect.amount),
          ...(effect.sourceOnly === true ? { sourceOnly: true } : {}),
        };
      case "look-top-deck":
        return { op: "look-top-deck", amount: amount(effect.amount) };
      case "optional-reroll-die":
        return {
          op: "optional-reroll-die",
          ...(effect.oncePerTurn === true ? { oncePerTurn: true } : {}),
          ...(effect.sameFaceAllyDamage !== undefined
            ? { sameFaceAllyDamage: effect.sameFaceAllyDamage }
            : {}),
        };
      case "remove-toxin-deal-damage":
        return {
          op: "remove-toxin-deal-damage",
          amount: amount(effect.amount),
          target: effect.target,
        };
      case "optional-overcharge":
        return {
          op: "optional-overcharge",
          symbol: effect.symbol,
          amount: amount(effect.amount),
        };
      default:
        return { op: effect.type };
    }
  }

  compileCondition(when: EffectCondition): ConditionExpr {
    switch (when.type) {
      case "source-position":
        return { kind: "source-position", position: when.position };
      case "has-other-symbol":
        return {
          kind: "has-other-symbol",
          ...(when.symbol !== undefined ? { symbol: when.symbol } : {}),
          ...(when.faceKind !== undefined ? { faceKind: when.faceKind } : {}),
        };
      default:
        return { kind: when.type };
    }
  }

  compileTrigger(trigger: StandingTrigger): TriggerNode {
    switch (trigger.type) {
      case "attack-damage-bonus":
        return {
          when: {
            event: "on-attack",
            ...(trigger.attackKinds !== undefined ? { attackKinds: trigger.attackKinds } : {}),
          },
          modifiers: [
            {
              op: "modify",
              stat: "attack-damage",
              amount: literal(trigger.amount),
              duration: { kind: "while-attached" },
            },
          ],
        };
      case "play-cost-discount":
        return {
          when: { event: "on-attack" },
          modifiers: [
            {
              op: "modify",
              stat: "play-cost-discount",
              amount: literal(trigger.amount),
              duration: { kind: "while-attached" },
            },
          ],
        };
      case "ignore-shield":
        return {
          when: { event: "on-attack" },
          modifiers: [
            {
              op: "modify",
              stat: "ignore-shield",
              amount: literal(trigger.amount),
              duration: { kind: "while-attached" },
            },
          ],
        };
      case "on-deal-damage":
        return { when: { event: "on-deal-damage" }, effects: this.compileAll(trigger.effects) };
      case "on-toxin-damage":
        return {
          when: {
            event: "on-toxin-damage",
            ...(trigger.damagedOwner !== undefined ? { damagedOwner: trigger.damagedOwner } : {}),
          },
          effects: this.compileAll(trigger.effects),
        };
      case "on-turn-start":
        return {
          when: {
            event: "on-turn-start",
            ...(trigger.whoseTurn !== undefined ? { whoseTurn: trigger.whoseTurn } : {}),
          },
          effects: this.compileAll(trigger.effects),
        };
      case "on-roll-symbol":
        return {
          when: {
            event: "on-roll-symbol",
            symbol: trigger.symbol,
            ...(trigger.rollingPlayer !== undefined ? { rollingPlayer: trigger.rollingPlayer } : {}),
          },
          effects: this.compileAll(trigger.effects),
        };
      case "on-absorb":
        return {
          when: {
            event: "on-absorb",
            ...(trigger.symbols !== undefined ? { symbols: trigger.symbols } : {}),
            ...(trigger.faceKinds !== undefined ? { faceKinds: trigger.faceKinds } : {}),
            ...(trigger.absorberRelation !== undefined
              ? { absorberRelation: trigger.absorberRelation }
              : {}),
            ...(trigger.oncePerTurn === true ? { oncePerTurn: true } : {}),
          },
          effects: this.compileAll(trigger.effects),
        };
      case "on-attack":
        return {
          when: {
            event: "on-attack",
            ...(trigger.attackKinds !== undefined ? { attackKinds: trigger.attackKinds } : {}),
            ...(trigger.attackerRelation !== undefined
              ? { attackerRelation: trigger.attackerRelation }
              : {}),
            ...(trigger.oncePerTurn === true ? { oncePerTurn: true } : {}),
          },
          effects: this.compileAll(trigger.effects),
        };
      case "on-take-damage":
        return {
          when: {
            event: "on-take-damage",
            ...(trigger.reduceBy !== undefined ? { reduceBy: trigger.reduceBy } : {}),
            ...(trigger.oncePerTurn === true ? { oncePerTurn: true } : {}),
          },
          ...(trigger.effects !== undefined ? { effects: this.compileAll(trigger.effects) } : {}),
        };
      case "on-discard":
        return {
          when: {
            event: "on-discard",
            ...(trigger.discardingPlayer !== undefined
              ? { discardingPlayer: trigger.discardingPlayer }
              : {}),
          },
          effects: this.compileAll(trigger.effects),
        };
      case "on-change-position":
        return {
          when: {
            event: "on-change-position",
            ...(trigger.creatureRelation !== undefined
              ? { creatureRelation: trigger.creatureRelation }
              : {}),
          },
          effects: this.compileAll(trigger.effects),
        };
    }
  }
}
