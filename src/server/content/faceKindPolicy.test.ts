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
import {
  ALL_FACE_CARDS,
  BASIC_FACE_CARDS,
  COGTOOTH,
  FACE_CARDS,
  naturalFaceId,
  SHIELD_FACE_ID,
  SPECIAL_FACE_CARDS,
} from "./faces.js";

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
    // Every attribute a catalogue card forges as synthetic needs a named special.
    const forgedSynthetics = new Set(
      ALL_CARDS.filter((card) => card.forge.kind === "synthetic").map(
        (card) => card.forge.attribute,
      ),
    );
    for (const attribute of forgedSynthetics) {
      expect(
        Object.values(FACE_CARDS).some(
          (face) => face.kind === "synthetic" && face.symbol === attribute,
        ),
        `no named synthetic face for ${attribute}`,
      ).toBe(true);
    }
  });

  it("allows a named special beside its natural in a face deck", () => {
    const result = validateFaceDeck(
      [COGTOOTH, naturalFaceId("mechanical")],
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
    const basics = BASIC_FACE_CARDS.filter((face) => face.kind === "natural");
    expect(basics.map((face) => face.symbol)).toEqual([...DUAL_KIND_ATTRIBUTES]);
    expect(basics).toHaveLength(ATTRIBUTES.length);
    for (const face of basics) {
      expect(face.id).toBe(naturalFaceId(face.symbol as Attribute));
    }
  });

  it("keeps named naturals out of the opening basics", () => {
    const named = ALL_FACE_CARDS.filter(
      (face) => face.kind === "natural" && face.id !== naturalFaceId(face.symbol as Attribute),
    );
    for (const face of named) {
      expect(BASIC_FACE_CARDS).not.toContain(face);
      expect(SPECIAL_FACE_CARDS, `${face.name} must be packable`).toContain(face);
    }
  });

  it("catalogues Shield as the untyped starting face", () => {
    const shield = FACE_CARDS[SHIELD_FACE_ID];
    expect(shield?.kind).toBe("untyped");
    expect(shield?.symbol).toBe(SHIELD);
    expect(shield?.id).toBe("face-untyped-shield");
  });
});
