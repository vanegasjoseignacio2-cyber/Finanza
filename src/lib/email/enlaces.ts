/**
 * El enlace oficial de la app. Los botones del correo llevan siempre aquí, a la
 * pantalla de entrada: no dependen de variables de entorno, que si quedaban mal
 * puestas (o vacías) mandaban el botón a localhost o a otra dirección.
 */
export const URL_APP_OFICIAL = "https://finanza-z42s.vercel.app";

/** Adonde lleva el botón de ambos correos. */
export const URL_ENTRADA = `${URL_APP_OFICIAL}/login`;
