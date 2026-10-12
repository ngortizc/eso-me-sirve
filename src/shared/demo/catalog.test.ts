import { describe, expect, it } from "vitest";
import { demoArticles, filterDemoArticles } from "@/shared/demo/catalog";

describe("filterDemoArticles", () => {
  it("filtra por texto sin distinguir mayúsculas ni tildes existentes", () => {
    expect(
      filterDemoArticles(demoArticles, { query: "SILLÓN", category: "Todas", commune: "Todas" }).map(
        (article) => article.slug
      )
    ).toEqual(["sillon-verde"]);
  });

  it("combina categoría y comuna", () => {
    expect(
      filterDemoArticles(demoArticles, { query: "", category: "Infantil", commune: "Providencia" })
    ).toHaveLength(1);
    expect(
      filterDemoArticles(demoArticles, { query: "", category: "Infantil", commune: "Ñuñoa" })
    ).toHaveLength(0);
  });
});
