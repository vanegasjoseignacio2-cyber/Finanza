import { listarEnvios } from "@/lib/datos";
import { protegido } from "@/lib/seguridad";

export const dynamic = "force-dynamic";

export const GET = protegido(async () => Response.json({ envios: await listarEnvios(14) }));
