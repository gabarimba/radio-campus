# Sistema de Radio Inteligente e Interactiva para el Campus

Aplicación web en español para programar rondas musicales con reglas contextuales, votar desde un QR y administrar canciones, eventos y anuncios. La aplicación no almacena audio. PostgreSQL conserva el catálogo y la programación; el servidor decide cuándo cierra cada ronda.

## Estado del proyecto

Esta es la primera versión de desarrollo. Incluye las rutas principales, esquema SQL, autenticación de administración vía Supabase, voto anónimo limitado, selección contextual, persistencia y vistas responsive. **No está desplegada ni se ha conectado una cuenta de Supabase.** La reproducción pública real sigue pendiente de confirmar un proveedor con derechos y una API adecuada. La UI detiene explícitamente la reproducción mientras no exista proveedor autorizado.

## Rutas

- `/` — pantalla pública panorámica, ronda, opciones, QR y resultado.
- `/votar` — votación móvil sin instalación.
- `/admin` — administración protegida.
- `/api/public/state` — estado público sin caché.
- `/api/votes` — recepción de votos validada en servidor.

## Stack y servicios

| Componente | Elección | Motivo / límite |
|---|---|---|
| Aplicación | Next.js 16, React 19 y TypeScript | Una aplicación para las tres vistas y API. |
| Base de datos y autenticación | Supabase PostgreSQL y Auth | Persistencia, perfiles administradores y autenticación. |
| Tiempo real | Supabase Realtime Broadcast y consulta de recuperación | Cambios de voto/ronda llegan a clientes suscritos; la pantalla consulta de nuevo si pierde conexión. |
| Clima | Open-Meteo Forecast API | Temperatura actual sin llave; se aplica respaldo cuando falla. |
| Código QR | `qrcode` | Se genera en la pantalla pública para la URL de la ronda activa. |
| Streaming y catálogo | API Jamendo v3 + stream MP3 remoto | Reproduce streams oficiales de pistas importadas con Creative Commons BY/BY-SA/BY-ND; requiere un Client ID de Jamendo y aprobación de cada pista. |
| TTS | SpeechSynthesis del navegador | Previsualización en admin y locución de anuncios aprobados entre pistas. Calidad/voz dependen del navegador. |
| Despliegue sugerido | Servicio Node persistente en Render | El proceso revisa rondas vencidas periódicamente. El plan/uso vigente determina el costo. No usar una función serverless que se duerme para el trabajador de cierre. |

El repositorio no fija costos comerciales: dependen del proveedor, tráfico, almacenamiento, cuenta y licencia institucional. Consulta [Costos y requisitos](docs/costos-y-servicios.md).

## Inicio local

Requisitos: Node.js 20.9 o posterior, npm y un proyecto Supabase.

1. En Supabase, ejecuta `supabase/migrations/202611190001_esquema_inicial.sql` desde el SQL Editor.
2. Copia `.env.example` a `.env.local` y completa Project URL, clave pública y clave `service_role`. La clave de servicio solo se usa en servidor.
3. Crea un usuario en Supabase Auth. Inserta su perfil autorizado con el procedimiento del [manual de instalación](docs/manual-instalacion.md).
4. Desde esta carpeta:

   ```bash
   npm install
   npm run dev
   ```

5. Abre `http://localhost:3000`. Para abrir rondas se requieren dos o más canciones activas con autorización verificada y no explícitas.

## Pruebas y compilación

```bash
npm test
npm run lint
npm run build
```

Las pruebas unitarias cubren el motor puro de selección. No sustituyen pruebas con Supabase real, pruebas en varios teléfonos ni verificación de derechos musicales. El alcance queda registrado en [Pruebas y demostración](docs/pruebas-y-demostracion.md).

## Arquitectura

El flujo, el modelo de datos y los límites de confianza se describen en [Arquitectura](docs/arquitectura.md). Las rutas de operación y recuperación están en el [manual del administrador](docs/manual-administrador.md).

## Limitaciones y pendientes

- **Streaming:** existe un player HTML5 conectado al endpoint oficial de Jamendo. Requiere registrar una app Jamendo y configurar `JAMENDO_CLIENT_ID`; la API no está configurada en este entorno. El player solo reserva y reproduce una pista importada, autorizada y dentro de la licencia filtrada. La emisión pública todavía requiere que la institución compruebe derechos y condiciones aplicables.
- **Música de catálogo:** no se incluyen canciones seed. La búsqueda Jamendo filtra CC sin NC; cada pista se importa desactivada. Administración debe revisar la licencia y la cobertura de los derechos de grabación antes de habilitarla.
- **Locución:** anuncios aprobados se leen con SpeechSynthesis del navegador al terminar una canción, sin superponerse. Requiere que el navegador principal de radio permanezca abierto; voces y continuidad dependen del navegador.
- **Votación:** el cierre y conteo oficiales ocurren en Postgres/servidor; requiere que el servicio Node esté operativo. El token por dispositivo es anónimo, no impide que alguien borre datos o cambie de navegador. El límite por IP aporta una barrera adicional, no una identidad fuerte.
- **Contexto:** se implementan clima, hora y eventos. El administrador puede crear reglas, pero los perfiles de energía deben asociarse con etiquetas existentes para cambiar el ranking. Si falla el clima, la temperatura queda `null` y el motor continúa.
- **Tiempo real:** Broadcast acelera cambios; la consulta periódica (8 s en pantalla pública; 5 s en votación) permite recuperación. Debe verificarse en el proyecto Supabase y la instancia de producción.
- **Administración incompleta:** se incluyen canciones, búsqueda e importación Jamendo, etiquetas, listas, reglas, eventos, anuncios, estadísticas básicas y control de cola. Edición avanzada de cada metadato y análisis por cohortes quedan pendientes.
- **Despliegue:** no se publica sin credenciales/cuenta. Consultar pasos exactos en el manual; no se debe presentar un despliegue como hecho hasta comprobar URL HTTPS y flujos de punta a punta.

## Documentación

- [Manual de instalación y despliegue](docs/manual-instalacion.md)
- [Manual de operación del administrador](docs/manual-administrador.md)
- [Arquitectura y modelo de datos](docs/arquitectura.md)
- [Pruebas y guion de demostración](docs/pruebas-y-demostracion.md)
- [Servicios, requisitos y costos](docs/costos-y-servicios.md)
