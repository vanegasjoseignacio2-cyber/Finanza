/**
 * Congela el scroll de la página mientras hay un diálogo abierto, para que al
 * deslizar sobre él no se mueva lo de atrás.
 *
 * `body { overflow: hidden }` solo no alcanza: la página ya fija `overflow-x` en
 * `html` (globals.css), y entonces el `overflow` del body deja de pasar al
 * navegador y la página sigue desplazándose por debajo. Tampoco lo respeta Safari
 * del iPhone. Por eso se hace lo que funciona en todos: se oculta el desborde en
 * `html` y `body`, y se fija el body en su sitio (`position: fixed`) para
 * devolver luego la página exactamente a donde estaba.
 *
 * Hay un contador: con dos diálogos abiertos a la vez (una confirmación sobre un
 * formulario), el scroll se libera cuando se cierra el último.
 */
let bloqueos = 0;
let deshacer: (() => void) | null = null;

function congelar(): () => void {
  const html = document.documentElement;
  const body = document.body;
  const y = window.scrollY;
  // Sin barra de scroll la página se ensancha: se le deja el mismo ancho para que no salte.
  const anchoBarra = window.innerWidth - html.clientWidth;

  const previo = {
    htmlOverflow: html.style.overflow,
    htmlOverscroll: html.style.overscrollBehavior,
    overflow: body.style.overflow,
    position: body.style.position,
    top: body.style.top,
    left: body.style.left,
    right: body.style.right,
    width: body.style.width,
    paddingRight: body.style.paddingRight,
  };

  html.style.overflow = "hidden";
  html.style.overscrollBehavior = "none";
  body.style.overflow = "hidden";
  body.style.position = "fixed";
  body.style.top = `-${y}px`;
  body.style.left = "0";
  body.style.right = "0";
  body.style.width = "100%";
  if (anchoBarra > 0) body.style.paddingRight = `${anchoBarra}px`;

  return () => {
    html.style.overflow = previo.htmlOverflow;
    html.style.overscrollBehavior = previo.htmlOverscroll;
    body.style.overflow = previo.overflow;
    body.style.position = previo.position;
    body.style.top = previo.top;
    body.style.left = previo.left;
    body.style.right = previo.right;
    body.style.width = previo.width;
    body.style.paddingRight = previo.paddingRight;
    window.scrollTo(0, y);
  };
}

/** Bloquea el scroll de la página. Devuelve la función que lo libera (es seguro llamarla más de una vez). */
export function bloquearScroll(): () => void {
  if (bloqueos === 0) deshacer = congelar();
  bloqueos++;
  let liberado = false;
  return () => {
    if (liberado) return;
    liberado = true;
    bloqueos--;
    if (bloqueos === 0) {
      deshacer?.();
      deshacer = null;
    }
  };
}
