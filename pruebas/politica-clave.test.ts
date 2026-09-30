import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { errorClave, evaluarClave } from "../src/lib/politica-clave";

describe("política de claves", () => {
  it("acepta una clave que cumple todo", () => {
    assert.equal(errorClave("Gato-Azul-Mesa-84!", { correo: "yo@ejemplo.com", actual: "otra" }), null);
  });

  it("rechaza cada requisito incumplido", () => {
    const casos: [string, string][] = [
      ["Corta1!", "largo"],
      ["sin-mayuscula-99!", "mayuscula"],
      ["SIN-MINUSCULA-99!", "minuscula"],
      ["Sin-Numero-Aqui-Ya!", "numero"],
      ["SinSimbolo1234Aa", "simbolo"],
      [" Espacio-Al-Inicio-9!", "espacios"],
      ["Repetidooo-Azul-9!", "repetidos"],
      ["Mi-Password-Seguro-9!", "comun"],
    ];
    for (const [clave, id] of casos) {
      const fallo = evaluarClave(clave).find((r) => !r.cumple);
      assert.equal(fallo?.id, id, `${clave} debía fallar en ${id}`);
    }
  });

  it("no admite el correo ni repetir la clave actual", () => {
    assert.ok(errorClave("Vanegas-Azul-Mesa-84!", { correo: "vanegas@ejemplo.com" }));
    assert.ok(errorClave("Gato-Azul-Mesa-84!", { actual: "Gato-Azul-Mesa-84!" }));
  });

  it("limita el largo máximo", () => {
    assert.ok(errorClave(`Aa1!${"x-y".repeat(50)}`));
  });
});
