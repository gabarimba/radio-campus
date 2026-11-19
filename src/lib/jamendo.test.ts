import { describe, expect, it } from "vitest";
import { permiteEmisionNoComercial } from "./jamendo";

describe("licencias Jamendo admitidas", () => {
  it.each([
    ["https://creativecommons.org/licenses/by/4.0/", true],
    ["http://creativecommons.org/licenses/by-sa/3.0/", true],
    ["https://creativecommons.org/licenses/by-nd/4.0/", true],
    ["https://creativecommons.org/licenses/by-nc/4.0/", false],
    [undefined, false],
  ] as const)("filtra la licencia %s", (license, expected) => {
    expect(permiteEmisionNoComercial(license)).toBe(expected);
  });
});
