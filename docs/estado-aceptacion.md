# Estado frente al prompt original

Revisión del código local y de la instancia de Vercel indicada por el propietario. La instancia se probó el 21 de noviembre de 2026; el código local se volvió a compilar y probar el 24 de noviembre de 2026. No se inició una ronda ni se modificó el estado de producción.

## Pruebas de la instancia publicada

| Comprobación | Resultado | Evidencia / nota |
|---|---|---|
| Pantalla pública `/` | Carga | Muestra el estado de espera. |
| Votación `/votar` | Carga | Informa que no hay votación abierta. No se envió ningún voto. |
| Estado `/api/public/state` | Responde | JSON válido con `round: null` y reproducción en espera. |
| Administración `/admin` | Bloqueada parcialmente | La UI reconoce una sesión, pero las API de administración responden `401 No autorizado`. |
| Perfil Supabase Auth | Verificado | El UUID de la cuenta consultada coincide con `perfiles_admin` (`rol=admin`, `activo=true`). |
| Ronda real, QR y voto | Pendiente | No se abrió una ronda porque la API administrativa falla. |
| Audio Jamendo y locución | Pendiente | No hubo una cola ganadora de una ronda real que permitiera probarlos. |

El `401` no se ha atribuido a una causa única. El rol de la cuenta ya fue comprobado, así que queda revisar la vigencia del JWT recibido por Vercel, el proyecto al que pertenece y la validación de Auth en el servidor. No se debe debilitar la autorización para ocultar este error.

## Matriz de aceptación

| Criterio | Estado | Falta para demostrarlo |
|---|---|---|
| Dos opciones, QR, voto móvil y cierre con ganador | Parcial | La estructura y las RPC existen; falta desbloquear Administración y ejecutar una ronda real con dos dispositivos. |
| Rechazo de votos duplicados y límite por IP | Parcial | Hay validación transaccional en PostgreSQL; falta probarla contra el proyecto Supabase conectado. |
| Empate y ronda sin votos | Parcial | `cerrar_ronda_vencida` implementa ambos casos; faltan pruebas integradas reproducibles. |
| Selección contextual por hora, clima y eventos | Parcial | El motor puro, el clima y las reglas existen; falta verificar cambios con catálogo etiquetado en la instancia. |
| Selección de respaldo y no repetición | Parcial | Hay selección de respaldo; sus resultados deben verificarse con historial real. |
| Reproducción real y cola | Parcial | Existe adaptador Jamendo y el player HTML5; falta probar stream en producción. El audio comienza con intervención del navegador principal. |
| Anuncios entre canciones | Parcial | La locución usa SpeechSynthesis del navegador y solo se intenta al terminar la pista; falta prueba punta a punta y el navegador debe seguir abierto. |
| Persistencia de ajustes y catálogo | Implementado en código, no validado en operación | La base es Supabase; el panel no puede cargar los datos mientras persista el 401. |
| Tiempo real y recuperación | Parcial | Hay Broadcast y sondeo periódico; falta comprobar sincronización en varios dispositivos. |
| Cierre automático de rondas en Vercel | Riesgo de arquitectura | `instrumentation.ts` instala un intervalo de Node, pero las funciones serverless no garantizan un proceso persistente. La lectura pública cierra una ronda vencida si alguien consulta el estado; falta un mecanismo programado confiable para producción. |
| Repositorio y despliegue repetible | Parcial | El repositorio `gabarimba/radio-campus` ya está conectado a `origin/main`, y Vercel muestra la integración GitHub activa. El código se subió antes de conectar la integración; falta comprobar el primer build generado desde la rama. |
| Evidencias integrales | Pendiente | Capturar la ronda completa, el rechazo de duplicado, las reglas contextuales, la reproducción y la locución una vez desbloqueada la operación. |

## Trabajo ya iniciado en la copia local

- Administración obtiene una sesión actualizada y, ante un `401`, renueva el token una vez y reintenta la petición. La misma ruta protegida se usa para buscar en Jamendo y exportar respaldos.
- La consulta de licencias Jamendo envía `include=licenses` y `include=musicinfo` como parámetros separados.
- El reproductor público obtiene el enlace Creative Commons desde las notas de licencia y lo presenta junto al crédito de la pista. El cambio aún es local y requiere despliegue.
- Los cambios ya están publicados en GitHub `main`, pero todavía no se ha observado un despliegue de Vercel que los incluya.

## Siguientes pasos

1. Confirmar que Vercel complete un build desde el nuevo commit de `main` y revisar si la renovación de sesión resuelve el `401`.
2. Si persiste, consultar en el servidor únicamente el tipo, estado y código del error de Auth (nunca el JWT) y comprobar las variables de entorno del deployment sin revelar sus valores.
3. Sustituir el intervalo en memoria por un mecanismo programado confiable para Vercel, o desplegar la aplicación en un servicio Node persistente.
4. Ejecutar el guion de [pruebas y demostración](pruebas-y-demostracion.md) con datos de prueba y más de un dispositivo.
5. Añadir evidencia de la prueba real y actualizar esta matriz después de cada criterio aprobado.
