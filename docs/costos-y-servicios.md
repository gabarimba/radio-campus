# Servicios externos, accesos y costos

| Servicio | Uso | Requisitos y límites | Costo orientativo |
|---|---|---|---|
| Supabase | PostgreSQL, Auth y Realtime | Proyecto y credenciales. La clave `service_role` solo se configura en servidor. | Depende del plan, almacenamiento, usuarios activos y tráfico; revisar tarifas actuales antes de producción. |
| Render | Proceso Node persistente y HTTPS | Una instancia que no duerma para atender el cierre periódico de rondas. | Depende del tipo de instancia/uso; revisar [precios de Render](https://render.com/pricing). |
| Open-Meteo | Temperatura actual | Sin llave para API básica; fallback manual o temperatura simulada desde admin. | Plan gratuito disponible sujeto a límites/condiciones publicados por [Open-Meteo](https://open-meteo.com/en/pricing). |
| Jamendo API v3 | Búsqueda de catálogo y URL de stream | Registrar aplicación de solo lectura y configurar `JAMENDO_CLIENT_ID`. El plan de apps no comerciales indica hasta **35 000 solicitudes API al mes**. API permite leer `audio` como stream remoto y `include=licenses`. | Acceso API gratuito para uso no comercial según su página de planes; Jamendo indica contactar ventas para usos comerciales. Su API Terms of Use indica que se reserva cobrar o incluir anuncios en el futuro. |
| Creative Commons | Permiso por grabación | El sistema solo acepta BY, BY-SA o BY-ND; excluye NC. Debe conservar crédito y enlace a la obra. ND impide adaptar/editar la obra. | Sin cuota de licencia estándar, sujeto a los términos exactos de cada obra y a que el uploader tenga derechos para otorgarlos. |
| Spotify Web Playback SDK | Comparada, no integrada | Cuenta Premium obligatoria para playback en SDK; políticas restringen el uso para difusión no interactiva. | Suscripción Premium no autoriza por sí sola radio pública. |
| YouTube IFrame Player | Comparada, no integrada | Player visible; políticas prohíben reproductores de fondo y separar audio del video. | API/embebido no sustituye licencias de comunicación pública. |
| SpeechSynthesis del navegador | Vista previa y anuncios entre canciones | Voz local del navegador; el navegador principal debe seguir abierto, con audio habilitado. No se guarda audio generado. | Sin tarifa de proveedor; voces y calidad varían por navegador/sistema operativo. |

## Comparación y selección del streaming

| Opción | SDK/API oficial | Cuenta Premium | Streaming dentro del sistema | Decisión |
|---|---|---:|---|---|
| Spotify Web Playback SDK | Sí | Sí | Técnicamente sí; la política de Spotify limita difusión no interactiva y uso comercial. | Descartado para radio de campus. |
| YouTube IFrame Player | Sí | No para video público | Solo mediante player visible; no permite audio separado ni reproductor de fondo. | Descartado como radio continua. |
| Jamendo API v3 | Sí | No | Sí. Catálogo API publica URL `audio` de stream; controla formatos y devuelve metadatos/licencia. Uso no comercial disponible sujeto a términos y cuota API. | **Elegido para la versión inicial** como catálogo independiente con licencias CC; el reproductor público usa el stream oficial remoto. |

Jamendo indica que cada contenido expuesto por API lleva una licencia Creative Commons, identifica `license_ccurl` al incluir licencias, y pide atribuir al artista y a Jamendo con enlace a la obra. Los términos también requieren que el desarrollador obtenga licencias/permisos aplicables y señalan que el contenido depende de cada uploader. Por eso el sistema filtra licencias sin NC, conserva atribución y exige habilitación explícita de admin; esto no garantiza que un uploader tenga control de todos los derechos del fonograma ni resuelve el alcance jurídico del uso concreto del campus.

En Jamendo, las licencias BY/BY-SA/BY-ND permiten uso comercial sujeto a atribución y condiciones; ND prohíbe modificaciones. Se excluye NC para la radio aunque el proyecto académico se planee como no comercial. Si universidad vende anuncios, patrocinios o entiende su uso como comercial, consultar a Jamendo Licensing por el plan comercial antes de emitir. La API Terms of Use indica que el uso comercial debe negociarse y se reserva cambiar límites, cobrar o mostrar anuncios.

## Referencias oficiales

- [Jamendo API v3: búsqueda de tracks, audio y filtro de licencias](https://developer.jamendo.com/v3.0/tracks)
- [Jamendo: planes API para apps no comerciales y cuota mensual](https://developer.jamendo.com/v3.0)
- [Jamendo API Terms of Use](https://devportal.jamendo.com/api_terms_of_use)
- [Creative Commons: tipos de licencia](https://creativecommons.org/cc-licenses/)
- [Spotify Web Playback SDK y requisitos](https://developer.spotify.com/documentation/web-playback-sdk/tutorials/getting-started)
- [Políticas de Spotify Platform](https://developer.spotify.com/policy)
- [Políticas de YouTube API Services](https://developers.google.com/youtube/terms/developer-policies)
- [Derechos y licencias digitales en SACM](https://www.sacm.org.mx/pdf/Memoria_2023.pdf)

La institución debe verificar condiciones actuales, territorio, titularidad del fonograma, repertorio, uso de anuncios y comunicación pública con su área jurídica y los titulares o gestores pertinentes. SACM informa sobre convenios con servicios digitales, pero eso no acredita cobertura para una radio universitaria específica.
