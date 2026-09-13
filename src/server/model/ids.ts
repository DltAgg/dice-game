/**
 * Branded string ids. Bible §30 keeps roomCode, matchId, playerId, deckId and
 * entity ids as separate concepts; branding stops them being interchanged by
 * accident while staying plain strings for JSON serialization.
 *
 * Ids are always supplied by the caller. The engine never generates one,
 * because id generation is a source of nondeterminism (SPDD §28).
 */

declare const brand: unique symbol;

type Brand<TBase, TName extends string> = TBase & { readonly [brand]: TName };

export type MatchId = Brand<string, "MatchId">;
export type PlayerId = Brand<string, "PlayerId">;
export type DieId = Brand<string, "DieId">;
export type CreatureId = Brand<string, "CreatureId">;
export type SymbolInstanceId = Brand<string, "SymbolInstanceId">;
export type EffectInstanceId = Brand<string, "EffectInstanceId">;
export type OverloadInstanceId = Brand<string, "OverloadInstanceId">;
/**
 * One physical copy of a card. Distinct from `CardId` because a deck may hold
 * several copies of the same card, and hand, deck and graveyard have to tell
 * them apart.
 */
export type CardInstanceId = Brand<string, "CardInstanceId">;

/** Ids of content definitions, not of runtime instances. */
export type FaceCardId = Brand<string, "FaceCardId">;
export type CreatureDefinitionId = Brand<string, "CreatureDefinitionId">;
export type AttackId = Brand<string, "AttackId">;
export type AbilityId = Brand<string, "AbilityId">;
export type CardId = Brand<string, "CardId">;

export const asMatchId = (value: string): MatchId => value as MatchId;
export const asPlayerId = (value: string): PlayerId => value as PlayerId;
export const asDieId = (value: string): DieId => value as DieId;
export const asCreatureId = (value: string): CreatureId => value as CreatureId;
export const asSymbolInstanceId = (value: string): SymbolInstanceId => value as SymbolInstanceId;
export const asEffectInstanceId = (value: string): EffectInstanceId => value as EffectInstanceId;
export const asOverloadInstanceId = (value: string): OverloadInstanceId =>
  value as OverloadInstanceId;
export const asCardInstanceId = (value: string): CardInstanceId => value as CardInstanceId;
export const asFaceCardId = (value: string): FaceCardId => value as FaceCardId;
export const asCreatureDefinitionId = (value: string): CreatureDefinitionId =>
  value as CreatureDefinitionId;
export const asAttackId = (value: string): AttackId => value as AttackId;
export const asAbilityId = (value: string): AbilityId => value as AbilityId;
export const asCardId = (value: string): CardId => value as CardId;
