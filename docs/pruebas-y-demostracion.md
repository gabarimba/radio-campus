# Pruebas y guion de demostración

## Pruebas automatizadas

`npm test` prueba la función pura `elegirCandidatas`: autorización, contenido explícito, prioridad, temperatura/evento, exclusión de recientes y respaldo.

## Resultados de ejecución local

Verificados el 19 de noviembre de 2026 en Node.js 24.20.0:

- `npm test`: **10 pruebas aprobadas** (selección contextual y filtro de licencias CC).
- `npm run lint`: **aprobado**.
- `npm run build`: **aprobado**; las rutas `/`, `/votar`, `/admin` y endpoints API se generaron.
- `npm audit`: **0 vulnerabilidades**.
- Comprobación HTTP de `/`, `/votar` y `/admin`: **200** cada una.
- No se probó integración Supabase, cron de cierre real con datos, voto desde varios dispositivos, búsqueda/stream Jamendo con un Client ID ni publicación HTTPS porque faltan credenciales de Supabase y Jamendo.

La migración define funciones SQL transaccionales para rechazar duplicados, voto posterior al cierre, opción que no pertenece a la ronda y exceso de votos por IP. Esas funciones aún requieren una verificación integrada con un proyecto Supabase real.

## Guion para demostración

1. Inicia sesión como admin y agrega al menos dos canciones con fuente comprobada, etiquetas y referencia de autorización.
2. Crea regla de energía moderada; abre ronda y muestra la pantalla panorámica.
3. Escanea QR con dos móviles y emite votos. Recarga la pantalla pública para demostrar persistencia y observa la actualización en vivo.
4. Intenta votar de nuevo desde el mismo navegador; debe rechazarse.
5. Cambia la temperatura simulada y después activa una regla de evento de exámenes con energía baja; abre nuevas rondas y compara canciones y razones.
6. Ejecuta una ronda de prueba con duración corta, una ronda empatada y otra sin votos; documenta resultados.
7. Exporta y restaura el respaldo de configuración.
8. Configura Jamendo, inicia el audio en la pantalla principal y demuestra atribución, fin de pista y locución aprobada con SpeechSynthesis.

## Capturas sugeridas

- Pantalla pública horizontal con QR y contador.
- Página móvil y confirmación del voto.
- Panel admin con canción, derechos y etiquetas.
- Contexto y reglas priorizadas.
- Mensajes de voto duplicado, ronda cerrada y falla de clima.
- Registro del ganador y resultado persistido.

Las capturas y prueba de extremo a extremo deben tomarse después de configurar Supabase y Jamendo; todavía no existen evidencias de ejecución real en servicios externos.
