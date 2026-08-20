import { describe, expect, it } from "vitest";
import {
  ATTRIBUTES,
  attributeAllowsNaturalFaces,
  DUAL_KIND_ATTRIBUTES,
  SYNTHETIC_ONLY_ATTRIBUTES,
  type Attribute,
} from "../model/attributes.js";
import { DEFAULT_RULES_CONFIG } from "../model/config.js";
import { SHIELD } from "../model/symbols.js";
import { isLegalForgeKindForAttribute, validateFaceDeck } from "../rules/faces.js";
import { ALL_CARDS } from "./cards.js";
import { ALL_FACE_CARDS, FACE_CARDS, naturalFaceId, SHIELD_FACE_ID, VENOM } from "./faces.js";

describe("attribute face-kind policy", () => {
  it("allows natural faces for every attribute", () => {
    expect(SYNTHETIC_ONLY_ATTRIBUTES).toEqual([]);
    for (const attribute of ATTRIBUTES) {
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

  it("catalogues natural faces only for attributes that allow them", () => {
    for (const face of Object.values(FACE_CARDS)) {
      if (face.kind !== "natural") continue;
      expect(
        attributeAllowsNaturalFaces(face.symbol as Attribute),
        `${face.name} (${face.id}) is natural but ${face.symbol} disallows natural faces`,
      ).toBe(true);
    }
    // Former synthetic-only attrs still have named specials in the catalogue.
    for (const attribute of ["toxin", "mechanical", "corruption", "darkness"] as const) {
      expect(
        Object.values(FACE_CARDS).some(
          (face) => face.kind === "synthetic" && face.symbol === attribute,
        ),
        `no named synthetic face for ${attribute}`,
      ).toBe(true);
    }
  });

  it("allows catalogued natural toxin in a face deck", () => {
    const result = validateFaceDeck(
      [VENOM, naturalFaceId("toxin")],
      DEFAULT_RULES_CONFIG,
    );
    expect(result.ok).toBe(true);
  });
});

describe("card forge regions respect face-kind policy", () => {
  it.each(ALL_CARDS)("$name: natural forge only when attribute allows natural", (card) => {
    if (card.forge.kind === "natural") {
      expect(
        attributeAllowsNaturalFaces(card.forge.attribute),
        `${card.name} forges natural ${card.forge.attribute}`,
      ).toBe(true);
    }
  });

  it.each(ALL_CARDS)("$name: synthetic forge remains legal on all attributes", (card) => {
    if (card.forge.kind === "synthetic") {
      expect(isLegalForgeKindForAttribute("synthetic", card.forge.attribute)).toBe(true);
    }
  });
});

describe("listed face catalogue basics", () => {
  it("publishes natural basics for all dual-kind attributes", () => {
    const basics = ALL_FACE_CARDS.filter((face) => face.kind === "natural");
    expect(basics.map((face) => face.symbol)).toEqual([...DUAL_KIND_ATTRIBUTES]);
    expect(basics).toHaveLength(ATTRIBUTES.length);
  });

  it("catalogues Shield as the untyped starting face", () => {
    const shield = FACE_CARDS[SHIELD_FACE_ID];
    expect(shield?.kind).toBe("untyped");
    expect(shield?.symbol).toBe(SHIELD);
    expect(shield?.id).toBe("face-untyped-shield");
  });
});
