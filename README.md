# Finanza

Panel personal de finanzas que contesta una sola pregunta, la que importa un
martes cualquiera: **¿cuánto puedo gastar hoy sin arruinar el mes?**

```
libre   = ingreso del mes − gastado − ahorro neto − pagos fijos que aún faltan
por día = libre ÷ días que quedan del mes (contando hoy)
```

Los pagos fijos pendientes se descuentan **antes** de que lleguen: si el plan
del celular vence el 28 y hoy es 23, lo libre ya no lo cuenta como tuyo.

- **Next.js 16** (App Router) + **TypeScript**, **MongoDB Atlas**
- **Tailwind CSS 4**, solo modo oscuro, **Framer Motion**, **Lucide**, Sora e Inter
- Correo diario con **Resend** o **SMTP de Gmail**, disparado por cron
- Instalable en el celular (PWA), con acceso directo a "nuevo gasto"

---

## Qué hace

| Sección | Qué resuelve |
|---|---|
| **Hoy** | Cuánto puedes gastar por día, con el desglose que lo explica. Los pagos fijos del mes con su botón de pagar, lo que requiere atención (topes pasados, pagos vencidos, metas que no van a tiempo) y tus metas. |
| **Movimientos** | Gastos, ingresos, aportes y retiros de metas, transferencias entre cuentas. Saldo por cuenta, búsqueda en todos los meses, edición y "repetir" con un toque. Exportación a CSV. |
| **Presupuesto** | Tope mensual por categoría (aviso al 85 %, alerta al pasarse), los pagos fijos y la tendencia de seis meses contra tu ingreso. |
| **Metas** | Varias metas, con aportes **y retiros**. Ritmo real, proyección y, si tienen fecha, cuánto apartar cada mes. |
| **Ajustes** | Sueldo con historial, cuentas, categorías propias, correo diario (con el estado de los últimos envíos), clave, sesiones y respaldo. |
| **Correo diario** | Abre con lo que puedes gastar por día y el mismo desglose. Pagos por vencer o vencidos, alertas y metas. Los lunes lleva adjunto el respaldo completo. |

### Reglas que conviene conocer

- **Un pago fijo cuenta como pagado solo si consta.** Hay dos formas: registrar
  el pago (crea el gasto vinculado) o marcarlo a mano como "ya estaba pagado".
  Un gasto suelto de la misma categoría **no** lo marca: un cambio de aceite no
  es el seguro de la moto. Al registrar un gasto, la app sugiere vincularlo si
  hay un pago fijo pendiente de esa categoría, pero nunca lo hace sola.
- **El sueldo se espera hasta que se registra.** Mientras no registres el de
  este mes, el cálculo usa el sueldo configurado. Al registrarlo, el real lo
  reemplaza. Cambiar el sueldo "desde" un mes **no reescribe los anteriores**.
- **El ahorro es plata apartada, no gastada.** Aportar a una meta la saca de lo
  libre; retirarla la devuelve. Si la meta vive en una cuenta, el aporte suma a
  su saldo.
- **El ritmo de una meta se mide sobre todos los meses** desde el primer aporte,
  también los meses sin aporte. Si no, la proyección sería optimista.
- **Los saldos de las cuentas** son el saldo inicial más todo lo registrado en
  esa cuenta. Si no registras algo, el saldo no lo sabe.

## Cómo ejecutarlo a diario sin VPS y sin pagar

El correo lo dispara una llamada a `POST /api/cron/recordatorios`, autorizada con
la cabecera `Authorization: Bearer $CRON_SECRET`. Cualquier cosa capaz de hacer
esa llamada una vez al día sirve. Estas son tus opciones, de más a menos cómoda:

### Opción A — Vercel Cron (la recomendada)

Ya viene configurada en `vercel.json`:

```json
{ "crons": [{ "path": "/api/cron/recordatorios", "schedule": "0 12 * * *" }] }
```

- **Coste:** gratis en el plan Hobby.
- **Ventaja:** no hay que configurar nada más. Vercel añade solo la cabecera
  `Authorization: Bearer $CRON_SECRET` si esa variable existe en el proyecto.
- **A tener en cuenta:** en el plan Hobby se permite **un disparo al día** y
  Vercel lo ejecuta dentro de la hora indicada, no al minuto exacto. Para un
  recordatorio diario da igual.
- La hora del cron va **en UTC**: `0 12 * * *` son las **7:00 a. m. en Colombia**.
  Para otra hora, resta 5 (Bogotá = UTC−5): las 6:00 a. m. serían `0 11 * * *`.

### Opción B — GitHub Actions (respaldo o alternativa)

Ya viene el flujo en `.github/workflows/recordatorio-diario.yml`, con reintentos.

- **Coste:** gratis en repositorios públicos; 2.000 minutos al mes en privados, y
  esta tarea gasta segundos.
- **Ventaja:** funciona aunque cambies de hosting, y puedes lanzarlo a mano desde
  la pestaña *Actions* (**Run workflow**) para probar.
- **Configuración:** en *Settings → Secrets and variables → Actions* crea
  `APP_URL` (`https://tu-app.vercel.app`) y `CRON_SECRET` (el mismo de la app).
- **A tener en cuenta:** GitHub puede retrasar las tareas programadas cuando hay
  mucha carga, y en repositorios públicos las desactiva tras 60 días sin
  actividad.

Puedes usar A y B a la vez: GitHub dispara a las 12:15 UTC, un cuarto de hora
después de Vercel, y **antes de enviar se reserva el día de forma atómica** en
la base. Si los dos disparos llegaran al mismo tiempo, solo uno envía (hay una
prueba de integración que lo comprueba con envíos simultáneos).

El correo no sale todos los días: solo cuando vence un pago, hay una alerta
seria (por ejemplo, te pasaste de un tope) o es lunes y toca el respaldo. Si
quieres recibirlo siempre, actívalo en Ajustes. En **Ajustes → Correo diario**
ves qué pasó los últimos días: enviado, sin novedades o el error exacto.

### Opción C — Un disparador externo gratuito

Servicios como **cron-job.org** o **UptimeRobot** (plan gratuito) pueden llamar
a la URL una vez al día. Si el servicio no deja poner cabeceras, el endpoint
también acepta el secreto por query:

```
https://tu-app.vercel.app/api/cron/recordatorios?secreto=EL_SECRETO
```

> Es más cómodo, pero el secreto queda escrito en la URL y en los registros del
> servicio. Prefiere A o B cuando puedas.

### Dónde alojar la app

| Opción | Coste | Notas |
|---|---|---|
| **Vercel Hobby** (recomendada) | Gratis | Es de quien hizo Next.js; el despliegue es conectar el repo y listo. Incluye el cron de la opción A. |
| **Netlify** | Gratis | Funciona, pero los *scheduled functions* se configuran aparte. |
| **Render / Railway (capa gratuita)** | Gratis | El servicio se duerme por inactividad; el primer acceso tarda. Combínalo con la opción B o C. |

---

## Puesta en marcha

### 1. Base de datos (5 minutos)

1. Crea una cuenta en [MongoDB Atlas](https://www.mongodb.com/atlas) y un clúster
   **M0** (gratis, 512 MB — de sobra: cada movimiento ocupa unos pocos bytes).
2. *Database Access* → crea un usuario con contraseña.
3. *Network Access* → añade `0.0.0.0/0`. Las funciones de Vercel no tienen una IP
   fija, así que no hay una lista más estrecha que sirva; la protección real es la
   contraseña del usuario.
4. *Connect → Drivers* → copia la cadena de conexión: esa es `MONGODB_URI`.

> Los clústeres M0 se pausan tras 60 días sin ninguna consulta. Con el correo
> diario funcionando eso no ocurre, porque cada disparo toca la base.

### 2. Correo

**Opción A — Resend** (recomendada si no tienes dominio propio)

1. Crea la cuenta en [resend.com](https://resend.com) — 3.000 correos al mes
   gratis, más que suficiente para uno diario.
2. Copia la *API key* en `RESEND_API_KEY`.
3. Deja `EMAIL_FROM="Finanza <onboarding@resend.dev>"`. Con ese remitente de
   pruebas **solo puedes escribirte a la dirección de tu propia cuenta**, que es
   justo lo que hace falta aquí. Si algún día compras un dominio, lo verificas y
   cambias el remitente.

**Opción B — SMTP de Gmail**

1. Activa la verificación en dos pasos en tu cuenta de Google.
2. *Cuenta de Google → Seguridad → Contraseñas de aplicación* → genera una.
3. Rellena `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_USER=tucorreo@gmail.com`,
   `SMTP_PASS=` la contraseña de aplicación (16 caracteres, sin espacios), y
   `EMAIL_PROVIDER=smtp`.

### 3. Variables de entorno

Copia `.env.example` a `.env.local` y rellénalo. Genera los secretos así:

```bash
openssl rand -base64 32   # AUTH_SECRET
openssl rand -hex 24      # CRON_SECRET
```

`APP_PASSWORD` es la clave con la que entras al panel: elígela larga.

### 4. En local

```bash
npm install
npm run dev          # http://localhost:3000
```

### 5. En Vercel

1. Sube el repositorio a GitHub y en Vercel elige *Add New → Project*.
2. Pega **todas** las variables de `.env.example` en *Settings → Environment
   Variables* (incluida `CRON_SECRET`, que es lo que activa el cron de Vercel).
3. Pon `APP_URL` con la URL final del proyecto: es el enlace del botón del correo.
4. Despliega y entra con tu clave. La pantalla **Hoy** te guía: define el sueldo,
   agrega tus pagos fijos y crea una meta.
5. En **Ajustes → Enviar prueba** comprueba que el correo llega. Mira también
   la carpeta de spam la primera vez y marca el remitente como conocido.

---

## Seguridad

- La primera clave es `APP_PASSWORD`. Desde **Ajustes → Seguridad** puedes
  cambiarla: se guarda con `scrypt` en la base y desde ese momento manda ella.
- Cambiar la clave cierra las demás sesiones. También hay un botón para cerrar
  **todas**, incluida la actual (útil si perdiste el celular).
- Tras 5 intentos fallidos seguidos desde la misma IP, el acceso se bloquea
  15 minutos. La IP se guarda solo como hash.
- El respaldo nunca incluye la clave ni la versión de sesión.

## Respaldo y restauración

Cada lunes el correo lleva adjunto `finanza-respaldo-AAAA-MM-DD.json` (se
desactiva en Ajustes). También se descarga en **Ajustes → Tus datos**. Contiene
todo: movimientos, cuentas, metas, pagos fijos, topes, categorías y ajustes, en
Extended JSON para conservar los identificadores.

Para restaurarlo en una base (por ejemplo, un clúster nuevo de Atlas):

```bash
# MONGODB_URI y MONGODB_DB se leen de .env.local
npm run restaurar -- finanza-respaldo-2026-09-21.json

# si la base ya tiene datos, hay que pedir explícitamente reemplazarlos
npm run restaurar -- finanza-respaldo-2026-09-21.json --reemplazar
```

La clave y las sesiones de la base de destino se conservan.

## Comandos

```bash
npm run dev         # desarrollo
npm run build       # compilación de producción
npm run lint        # ESLint
npm run typecheck   # TypeScript sin emitir
npm test            # pruebas de la lógica (fechas, cálculos, correo)
npm run verificar   # las tres anteriores de un tirón
npm run restaurar   # restaura un respaldo (ver arriba)
```

Hay dos niveles de pruebas:

- **Unitarias** (siempre): la aritmética de lo libre y los pagos pendientes,
  vencimientos (días 31, febrero, cambio de año), sueldo por tramos, metas con
  retiros, saldos por cuenta, topes, alertas y el correo.
- **Integración contra MongoDB real**: se ejecutan cuando existe
  `MONGODB_URI_PRUEBAS`. Cubren migración de datos antiguos, validaciones,
  agregaciones, la reserva atómica del envío con disparos simultáneos, el
  límite de intentos y el ciclo completo respaldo → restauración. Cada archivo
  usa una base propia que se borra al terminar.

  ```bash
  MONGODB_URI_PRUEBAS="mongodb://localhost:27017" npm test
  ```

El flujo `.github/workflows/ci.yml` corre todo esto en cada push, con un
MongoDB 7 real como servicio, además del lint y la compilación de producción.

---

## Cómo está organizado

```
src/
  app/
    (panel)/            Hoy, movimientos, presupuesto, metas, ajustes y /nuevo
    api/                Endpoints REST (protegidos) y el del cron
    login/              Entrada con clave
    manifest.ts         PWA instalable con accesos directos
  components/
    captura.tsx         Crear, editar y repetir movimientos desde cualquier pantalla
    paneles/            Pagos fijos, listas, alertas, barras
    graficos/           Tendencia de seis meses
    ui/                 Botón, campos, modal, avisos, segmentado, cifra animada
  lib/
    finanzas.ts         Todos los cálculos, puros y probados
    datos.ts            Lectura y escritura en MongoDB (sin lógica de dominio)
    seguridad.ts        Claves, sesión vigente y protección de las rutas
    recordatorio-diario.ts  Lo que ejecuta el cron
    email/              Envío (Resend o SMTP) y plantilla del correo
  proxy.ts              Primer filtro de sesión (firma del token)
pruebas/                Unitarias e integración
scripts/restaurar.mjs   Restauración de respaldos
```

### Colores

Un solo tema oscuro. Superficies que se separan del fondo por luminosidad, no
solo por el borde, y un único acento sólido, el verde. El degradado verde →
azul es la firma: solo en el logotipo y en el botón principal. Todos los textos
superan 4,5:1 de contraste (el gris más tenue, 5,2:1 sobre la superficie más
clara). Las series del gráfico (`src/lib/paleta.ts`) están validadas para
daltonismo; el rojo y el ámbar se reservan para dinero en riesgo y siempre van
con texto.

### Categorías

Las propias se crean desde **Ajustes → Categorías**, con un icono a elegir; las
de fábrica se pueden renombrar u ocultar (los movimientos viejos se conservan).
Para añadir iconos a la lista elegible, agrégalos a `ICONOS_DISPONIBLES` en
`src/lib/categorias.ts` y regístralos en `src/components/iconos.tsx`.
