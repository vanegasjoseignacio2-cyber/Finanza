import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { crearCatalogo, slugCategoria } from "../src/lib/categorias";

describe("catálogo de categorías", () => {
  it("agrega categorías personales", () => {
    const c = crearCatalogo([{ id: "mascota", label: "Mascota", icono: "PawPrint", tipo: "gasto", oculta: false }]);
    assert.equal(c.etiqueta("mascota"), "Mascota");
    assert.ok(c.gasto.some((x) => x.id === "mascota"));
    assert.ok(c.existe("mascota", "gasto"));
  });

  it("permite ocultar o renombrar una base sin cambiarle el tipo", () => {
    const c = crearCatalogo([{ id: "moto", label: "Mi moto", icono: "", tipo: "ingreso", oculta: true }]);
    assert.equal(c.etiqueta("moto"), "Mi moto");
    assert.equal(c.obtener("moto").tipo, "gasto");
    assert.equal(c.obtener("moto").icono, "Bike");
    assert.ok(!c.gasto.some((x) => x.id === "moto"));
    // Oculta no significa inválida: los movimientos viejos siguen resolviendo.
    assert.ok(c.existe("moto", "gasto"));
  });

  it("valida el tipo de la categoría", () => {
    const c = crearCatalogo();
    assert.ok(c.existe("sueldo", "ingreso"));
    assert.ok(!c.existe("sueldo", "gasto"));
    assert.ok(!c.existe("inventada"));
  });

  it("genera identificadores estables", () => {
    assert.equal(slugCategoria("Café & pan"), "cafe-pan");
    assert.equal(slugCategoria("  Mascota  "), "mascota");
  });
});
