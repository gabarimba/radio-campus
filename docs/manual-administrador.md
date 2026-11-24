# Manual de operación del administrador

## Inicio de sesión

Visita `/admin` e inicia sesión con la cuenta creada en Supabase Auth. El usuario debe tener un perfil activo en `perfiles_admin` con rol `admin` u `operador`. Las cuentas sin perfil no pueden usar la API de administración.

## Catálogo y rondas

1. Busca canciones en Jamendo e impórtalas desde la sección de catálogo. El buscador limita resultados a pistas Creative Commons sin cláusula NC; la pista importada queda desactivada hasta que revises su licencia y la autorización de la grabación. También puedes cargar una fuente institucional.
2. Al habilitar una canción confirmas que revisaste licencia y permisos del fonograma para este uso. Asigna etiquetas `categoria:nombre`, separadas por coma; las categorías son `genero`, `energia`, `ambiente`, `tematica` y `restriccion`. El motor excluye contenido explícito.
3. Crea reglas con prioridad, evento/franja horaria/temperatura y etiqueta preferida. Una regla más prioritaria reemplaza preferencias de menor prioridad.
4. Registra eventos con fechas de inicio y fin. El nombre exacto del evento se usa en la regla contextual correspondiente.
5. Define duración, desempate, límites, ventana de repetición, ciudad y coordenadas en **Contexto**. Para simular clima en una demostración, establece una temperatura en °C; deja el campo vacío para volver al dato de Open-Meteo.
6. Pulsa **Abrir ronda**. Si no hay dos candidatas autorizadas, el servidor no abre la ronda y muestra el motivo. La pantalla pública muestra el QR y el tiempo restante.

## Anuncios

Redacta el aviso y escucha la vista previa del navegador antes de aprobarlo. El navegador principal reclama un anuncio aprobado y vigente al terminar cada canción, lo locuta con SpeechSynthesis y después continúa con la cola. No se crea un archivo de audio; el navegador debe seguir abierto.

## Listas y respaldos

Se pueden crear y retirar listas, gestionar etiquetas y descargar/subir un respaldo JSON de ajustes, reglas y eventos. El respaldo no contiene credenciales, votos, canciones, grabaciones ni historial.

## Fallas y resolución básica

- Si la pantalla no cambia, actualiza la página; la consulta periódica recupera cambios aun si Broadcast no llega.
- Si clima falla, se registra contexto sin temperatura y la selección continúa.
- Si el voto informa ronda cerrada, el reloj del servidor ya venció. No se puede reabrir esa misma ronda.
- Si el servicio servidor se detiene, al volver consulta y cierra rondas cuyo plazo pasó.
- Si no se abre una ronda, verifica catálogo autorizado, disponibilidad de dos canciones fuera de la ventana reciente, regla y estado de pausa.
- Si el login funciona pero la API responde 401, confirma primero que el UUID de `auth.users` coincide con `perfiles_admin.id`, que el perfil está activo y que tiene rol `admin` u `operador`. Si eso está correcto, comprueba que la sesión/JWT y las variables públicas del deployment pertenezcan al mismo proyecto Supabase; revisa los registros de servidor por el motivo de validación. Nunca copies el JWT ni la clave `service_role` a tickets, capturas o chats.
