"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CircleAlert, CircleCheck, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type Tono = "exito" | "error";

interface Aviso {
  id: number;
  tono: Tono;
  mensaje: string;
}

interface Contexto {
  exito: (mensaje: string) => void;
  error: (mensaje: string) => void;
}

const ContextoAvisos = createContext<Contexto | null>(null);

export function ProveedorAvisos({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const contador = useRef(0);

  const quitar = useCallback((id: number) => {
    setAvisos((previos) => previos.filter((a) => a.id !== id));
  }, []);

  const agregar = useCallback(
    (tono: Tono, mensaje: string) => {
      const id = ++contador.current;
      setAvisos((previos) => [...previos.slice(-2), { id, tono, mensaje }]);
      window.setTimeout(() => quitar(id), tono === "error" ? 6000 : 4000);
    },
    [quitar],
  );

  const valor = useMemo<Contexto>(
    () => ({
      exito: (mensaje: string) => agregar("exito", mensaje),
      error: (mensaje: string) => agregar("error", mensaje),
    }),
    [agregar],
  );

  return (
    <ContextoAvisos.Provider value={valor}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-60 flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:left-auto sm:right-6 sm:items-end sm:px-0"
      >
        <AnimatePresence initial={false}>
          {avisos.map((aviso) => (
            <motion.div
              key={aviso.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97, transition: { duration: 0.15 } }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border px-4 py-3 text-[14px] shadow-xl backdrop-blur ${
                aviso.tono === "exito"
                  ? "border-verde/30 bg-superficie/95 text-tinta"
                  : "border-alerta/40 bg-superficie/95 text-tinta"
              }`}
            >
              {aviso.tono === "exito" ? (
                <CircleCheck className="mt-0.5 size-4.5 shrink-0 text-verde" aria-hidden="true" />
              ) : (
                <CircleAlert className="mt-0.5 size-4.5 shrink-0 text-alerta" aria-hidden="true" />
              )}
              <span className="min-w-0 flex-1 leading-relaxed">{aviso.mensaje}</span>
              <button
                type="button"
                onClick={() => quitar(aviso.id)}
                aria-label="Descartar aviso"
                className="-my-1 -mr-1 grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg text-tinta-3 hover:text-tinta"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ContextoAvisos.Provider>
  );
}

export function useAvisos(): Contexto {
  const contexto = useContext(ContextoAvisos);
  if (!contexto) {
    throw new Error("useAvisos debe usarse dentro de <ProveedorAvisos>.");
  }
  return contexto;
}
