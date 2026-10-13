import { describe, expect, it } from "vitest";
import { canTransitionListing } from "./listing";

describe("transiciones de publicación", () => {
  it("permite publicar, pausar, reactivar y retirar", () => {
    expect(canTransitionListing("DRAFT", "PUBLISHED")).toBe(true);
    expect(canTransitionListing("PUBLISHED", "PAUSED")).toBe(true);
    expect(canTransitionListing("PAUSED", "PUBLISHED")).toBe(true);
    expect(canTransitionListing("PUBLISHED", "REMOVED")).toBe(true);
  });

  it("impide reactivar una publicación retirada", () => {
    expect(canTransitionListing("REMOVED", "PUBLISHED")).toBe(false);
  });
});
