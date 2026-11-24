# Manual de instalación y despliegue

## A. Preparar Supabase

1. Crea un proyecto Supabase en la región conveniente para el campus.
2. Ejecuta el archivo `supabase/migrations/202611190001_esquema_inicial.sql` en SQL Editor. Conserva el archivo como migración reproducible.
3. En Authentication, crea un usuario administrador y configura los URL de sitio/retorno para desarrollo y producción.
4. Inserta el perfil con SQL, sustituyendo el UUID del usuario:

   ```sql
   insert into public.perfiles_admin (id, nombre, rol, activo)
   values ('UUID_DEL_USUARIO_AUTH', 'Administración Radio Campus', 'admin', true);
   ```

5. En Database → Publications, habilita broadcast según la configuración del proyecto. La app envía eventos por canal Realtime `radio-publica`; confirma que clientes públicos puedan suscribirse a Broadcast.
6. Copia Project URL y la clave pública. Copia `service_role` solo en el entorno servidor.
7. Registra una aplicación Jamendo API v3 de solo lectura en [Jamendo for Developers](https://devportal.jamendo.com/) y configura su Client ID como `JAMENDO_CLIENT_ID`.

## B. Ejecutar en local

1. Instala Node.js 20+.
2. Copia `.env.example` a `.env.local`.
3. Completa `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` y `JAMENDO_CLIENT_ID` con valores propios.
4. Ejecuta `npm install`, `npm test`, `npm run lint`, `npm run build` y `npm run dev`.
5. Visita `/admin`, `/` y `/votar`.

## C. Actualizar el proyecto publicado en Vercel

La instancia compartida vive en Vercel. El proyecto ya está conectado a `gabarimba/radio-campus`; verifica que Vercel genere un deployment con cada nuevo commit de `main`.

1. Confirma que el repositorio conectado sea `gabarimba/radio-campus` y que `main` sea la rama de producción.
2. Configura `npm ci` como Build Command y `npm run build` como Build Step si los valores automáticos no se detectan. El start command lo gestiona Vercel.
3. Configura las variables de `.env.example` en el entorno **Production** de Vercel. No subas `.env.local` ni compartas la clave `SUPABASE_SERVICE_ROLE_KEY`.
4. Confirma el dominio HTTPS y registra el dominio final en Site URL y Redirect URLs de Supabase Auth.
5. Tras desplegar, revisa el catálogo en `/admin`. Si persiste `401 No autorizado`, revisa los registros del servidor y confirma que sesión, perfil y variables apunten al mismo proyecto Supabase.
6. No dependas de `setInterval` en `src/instrumentation.ts` para el cierre en Vercel: las funciones serverless no son un proceso persistente. Configura un mecanismo programado compatible con el plan actual o usa el servicio Node persistente descrito abajo.
7. Solo después de recuperar Administración, prueba desde dos dispositivos en redes distintas: abrir ronda, votar, rechazar repetición, observar cierre, refrescar y consultar resultado.

### Alternativa: Render con proceso Node persistente

1. Crea un Web Service Node desde el mismo repositorio.
2. Build command: `npm ci && npm run build`. Start command: `npm run start`.
3. Configura las variables de `.env.example` en el entorno privado del servicio; no introduzcas credenciales en el repositorio.
4. Configura dominio HTTPS y los URL de Supabase Auth.
5. Mantén una instancia Node activa para que `src/instrumentation.ts` revise cierres cada cinco segundos. Revisa los planes y precios vigentes de Render al desplegar.

## D. Recuperación y seguridad

- Exporta configuración en `/admin → Contexto → Exportar JSON`; conserva el respaldo fuera del servidor.
- Para restaurar, selecciona un respaldo conocido. La importación modifica reglas, eventos y valores de configuración existentes.
- Para restablecer configuración, restaura el respaldo o reejecuta manualmente los valores iniciales de `configuracion`; no borres rondas/votos si necesitas conservar historial.
- Rota `SUPABASE_SERVICE_ROLE_KEY` si se expone; revisa auditoría y registros del proveedor.
- Limita acceso admin a usuarios institucionales y roles mínimos.
- No cargues música/anuncios hasta comprobar permisos y derechos de reproducción pública.
