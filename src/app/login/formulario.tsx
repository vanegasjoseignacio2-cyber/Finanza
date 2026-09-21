"use client";

import { motion } from "framer-motion";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Marca } from "@/components/marca";
import { Boton } from "@/components/ui/boton";
import { Campo } from "@/components/ui/campo";

export function FormularioLogin({ volver }: { volver: string }) {
  const router = useRouter();
  const [clave, setClave] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setCargando(true);
    setError("");
    try {
      const respuesta = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clave }),
      });
      if (!respuesta.ok) {
        const datos = await respuesta.json().catch(() => ({}));
        setError(datos.error ?? "No pudimos validar la clave.");
        return;
      }
      // `refresh` limpia la caché del router antes de entrar al panel.
      router.replace(volver.startsWith("/") ? volver : "/");
      router.refresh();
    } catch {
      setError("No hay conexión con el servidor. Revisa tu red.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-sm"
    >
      <div className="mb-8 flex flex-col items-center gap-4 text-center">
        <Marca />
        <div>
          <h1 className="font-display text-2xl font-semibold text-tinta">
            Tu dinero, <span className="texto-degradado">en orden</span>
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-tinta-3">
            Panel privado de gastos, ahorro y recordatorios de pago.
          </p>
        </div>
      </div>

      <form onSubmit={enviar} className="tarjeta flex flex-col gap-4 p-6">
        <Campo
          etiqueta="Clave de acceso"
          type={visible ? "text" : "password"}
          value={clave}
          onChange={(e) => setClave(e.target.value)}
          error={error || undefined}
          autoComplete="current-password"
          autoFocus
          required
          placeholder="••••••••"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="area-toque -mt-2 flex min-h-11 cursor-pointer items-center gap-1.5 self-start rounded-lg text-[13px] text-tinta-3 transition-colors hover:text-tinta-2"
        >
          {visible ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
          {visible ? "Ocultar clave" : "Mostrar clave"}
        </button>

        <Boton type="submit" cargando={cargando} ancho>
          <LockKeyhole className="size-4" aria-hidden="true" />
          Entrar
        </Boton>
      </form>

      <p className="mt-6 text-center text-[12.5px] leading-relaxed text-tinta-3">
        Solo tú entras aquí. La clave se define en la variable de entorno
        <span className="mx-1 rounded bg-superficie-alta px-1.5 py-0.5 font-mono text-[11.5px] text-tinta-2">
          APP_PASSWORD
        </span>
      </p>
    </motion.div>
  );
}
