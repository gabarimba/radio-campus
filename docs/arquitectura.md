# Arquitectura y modelo de datos

## Flujo

```mermaid
flowchart LR
  Admin[Panel admin] -->|CRUD, login| API[Next API servidor]
  API --> Auth[Supabase Auth]
  API --> DB[(PostgreSQL persistente)]
  Voto[Web móvil] -->|token anónimo + opción| API
  QR[QR de ronda] --> Voto
  API -->|función transaccional| DB
  DB -->|cierre / resultado| Worker[Proceso Node persistente]
  Worker -->|revisa cada 5 s| DB
  API -->|Broadcast| RT[Supabase Realtime]
  RT --> Pantalla[Pantalla pública]
  RT --> Admin
  API --> Contexto[Hora + Open-Meteo + eventos]
  Contexto --> Motor[Motor de selección puro]
  Motor --> DB
  Pantalla --> Player[HTML Audio en navegador principal]
  Player --> Jamendo[Jamendo API v3: stream remoto y licencia CC]
  Player --> TTS[SpeechSynthesis entre canciones]
```

**Autoridad:** el servidor asigna las fechas de apertura y cierre. `registrar_voto` bloquea la fila de ronda, valida vigencia y opción, aplica límite IP y unicidad por dispositivo. `cerrar_ronda_vencida` cuenta votos y persiste ganador/desempate en una transacción. La pantalla calcula un contador visual desde `cierra_en`, sin autoridad de cierre local.

**Tiempo real:** los endpoints publican `estado_actualizado` en el canal `radio-publica`; la pantalla se suscribe y también recupera mediante consultas periódicas. El canal no contiene identidad del votante. Las lecturas de totales salen de la API de servidor. La reproducción se inicia manualmente en el navegador de la pantalla principal y las demás pantallas solo muestran el estado.

**Selección pura:** `src/lib/seleccion.ts` filtra canciones activas, autorizadas y no explícitas, aplica la regla activa de mayor prioridad, evita las últimas reproducciones y entrega razones por candidata. La lista de respaldo solo se consulta después de excluir la ventana reciente; el respaldo también debe tener permiso verificado.

## Entidades principales

```mermaid
erDiagram
  AUTH_USERS ||--o| PERFILES_ADMIN : tiene
  CANCIONES ||--o{ CANCION_ETIQUETAS : clasifica
  ETIQUETAS ||--o{ CANCION_ETIQUETAS : contiene
  LISTAS_REPRODUCCION ||--o{ LISTA_CANCIONES : contiene
  CANCIONES ||--o{ LISTA_CANCIONES : integra
  RONDAS ||--|{ CANDIDATAS_RONDA : ofrece
  CANCIONES ||--o{ CANDIDATAS_RONDA : candidata
  RONDAS ||--o{ VOTOS : recibe
  CANDIDATAS_RONDA ||--o{ VOTOS : seleccionada
  RONDAS ||--o{ COLA_REPRODUCCION : genera
  CANCIONES ||--o{ COLA_REPRODUCCION : reproduce
  ANUNCIOS ||--o{ HISTORIAL_REPRODUCCION : registra
  CANCIONES ||--o{ HISTORIAL_REPRODUCCION : registra
  REGLAS_CONTEXTUALES ||..|| EVENTOS_CALENDARIO : condiciona
  PERFILES_ADMIN ||--o{ REGISTRO_AUDITORIA : ejecuta
```

| Tabla | Propósito |
|---|---|
| `perfiles_admin` | Rol y habilitación del usuario de Supabase Auth. |
| `canciones`, `etiquetas`, `cancion_etiquetas` | Catálogo y atributos de contexto. |
| `listas_reproduccion`, `lista_canciones` | Colecciones ordenadas administrables. |
| `reglas_contextuales`, `eventos_calendario`, `configuracion` | Contexto y parámetros persistentes. |
| `rondas`, `candidatas_ronda`, `votos` | Votación, razones, conteo y resultado. |
| `limites_voto` | Limitación temporal por señal IP protegida. |
| `cola_reproduccion`, `historial_reproduccion` | Cola propuesta y registro de eventos del reproductor. |
| `anuncios` | Texto, aprobación, vigencia y programación de anuncios. |
| `registro_auditoria` | Cambios de administración. |

La integración Jamendo usa `include=licenses,musicinfo`, filtra licencias BY/BY-SA/BY-ND sin NC y vuelve a consultar licencia y autorización al solicitar el stream. El audio se sirve con la URL `audio` devuelta por la API de tracks; no se descarga ni almacena en el servidor.

Todas las tablas usan RLS. Las escrituras administrativas y RPCs de voto solo se ejecutan desde servidor con `service_role`, nunca desde el navegador. Las claves privadas no llevan prefijo `NEXT_PUBLIC_`.
