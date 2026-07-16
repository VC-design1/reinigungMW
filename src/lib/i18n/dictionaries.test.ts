import { describe, expect, it } from "vitest";
import { dictionaries, getDictionary, SUPPORTED_LOCALES } from "./dictionaries";

describe("dictionaries", () => {
  it("has an entry for every supported locale", () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(dictionaries[locale]).toBeTruthy();
    }
  });

  it("de and en expose the same top-level sections", () => {
    expect(Object.keys(dictionaries.de).sort()).toEqual(Object.keys(dictionaries.en).sort());
  });

  it("every status label present in de is present in en", () => {
    expect(Object.keys(dictionaries.de.statusLabels).sort()).toEqual(
      Object.keys(dictionaries.en.statusLabels).sort()
    );
  });

  it("every issue category present in de is present in en", () => {
    expect(Object.keys(dictionaries.de.issueCategories).sort()).toEqual(
      Object.keys(dictionaries.en.issueCategories).sort()
    );
  });
});

describe("getDictionary", () => {
  it("returns the English dictionary for 'en'", () => {
    expect(getDictionary("en")).toBe(dictionaries.en);
  });

  it("falls back to German for unknown or missing locales", () => {
    expect(getDictionary("fr")).toBe(dictionaries.de);
    expect(getDictionary(null)).toBe(dictionaries.de);
    expect(getDictionary(undefined)).toBe(dictionaries.de);
  });
});
