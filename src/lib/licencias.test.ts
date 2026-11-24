import { describe, expect, it } from "vitest";
import { extraerLicenciaCreativeCommons } from "./licencias";

describe("extraerLicenciaCreativeCommons", () => {
  it("expone enlaces BY y BY-SA guardados en las notas", () => {
    expect(extraerLicenciaCreativeCommons("Licencia: https://creativecommons.org/licenses/by/3.0/."))
      .toBe("https://creativecommons.org/licenses/by/3.0/");
    expect(extraerLicenciaCreativeCommons("CC BY-SA: https://creativecommons.org/licenses/by-sa/3.0/"))
      .toBe("https://creativecommons.org/licenses/by-sa/3.0/");
  });

  it("omite enlaces externos o notas sin licencia Creative Commons reconocida", () => {
    expect(extraerLicenciaCreativeCommons("Ver https://example.com/license" )).toBeNull();
    expect(extraerLicenciaCreativeCommons(null)).toBeNull();
  });
});
