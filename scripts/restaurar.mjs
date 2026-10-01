#!/usr/bin/env node
/**
 * Restaura un respaldo de Finanza (el JSON que llega los lunes por correo o que
 * se descarga en Ajustes) en la base configurada en MONGODB_URI.
 *
 *   npm run restaurar -- finanza-respaldo-2026-09-21.json
 *   npm run restaurar -- finanza-respaldo-2026-09-21.json --reemplazar
 *   npm run restaurar -- respaldo.json --usuario correo@ejemplo.com
 *
 * Sin --reemplazar solo restaura sobre una base vacía. Con --reemplazar borra
 * lo que haya en cada colección antes de cargar el respaldo. El usuario y su
 * clave viven en la colección "usuarios", que el respaldo no incluye: no se toca.
 */
import { readFile } from "node:fs/promises";
import { BSON, MongoClient } from "mongodb";

const [archivo, ...banderas] = process.argv.slice(2);
const reemplazar = banderas.includes("--reemplazar");
const iUsuario = banderas.indexOf("--usuario");
const usuario = iUsuario >= 0 ? (banderas[iUsuario + 1] ?? "").trim().toLowerCase() : "";

function salir(mensaje) {
  console.error(`\n${mensaje}\n`);
  process.exit(1);
}

if (!archivo) salir("Indica el archivo: npm run restaurar -- finanza-respaldo-AAAA-MM-DD.json");
const uri = process.env.MONGODB_URI;
if (!uri) salir("Falta MONGODB_URI (en .env.local o en el entorno).");

let respaldo;
try {
  respaldo = BSON.EJSON.parse(await readFile(archivo, "utf8"), { relaxed: false });
} catch (error) {
  salir(`No se pudo leer ${archivo}: ${error.message}`);
}
if (respaldo?.formato !== "finanza-respaldo" || typeof respaldo.colecciones !== "object") {
  salir("El archivo no es un respaldo de Finanza.");
}

const cliente = await new MongoClient(uri).connect();
try {
  // Cada persona tiene su propia base: sin --usuario se restaura en la principal
  // (la del primer usuario); con él, en la base de ese usuario.
  const principal = process.env.MONGODB_DB || "finanza";
  let nombreBase = principal;
  if (usuario) {
    const doc = await cliente.db(principal).collection("usuarios").findOne({ _id: usuario });
    if (!doc) salir(`No existe el usuario ${usuario}.`);
    nombreBase = doc.base || principal;
  }
  const db = cliente.db(nombreBase);
  const nombres = Object.keys(respaldo.colecciones);

  if (!reemplazar) {
    for (const nombre of nombres) {
      const cantidad = await db.collection(nombre).countDocuments();
      if (cantidad > 0) {
        salir(
          `La colección "${nombre}" ya tiene ${cantidad} documentos. ` +
            "Restaurar mezclaría datos: usa --reemplazar si quieres sustituirlos por el respaldo.",
        );
      }
    }
  }

  for (const nombre of nombres) {
    const docs = respaldo.colecciones[nombre];
    if (!Array.isArray(docs)) continue;
    const coleccion = db.collection(nombre);
    if (reemplazar) await coleccion.deleteMany({});
    if (docs.length > 0) await coleccion.insertMany(docs);
    console.log(`${nombre.padEnd(14)} ${docs.length} documentos`);
  }
  console.log(`\nRespaldo del ${respaldo.generadoEn} restaurado.`);
} finally {
  await cliente.close();
}
