"use client";

import { CircleAlert, CircleCheck, Download, Send, Target, Wallet } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Boton, BotonEnlace } from "@/components/ui/boton";
import { useAvisos } from "@/components/ui/avisos";
import { Campo, Interruptor, Selector } from "@/components/ui/campo";
import { CampoDinero } from "@/components/ui/campo-dinero";
import { Tarjeta } from "@/components/ui/tarjeta";
import { peticion } from "@/lib/cliente";
import type { DiagnosticoCorreo } from "@/lib/email/estado";
import type { Ajustes } from "@/lib/types";

export function VistaAjustes({
  inicial,
  diagnostico,
}: {
  inicial: Ajustes;
  diagnostico: DiagnosticoCorreo;
}) {
  const avisos = useAvisos();
  const [ajustes, setAjustes] = useState(inicial);
  const [guardando, setGuardando] = useState<"dinero" | "correo" | null>(null);
  const [probando, setProbando] = useState(false);

  function cambiar<C extends keyof Ajustes>(campo: C, valor: Ajustes[C]) {
    setAjustes((previos) => ({ ...previos, [campo]: valor }));
  }

  async function guardar(seccion: "dinero" | "correo", evento: FormEvent) {
    evento.preventDefault();
    setGuardando(seccion);
    try {
      const cuerpo =
        seccion === "dinero"
          ? {
              ingresoMensual: ajustes.ingresoMensual,
              metaAhorro: ajustes.metaAhorro,
              metaNombre: ajustes.metaNombre,
              metaFechaLimite: ajustes.metaFechaLimite,
            }
          : {
              email: ajustes.email,
              emailActivo: ajustes.emailActivo,
              enviarSiempre: ajustes.enviarSiempre,
              diasAviso: ajustes.diasAviso,
            };
      const datos = await peticion<{ ajustes: Ajustes }>("/api/ajustes", {
        method: "PUT",
        body: JSON.stringify(cuerpo),
      });
      setAjustes(datos.ajustes);
      avisos.exito("Ajustes guardados.");
    } catch (e) {
      avisos.error(e instanceof Error ? e.message : "No pudimos guardar los ajustes.");
    } finally {
      setGuardando(null);
    }
  }

  async function enviarPrueba() {
    setProbando(true);
    try {
      const datos = await peticion<{ destinatario: string }>("/api/correo/prueba", {
        method: "POST",
        body: JSON.stringify({ destino: ajustes.email }),
      });
      avisos.exito(`Correo de prueba enviado a ${datos.destinatario}. Revisa también spam.`);
    } catch (e) {
      avisos.error(e instanceof Error ? e.message : "No pudimos enviar el correo.");
    } finally {
      setProbando(false);
    }
  }

  const listo = diagnostico.credenciales && diagnostico.remitente;

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <header>
        <h1 className="font-display text-[26px] leading-tight font-semibold text-tinta sm:text-3xl">
          Ajustes
        </h1>
        <p className="mt-1 text-[14px] text-tinta-3">
          Tu ingreso, tu meta y el aviso diario por correo.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Tarjeta titulo="Ingreso y meta">
          <form onSubmit={(e) => guardar("dinero", e)} className="flex flex-col gap-4">
            <CampoDinero
              etiqueta="Ingreso mensual"
              valor={ajustes.ingresoMensual || null}
              onCambio={(v) => cambiar("ingresoMensual", v ?? 0)}
              ayuda="Lo que recibes fijo cada mes. Los ingresos extra se registran como movimientos."
            />
            <Campo
              etiqueta="Nombre de la meta"
              value={ajustes.metaNombre}
              onChange={(e) => cambiar("metaNombre", e.target.value)}
              maxLength={60}
              placeholder="Moto nueva, viaje, fondo de emergencia..."
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <CampoDinero
                etiqueta="Monto de la meta"
                valor={ajustes.metaAhorro || null}
                onCambio={(v) => cambiar("metaAhorro", v ?? 0)}
              />
              <Campo
                etiqueta="Fecha límite"
                type="date"
                value={ajustes.metaFechaLimite ?? ""}
                onChange={(e) => cambiar("metaFechaLimite", e.target.value || null)}
                ayuda="Opcional."
              />
            </div>
            <Boton type="submit" cargando={guardando === "dinero"} className="self-start">
              <Target className="size-4" aria-hidden="true" />
              Guardar
            </Boton>
          </form>
        </Tarjeta>

        <Tarjeta titulo="Recordatorio por correo" retraso={0.05}>
          <form onSubmit={(e) => guardar("correo", e)} className="flex flex-col gap-4">
            <Campo
              etiqueta="Correo de destino"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={ajustes.email}
              onChange={(e) => cambiar("email", e.target.value)}
              placeholder="tucorreo@gmail.com"
            />
            <Interruptor
              etiqueta="Enviar el aviso diario"
              descripcion="Un correo al día cuando se acerque un pago."
              activo={ajustes.emailActivo}
              onCambio={(v) => cambiar("emailActivo", v)}
            />
            <Interruptor
              etiqueta="Enviar aunque no haya pagos cerca"
              descripcion="Recibes el resumen del mes todos los días, no solo cuando algo vence."
              activo={ajustes.enviarSiempre}
              onCambio={(v) => cambiar("enviarSiempre", v)}
            />
            <Selector
              etiqueta="Avisar con anticipación"
              value={String(ajustes.diasAviso)}
              onChange={(e) => cambiar("diasAviso", Number(e.target.value))}
            >
              {[0, 1, 2, 3, 5, 7, 10].map((d) => (
                <option key={d} value={d}>
                  {d === 0 ? "El mismo día" : `${d} ${d === 1 ? "día" : "días"} antes`}
                </option>
              ))}
            </Selector>

            <div className="flex flex-wrap gap-2">
              <Boton type="submit" cargando={guardando === "correo"}>
                <Wallet className="size-4" aria-hidden="true" />
                Guardar
              </Boton>
              <Boton
                type="button"
                variante="secundario"
                cargando={probando}
                disabled={!listo}
                onClick={enviarPrueba}
              >
                <Send className="size-4" aria-hidden="true" />
                Enviar prueba
              </Boton>
            </div>
            {!listo && (
              <p className="text-[12.5px] leading-relaxed text-tinta-3">
                Para enviar correos falta configurar las credenciales del proveedor
                en las variables de entorno.
              </p>
            )}
          </form>
        </Tarjeta>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Tarjeta titulo="Estado del envío" retraso={0.1}>
          <ul className="flex flex-col gap-2.5">
            {[
              {
                etiqueta: `Proveedor de correo: ${diagnostico.proveedor === "resend" ? "Resend" : "SMTP"}`,
                ok: true,
                detalle: "Se elige con la variable EMAIL_PROVIDER.",
              },
              {
                etiqueta: "Credenciales del proveedor",
                ok: diagnostico.credenciales,
                detalle:
                  diagnostico.proveedor === "resend"
                    ? "Necesita RESEND_API_KEY."
                    : "Necesita SMTP_HOST, SMTP_USER y SMTP_PASS.",
              },
              {
                etiqueta: "Remitente configurado",
                ok: diagnostico.remitente,
                detalle: "Necesita EMAIL_FROM.",
              },
              {
                etiqueta: "Secreto del cron",
                ok: diagnostico.cron,
                detalle: "Necesita CRON_SECRET para que el disparo diario sea autorizado.",
              },
            ].map((item) => (
              <li key={item.etiqueta} className="flex items-start gap-2.5">
                {item.ok ? (
                  <CircleCheck className="mt-0.5 size-4 shrink-0 text-verde" aria-hidden="true" />
                ) : (
                  <CircleAlert className="mt-0.5 size-4 shrink-0 text-aviso" aria-hidden="true" />
                )}
                <span className="min-w-0">
                  <span className="block text-[13.5px] text-tinta">{item.etiqueta}</span>
                  <span className="block text-[12.5px] leading-relaxed text-tinta-3">
                    {item.ok ? "Listo" : item.detalle}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Tarjeta>

        <Tarjeta titulo="Tus datos" retraso={0.15}>
          <div className="flex flex-col gap-3">
            <p className="text-[13.5px] leading-relaxed text-tinta-2">
              Todo vive en tu propia base de MongoDB Atlas. Puedes bajarte una copia
              cuando quieras: el archivo abre directo en Excel o Google Sheets.
            </p>
            <BotonEnlace href="/api/exportar" descarga variante="secundario" className="self-start">
              <Download className="size-4" aria-hidden="true" />
              Exportar todo a CSV
            </BotonEnlace>
          </div>
        </Tarjeta>
      </div>
    </div>
  );
}
