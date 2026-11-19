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
| TTS de vista previa | SpeechSynthesis del navegador | Solo previsualiza texto; no crea audio persistente ni emite locución en el aire. |
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

- **Streaming:** no se integra todavía un proveedor que cumpla la reproducción pública del campus. Spotify Web Playback SDK requiere Premium y sus políticas restringen difusión no interactiva; YouTube exige el reproductor visible y no permite reproducir desde un reproductor de fondo. Una licencia de consumo no acredita por sí sola comunicación pública. Confirmar por escrito proveedor/API y derechos aplicables antes de emitir.
- **Música de catálogo:** la migración no incluye grabaciones semilla ni pistas que aparenten estar autorizadas. Cargar solo contenido con autorización comprobada.
- **Locución:** el navegador permite escuchar una vista previa; el audio de anuncios no se programa ni se mezcla automáticamente entre canciones.
- **Votación:** el cierre y conteo oficiales ocurren en Postgres/servidor; requiere que el servicio Node esté operativo. El token por dispositivo es anónimo, no impide que alguien borre datos o cambie de navegador. El límite por IP aporta una barrera adicional, no una identidad fuerte.
- **Contexto:** se implementan clima, hora y eventos. El administrador puede crear reglas, pero los perfiles de energía deben asociarse con etiquetas existentes para cambiar el ranking. Si falla el clima, la temperatura queda `null` y el motor continúa.
- **Tiempo real:** Broadcast acelera cambios; la consulta periódica (8 s en pantalla pública; 5 s en votación) permite recuperación. Debe verificarse en el proyecto Supabase y la instancia de producción.
- **Administración incompleta:** se incluyen canciones, etiquetas, listas, reglas, eventos y anuncios básicos. Paneles de estadísticas detalladas, control de cola y botones de forzar/saltar reproducción todavía requieren completar el proveedor de audio.
- **Despliegue:** no se publica sin credenciales/cuenta. Consultar pasos exactos en el manual; no se debe presentar un despliegue como hecho hasta comprobar URL HTTPS y flujos de punta a punta.

## Documentación

- [Manual de instalación y despliegue](docs/manual-instalacion.md)
- [Manual de operación del administrador](docs/manual-administrador.md)
- [Arquitectura y modelo de datos](docs/arquitectura.md)
- [Pruebas y guion de demostración](docs/pruebas-y-demostracion.md)
- [Servicios, requisitos y costos](docs/costos-y-servicios.md)
