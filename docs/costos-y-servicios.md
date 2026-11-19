# Servicios externos, accesos y costos

| Servicio | Uso | Cuenta/llave | Costo/estado |
|---|---|---|---|
| Supabase | PostgreSQL, Auth y Realtime | Proyecto Supabase; clave pública y `service_role` | Revisar límites y tarifas actuales al desplegar. La `service_role` solo va en servidor. |
| Render (sugerido) | Servicio Node persistente con HTTPS | Cuenta Git + Render | El trabajador requiere proceso encendido; un nivel que duerme no ofrece cierres puntuales. Consultar precio y disponibilidad actuales del proveedor. |
| Open-Meteo | Temperatura | Sin llave para el uso básico descrito | Uso sujeto a términos/cuotas vigentes; el motor funciona con temperatura nula. |
| Spotify | Candidato comparado, no integrado | App de developer y cuenta Premium para Web Playback SDK | La plataforma requiere Premium para streaming; las políticas limitan difusión no interactiva y uso comercial. No usar como radio pública basándose solo en Premium. |
| YouTube IFrame Player | Posible player visible, no configurado | Proyecto Google/YouTube según API y políticas vigentes | No permite reproductor de fondo ni separar audio del video; derechos de comunicación pública son un tema independiente. |
| TTS navegador | Vista previa en admin | No requiere cuenta | Sin tarifa de proveedor; voz y calidad dependen del navegador. No genera locución automática entre pistas. |
| Proveedor musical institucional | Requisito para completar streaming | Contrato, cuenta, API/SDK autorizados y licencia aplicable | Sin proveedor identificado, precio no estimable. Cotizar con la universidad y confirmar territorios, campus, repertorio y comunicación pública. |

## Decisión de streaming

La versión no selecciona un servicio de consumo como solución de difusión pública. Spotify documenta que su plataforma no puede usarse para difusión no interactiva y que el Web Playback SDK exige Premium ([SDK](https://developer.spotify.com/documentation/web-playback-sdk/tutorials/getting-started), [política](https://developer.spotify.com/policy)). Las políticas de YouTube prohíben reproductores de fondo y separar pista de audio ([políticas de API](https://developers.google.com/youtube/terms/developer-policies)). Por ello el proyecto mantiene el proveedor deshabilitado hasta que la universidad confirme por escrito un proveedor y permisos aplicables.

En México, verifica el alcance de derechos de autor y comunicación pública con el área jurídica de la universidad, titulares y gestores pertinentes. La existencia de convenios de licencia digital reportados por SACM no implica que una licencia universitaria concreta esté incluida ([memoria institucional SACM](https://www.sacm.org.mx/pdf/Memoria_2023.pdf)). Esta tabla documenta restricciones técnicas encontradas; no sustituye una autorización o asesoría legal.
