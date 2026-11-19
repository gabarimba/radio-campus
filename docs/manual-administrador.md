# Manual de operación del administrador

## Inicio de sesión

Visita `/admin` e inicia sesión con la cuenta creada en Supabase Auth. El usuario debe tener un perfil activo en `perfiles_admin` con rol `admin` u `operador`. Las cuentas sin perfil no pueden usar la API de administración.

## Catálogo y rondas

1. Agrega título, artista, proveedor y metadatos. Asocia etiquetas en forma `categoria:nombre`, separadas por coma. Las categorías son `genero`, `energia`, `ambiente`, `tematica` y `restriccion`.
2. Verifica la licencia de la grabación y guarda una referencia institucional. Habilitar la canción exige marcar tanto verificación como autorización. El motor siempre excluye contenido explícito.
3. Crea reglas con prioridad, evento/franja horaria/temperatura y etiqueta preferida. Una regla más prioritaria reemplaza preferencias de menor prioridad.
4. Registra eventos con fechas de inicio y fin. El nombre exacto del evento se usa en la regla contextual correspondiente.
5. Define duración, desempate, límites, ventana de repetición, ciudad y coordenadas en **Contexto**. Para simular clima en una demostración, establece una temperatura en °C; deja el campo vacío para volver al dato de Open-Meteo.
6. Pulsa **Abrir ronda**. Si no hay dos candidatas autorizadas, el servidor no abre la ronda y muestra el motivo. La pantalla pública muestra el QR y el tiempo restante.

## Anuncios

Redacta y programa el aviso, usa la vista previa de voz del navegador y apruébalo tras revisar el texto. En esta versión la aprobación queda persistida, pero no dispara TTS ni inserta el anuncio entre canciones; ese flujo requiere elegir y configurar proveedor TTS y reproductor autorizados.

## Listas y respaldos

Se pueden crear y retirar listas, gestionar etiquetas y descargar/subir un respaldo JSON de ajustes, reglas y eventos. El respaldo no contiene credenciales, votos, canciones, grabaciones ni historial.

## Fallas y resolución básica

- Si la pantalla no cambia, actualiza la página; la consulta periódica recupera cambios aun si Broadcast no llega.
- Si clima falla, se registra contexto sin temperatura y la selección continúa.
- Si el voto informa ronda cerrada, el reloj del servidor ya venció. No se puede reabrir esa misma ronda.
- Si el servicio servidor se detiene, al volver consulta y cierra rondas cuyo plazo pasó.
- Si no se abre una ronda, verifica catálogo autorizado, disponibilidad de dos canciones fuera de la ventana reciente, regla y estado de pausa.
- Si el login funciona pero la API responde 401, revisa `perfiles_admin.activo` y el rol.
