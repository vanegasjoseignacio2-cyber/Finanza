# Finanza

Panel personal de gastos, ahorro y recordatorios de pago, con un correo diario
que te avisa antes de cada vencimiento.

No es una demo: guarda en una base de datos real (MongoDB Atlas), está detrás de
una clave que solo tú conoces y el aviso diario se dispara solo, sin que tengas
que dejar nada encendido.

- **Next.js 16** (App Router) + **TypeScript**
- **Tailwind CSS 4** · solo modo oscuro · degradados verde → azul
- **Framer Motion** para las animaciones, **Lucide** para los iconos
- **Google Fonts**: Sora (títulos) e Inter (texto y cifras)
- **MongoDB Atlas** como base de datos
- Correo diario con **Resend** o **SMTP de Gmail**, a elección

---

## Qué hace

| Sección | Qué resuelve |
|---|---|
| **Panel** | Ingreso, gastado, ahorrado y disponible del mes. Anillo de progreso de tu meta con proyección de cuántos meses faltan, gastos por categoría, tendencia de los últimos 6 meses y consejos calculados con tus propios números. |
| **Movimientos** | Gastos, aportes al ahorro e ingresos extra. Filtros por mes, tipo y categoría. Exportación a CSV. |
| **Recordatorios** | Pagos que se repiten cada mes. Se marcan como pagados solos cuando registras un gasto de esa categoría, o a mano. Se pueden pausar. |
| **Ajustes** | Ingreso mensual, meta de ahorro, correo de destino, días de anticipación del aviso y un botón para enviarte un correo de prueba. |
| **Correo diario** | Lo que vence en los próximos días, las cifras del mes, el progreso de la meta y un consejo. Nunca se envía dos veces el mismo día. |

---

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

Si usas A y B a la vez no pasa nada: el registro de envíos del día evita que
llegue un correo duplicado.

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
4. Despliega, entra con tu clave y configura tu ingreso y tu meta en **Ajustes**.
5. En **Ajustes → Enviar prueba** comprueba que el correo llega. Mira también
   la carpeta de spam la primera vez y marca el remitente como conocido.

---

## Comandos

```bash
npm run dev         # desarrollo
npm run build       # compilación de producción
npm run lint        # ESLint
npm run typecheck   # TypeScript sin emitir
npm test            # pruebas de la lógica (fechas, cálculos, correo)
npm run verificar   # las tres anteriores de un tirón
```

Las pruebas cubren lo que de verdad puede fallar en silencio: el cálculo del
próximo vencimiento (incluidos los días 31 y febrero), el reparto por categorías,
qué recordatorios merecen aviso, la aritmética del resumen y el escapado de HTML
en el correo.

---

## Cómo está organizado

```
src/
  app/
    (panel)/            Panel, movimientos, recordatorios y ajustes
    api/                Endpoints REST (incluido el del cron)
    login/              Entrada con clave
  components/
    graficos/           Anillo de meta, barras por categoría, tendencia
    paneles/            Listas, tarjetas de cifras y formularios
    ui/                 Botón, campos, modal, avisos, tarjeta
  lib/
    datos.ts            Lectura y escritura en MongoDB
    finanzas.ts         Cálculos puros (probados)
    email/              Envío (Resend o SMTP) y plantilla del correo
    recordatorio-diario.ts  Lo que ejecuta el cron
  proxy.ts              Protege todas las rutas salvo login y cron
```

### Decisiones que conviene conocer

- **El ahorro se descuenta de lo disponible.** Sale del mismo bolsillo que los
  gastos, así que `disponible = ingreso − gastos − ahorro`.
- **Los recordatorios siempre se juzgan contra la fecha de hoy**, aunque estés
  mirando un mes anterior en el panel.
- **`TZ_APP` manda sobre el reloj del servidor.** Los servidores van en UTC; el
  "hoy" de la app se calcula en `America/Bogota` para que un vencimiento no se
  adelante de madrugada.
- **El correo no se duplica**: cada envío queda registrado por fecha, así que si
  el cron se dispara dos veces solo sale uno.
- **Los colores de las series de la gráfica** (`src/lib/paleta.ts`) están
  validados para daltonismo y contraste. Los verdes y azules brillantes de la
  interfaz son para texto e iconos, no para distinguir datos.

### Añadir categorías

Edita `src/lib/categorias.ts` y añade una entrada con un icono de
[Lucide](https://lucide.dev); luego registra ese icono en
`src/components/iconos.tsx`. Nada más.
