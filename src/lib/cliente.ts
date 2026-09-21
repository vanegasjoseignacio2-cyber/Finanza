"use client";

/** Envoltura de fetch: JSON, errores con mensaje y sesión expirada. */
export async function peticion<T>(
  url: string,
  opciones: RequestInit = {},
): Promise<T> {
  let respuesta: Response;
  try {
    respuesta = await fetch(url, {
      ...opciones,
      headers: {
        ...(opciones.body ? { "content-type": "application/json" } : {}),
        ...opciones.headers,
      },
    });
  } catch {
    throw new Error("Sin conexión con el servidor. Revisa tu red e intenta otra vez.");
  }

  if (respuesta.status === 401) {
    // Recarga completa a propósito: la sesión expiró y conviene limpiar todo
    // el estado del cliente antes de volver a entrar.
    window.location.assign(new URL("/login", window.location.origin).toString());
    throw new Error("Tu sesión expiró. Vuelve a entrar.");
  }

  const texto = await respuesta.text();
  const datos = texto ? JSON.parse(texto) : {};

  if (!respuesta.ok) {
    throw new Error(datos.error ?? "No pudimos completar la operación.");
  }
  return datos as T;
}
