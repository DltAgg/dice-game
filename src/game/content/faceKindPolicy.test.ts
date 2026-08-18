import { describe, expect, it } from "vitest";
import {
  attributeAllowsNaturalFaces,
  DUAL_KIND_ATTRIBUTES,
  SYNTHETIC_ONLY_ATTRIBUTES,
  type Attribute,
} from "../model/attributes.js";
import { DEFAULT_RULES_CONFIG } from "../model/config.js";
import { SHIELD } from "../model/symbols.js";
import { isLegalForgeKindForAttribute, validateFaceDeck } from "../rules/faces.js";
import { ALL_CARDS } from "./cards.js";
import { ALL_FACE_CARDS, FACE_CARDS, SHIELD_FACE_ID, syntheticFaceId } from "./faces.js";

describe("attribute face-kind policy", () => {
  it("allows natural faces only for Martial / Wild / Arcane / Luminar", () => {
    for (const attribute of DUAL_KIND_ATTRIBUTES) {
      expect(attributeAllowsNaturalFaces(attribute)).toBe(true);
      expect(isLegalForgeKindForAttribute("natural", attribute)).toBe(true);
      expect(isLegalForgeKindForAttribute("synthetic", attribute)).toBe(true);
    }
    for (const attribute of SYNTHETIC_ONLY_ATTRIBUTES) {
      expect(attributeAllowsNaturalFaces(attribute)).toBe(false);
      expect(isLegalForgeKindForAttribute("natural", attribute)).toBe(false);
      expect(isLegalForgeKindForAttribute("synthetic", attribute)).toBe(true);
    }
    expect(isLegalForgeKindForAttribute("untyped", "martial")).toBe(false);
  });

  it("catalogues no natural faces for synthetic-only attributes", () => {
    for (const face of Object.values(FACE_CARDS)) {
      if (face.kind !== "natural") continue;
      expect(
        attributeAllowsNaturalFaces(face.symbol as Attribute),
        `${face.name} (${face.id}) is natural but ${face.symbol} is synthetic-only`,
      ).toBe(true);
    }
    for (const attribute of SYNTHETIC_ONLY_ATTRIBUTES) {
      expect(FACE_CARDS[syntheticFaceId(attribute)]).toBeDefined();
    }
  });

  it("refuses unknown natural synthetic-only face ids in a face deck", () => {
    const result = validateFaceDeck(
      [syntheticFaceId("toxin"), "face-natural-toxin" as never],
      DEFAULT_RULES_CONFIG,
    );
    expect(result.ok).toBe(false);
  });
});

describe("card forge regions respect face-kind policy", () => {
  it.each(ALL_CARDS)("$name: natural forge only on dual-kind attributes", (card) => {
    if (card.forge.kind === "natural") {
      expect(
        attributeAllowsNaturalFaces(card.forge.attribute),
        `${card.name} forges natural ${card.forge.attribute}`,
      ).toBe(true);
    }
  });

  it.each(ALL_CARDS)("$name: synthetic-only attributes forge as synthetic", (card) => {
    if (
      (SYNTHETIC_ONLY_ATTRIBUTES as readonly string[]).includes(card.forge.attribute)
    ) {
      expect(card.forge.kind).toBe("synthetic");
    }
  });
});

describe("listed face catalogue basics", () => {
  it("publishes natural basics only for dual-kind attributes", () => {
    const basics = ALL_FACE_CARDS.filter((face) => face.kind === "natural");
    expect(basics.map((face) => face.symbol)).toEqual([...DUAL_KIND_ATTRIBUTES]);
  });

  it("catalogues Shield as the untyped starting face", () => {
    const shield = FACE_CARDS[SHIELD_FACE_ID];
    expect(shield?.kind).toBe("untyped");
    expect(shield?.symbol).toBe(SHIELD);
    expect(shield?.id).toBe("face-untyped-shield");
  });
});
