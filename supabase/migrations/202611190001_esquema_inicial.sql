-- Esquema inicial del Sistema de Radio Inteligente e Interactiva para el Campus.
-- Aplicar en Supabase SQL Editor o con Supabase CLI.
create extension if not exists pgcrypto;

create type public.estado_ronda as enum ('programada', 'abierta', 'cerrada', 'cancelada');
create type public.estado_anuncio as enum ('borrador', 'aprobado', 'programado', 'reproducido', 'vencido', 'cancelado');
create type public.tipo_evento_reproduccion as enum ('iniciada', 'finalizada', 'fallida', 'omitida', 'anuncio');

create table public.perfiles_admin (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  rol text not null default 'operador' check (rol in ('admin', 'operador', 'consulta')),
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

create table public.canciones (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  artista text not null,
  album text,
  duracion_segundos integer check (duracion_segundos > 0),
  proveedor text,
  id_proveedor text,
  url_proveedor text,
  autorizacion_verificada boolean not null default false,
  notas_derechos text,
  explicita boolean not null default false,
  autorizada boolean not null default false,
  prioridad integer not null default 0,
  activa boolean not null default true,
  creada_en timestamptz not null default now(),
  actualizada_en timestamptz not null default now(),
  constraint cancion_origen_unico unique (proveedor, id_proveedor)
);

create table public.etiquetas (
  id uuid primary key default gen_random_uuid(),
  categoria text not null check (categoria in ('genero', 'energia', 'ambiente', 'tematica', 'restriccion')),
  nombre text not null,
  constraint etiqueta_categoria_nombre_unico unique (categoria, nombre)
);

create table public.cancion_etiquetas (
  cancion_id uuid not null references public.canciones(id) on delete cascade,
  etiqueta_id uuid not null references public.etiquetas(id) on delete cascade,
  primary key (cancion_id, etiqueta_id)
);

create table public.listas_reproduccion (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  descripcion text,
  activa boolean not null default true,
  autorizada boolean not null default false,
  creada_en timestamptz not null default now(),
  actualizada_en timestamptz not null default now()
);

create table public.lista_canciones (
  lista_id uuid not null references public.listas_reproduccion(id) on delete cascade,
  cancion_id uuid not null references public.canciones(id) on delete cascade,
  posicion integer not null check (posicion > 0),
  primary key (lista_id, cancion_id),
  unique (lista_id, posicion)
);

create table public.reglas_contextuales (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  prioridad integer not null default 0,
  activa boolean not null default true,
  condicion jsonb not null default '{}'::jsonb,
  preferencias jsonb not null default '{}'::jsonb,
  creada_en timestamptz not null default now(),
  actualizada_en timestamptz not null default now()
);

create table public.eventos_calendario (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  inicia_en timestamptz not null,
  termina_en timestamptz not null,
  prioridad integer not null default 0,
  etiquetas_requeridas text[] not null default '{}',
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  check (termina_en > inicia_en),
  unique (nombre, inicia_en)
);

create table public.configuracion (
  clave text primary key,
  valor jsonb not null,
  actualizada_en timestamptz not null default now(),
  actualizada_por uuid references public.perfiles_admin(id) on delete set null
);

create table public.rondas (
  id uuid primary key default gen_random_uuid(),
  estado public.estado_ronda not null default 'programada',
  inicia_en timestamptz,
  cierra_en timestamptz,
  duracion_segundos integer not null default 240 check (duracion_segundos between 30 and 3600),
  regla_desempate text not null default 'prioridad' check (regla_desempate in ('aleatorio', 'prioridad', 'primera_opcion')),
  ganador_id uuid references public.canciones(id) on delete set null,
  resultado jsonb not null default '{}'::jsonb,
  contexto jsonb not null default '{}'::jsonb,
  cerrada_en timestamptz,
  creada_en timestamptz not null default now(),
  check (cierra_en is null or inicia_en is null or cierra_en > inicia_en)
);

create unique index una_ronda_abierta on public.rondas ((estado)) where estado = 'abierta';
create table public.candidatas_ronda (
  ronda_id uuid not null references public.rondas(id) on delete cascade,
  cancion_id uuid not null references public.canciones(id) on delete restrict,
  posicion smallint not null check (posicion in (1, 2)),
  puntuacion integer not null default 0,
  razones text[] not null default '{}',
  primary key (ronda_id, cancion_id),
  unique (ronda_id, posicion)
);

create table public.limites_voto (
  llave_hash text not null,
  ventana_inicio timestamptz not null,
  cantidad integer not null default 0,
  primary key (llave_hash, ventana_inicio)
);

create table public.votos (
  id uuid primary key default gen_random_uuid(),
  ronda_id uuid not null references public.rondas(id) on delete cascade,
  cancion_id uuid not null,
  dispositivo_hash text not null,
  ip_hash text not null,
  creado_en timestamptz not null default now(),
  foreign key (ronda_id, cancion_id) references public.candidatas_ronda(ronda_id, cancion_id) on delete cascade,
  unique (ronda_id, dispositivo_hash)
);

create table public.cola_reproduccion (
  id uuid primary key default gen_random_uuid(),
  cancion_id uuid references public.canciones(id) on delete set null,
  ronda_id uuid references public.rondas(id) on delete set null,
  tipo text not null check (tipo in ('cancion', 'anuncio')),
  posicion bigint generated always as identity,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'reproduciendo', 'completado', 'fallido', 'omitido')),
  prevista_en timestamptz,
  creada_en timestamptz not null default now()
);

create table public.anuncios (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  texto text not null,
  estado public.estado_anuncio not null default 'borrador',
  aprobado_por uuid references public.perfiles_admin(id) on delete set null,
  aprobado_en timestamptz,
  inicia_en timestamptz,
  termina_en timestamptz,
  frecuencia_minutos integer not null default 60 check (frecuencia_minutos > 0),
  ultima_reproduccion timestamptz,
  proveedor_tts text,
  referencia_audio text,
  creado_en timestamptz not null default now(),
  check (termina_en is null or inicia_en is null or termina_en > inicia_en)
);

create table public.historial_reproduccion (
  id uuid primary key default gen_random_uuid(),
  tipo public.tipo_evento_reproduccion not null,
  cancion_id uuid references public.canciones(id) on delete set null,
  anuncio_id uuid references public.anuncios(id) on delete set null,
  ronda_id uuid references public.rondas(id) on delete set null,
  detalle jsonb not null default '{}'::jsonb,
  ocurrido_en timestamptz not null default now()
);

create table public.registro_auditoria (
  id bigint generated always as identity primary key,
  admin_id uuid references public.perfiles_admin(id) on delete set null,
  accion text not null,
  entidad text not null,
  entidad_id text,
  detalle jsonb not null default '{}'::jsonb,
  creado_en timestamptz not null default now()
);

create index rondas_estado_cierre on public.rondas (estado, cierra_en);
create index votos_ronda on public.votos (ronda_id, cancion_id);
create index canciones_activas on public.canciones (activa, autorizada, explicita);
create index eventos_vigentes on public.eventos_calendario (inicia_en, termina_en) where activo;
create index anuncios_vigentes on public.anuncios (estado, inicia_en, termina_en);
create index historial_reciente on public.historial_reproduccion (ocurrido_en desc);

-- Enrutamiento en tiempo real: solo se publican cambios necesarios para las vistas.
alter table public.rondas replica identity full;
alter table public.candidatas_ronda replica identity full;
alter table public.canciones replica identity full;

-- Voto atómico: bloquea la ronda para impedir votos luego del cierre oficial.
create or replace function public.registrar_voto(
  p_ronda uuid, p_cancion uuid, p_dispositivo_hash text, p_ip_hash text,
  p_limite_ip integer default 10
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_ronda public.rondas%rowtype;
  v_inicio timestamptz := date_trunc('minute', now());
  v_total integer;
begin
  select * into v_ronda from public.rondas where id = p_ronda for update;
  if not found or v_ronda.estado <> 'abierta' or now() >= v_ronda.cierra_en then
    return jsonb_build_object('ok', false, 'error', 'ronda_cerrada');
  end if;
  if not exists (select 1 from public.candidatas_ronda where ronda_id = p_ronda and cancion_id = p_cancion) then
    return jsonb_build_object('ok', false, 'error', 'opcion_invalida');
  end if;
  insert into public.limites_voto(llave_hash, ventana_inicio, cantidad)
  values (p_ip_hash, v_inicio, 1)
  on conflict (llave_hash, ventana_inicio) do update
    set cantidad = public.limites_voto.cantidad + 1
  returning cantidad into v_total;
  if v_total > p_limite_ip then
    return jsonb_build_object('ok', false, 'error', 'limite_ip');
  end if;
  insert into public.votos(ronda_id, cancion_id, dispositivo_hash, ip_hash)
  values (p_ronda, p_cancion, p_dispositivo_hash, p_ip_hash)
  on conflict (ronda_id, dispositivo_hash) do nothing;
  if not found then return jsonb_build_object('ok', false, 'error', 'voto_duplicado'); end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- Cierre servidor: agrupa los votos y persiste el resultado de manera transaccional.
create or replace function public.cerrar_ronda_vencida(p_ronda uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_ronda public.rondas%rowtype;
  v_ganador uuid;
  v_total integer;
  v_empate boolean;
  v_sin_votos boolean;
begin
  select * into v_ronda from public.rondas where id = p_ronda for update;
  if not found or v_ronda.estado <> 'abierta' or now() < v_ronda.cierra_en then
    return jsonb_build_object('cerrada', false);
  end if;
  with conteos as (
    select c.cancion_id, c.posicion, c.puntuacion, count(v.id)::integer as votos
    from public.candidatas_ronda c
    left join public.votos v on v.ronda_id = c.ronda_id and v.cancion_id = c.cancion_id
    where c.ronda_id = p_ronda group by c.cancion_id, c.posicion, c.puntuacion
  ), maximos as (select max(votos) as max_votos from conteos)
  select (select sum(votos)::integer from conteos),
         case when coalesce((select sum(votos) from conteos), 0) = 0 then false
              else (select count(*) > 1 from conteos, maximos where conteos.votos = maximos.max_votos) end,
         (select cancion_id from conteos, maximos where conteos.votos = maximos.max_votos
           order by case when v_ronda.regla_desempate = 'prioridad' then puntuacion else 0 end desc,
                    case when v_ronda.regla_desempate = 'primera_opcion' then posicion else 0 end asc,
                    gen_random_uuid() limit 1)
  into v_total, v_empate, v_ganador;
  v_sin_votos := coalesce(v_total, 0) = 0;
  update public.rondas set estado = 'cerrada', ganador_id = v_ganador, cerrada_en = now(),
    resultado = jsonb_build_object('votos_total', coalesce(v_total, 0), 'empate', coalesce(v_empate, false), 'sin_votos', v_sin_votos)
    where id = p_ronda;
  if v_ganador is not null then
    insert into public.cola_reproduccion(cancion_id, ronda_id, tipo, estado)
    values (v_ganador, p_ronda, 'cancion', 'pendiente');
  end if;
  return jsonb_build_object('cerrada', true, 'ganador_id', v_ganador, 'votos_total', coalesce(v_total, 0), 'empate', coalesce(v_empate, false), 'sin_votos', v_sin_votos);
end;
$$;

revoke all on function public.registrar_voto(uuid, uuid, text, text, integer) from public, anon, authenticated;
revoke all on function public.cerrar_ronda_vencida(uuid) from public, anon, authenticated;
grant execute on function public.registrar_voto(uuid, uuid, text, text, integer) to service_role;
grant execute on function public.cerrar_ronda_vencida(uuid) to service_role;

-- RLS: la aplicación pública solo consulta estado y canciones aprobadas; mutaciones son servidor.
alter table public.perfiles_admin enable row level security;
alter table public.canciones enable row level security;
alter table public.etiquetas enable row level security;
alter table public.cancion_etiquetas enable row level security;
alter table public.listas_reproduccion enable row level security;
alter table public.lista_canciones enable row level security;
alter table public.reglas_contextuales enable row level security;
alter table public.eventos_calendario enable row level security;
alter table public.configuracion enable row level security;
alter table public.rondas enable row level security;
alter table public.candidatas_ronda enable row level security;
alter table public.votos enable row level security;
alter table public.limites_voto enable row level security;
alter table public.cola_reproduccion enable row level security;
alter table public.anuncios enable row level security;
alter table public.historial_reproduccion enable row level security;
alter table public.registro_auditoria enable row level security;

create policy "lectura publica canciones autorizadas" on public.canciones for select to anon, authenticated using (activa and autorizada and autorizacion_verificada and not explicita);
create policy "lectura publica rondas" on public.rondas for select to anon, authenticated using (estado in ('abierta', 'cerrada'));
create policy "lectura publica candidatas" on public.candidatas_ronda for select to anon, authenticated using (exists (select 1 from public.rondas r where r.id = ronda_id and r.estado in ('abierta', 'cerrada')));
create policy "lectura publica etiquetas" on public.etiquetas for select to anon, authenticated using (true);
create policy "lectura etiquetas canciones aprobadas" on public.cancion_etiquetas for select to anon, authenticated using (exists (select 1 from public.canciones c where c.id = cancion_id and c.activa and c.autorizada and c.autorizacion_verificada));
create policy "lectura listas autorizadas" on public.listas_reproduccion for select to anon, authenticated using (activa and autorizada);
create policy "lectura canciones de listas autorizadas" on public.lista_canciones for select to anon, authenticated using (exists (select 1 from public.listas_reproduccion l where l.id = lista_id and l.activa and l.autorizada));

-- Tablas seed: reglas y configuración iniciales. No se agregan pistas reproducibles sin autorización.
insert into public.reglas_contextuales(nombre, prioridad, condicion, preferencias) values
('Contexto base', 10, '{"predeterminada":true}', '{"energia":"moderada","ventana_repeticion":12}'),
('Mañana', 20, '{"hora_inicio":6,"hora_fin":11}', '{"energia":"moderada","ambiente":"positivo"}'),
('Mediodía', 20, '{"hora_inicio":11,"hora_fin":16}', '{"energia":"dinamica"}'),
('Periodo de exámenes', 100, '{"evento":"examenes"}', '{"energia":"baja","ambiente":"instrumental"}')
on conflict (nombre) do nothing;

insert into public.etiquetas(categoria, nombre) values
('energia','baja'),('energia','moderada'),('energia','dinamica'),
('ambiente','instrumental'),('ambiente','positivo'),
('restriccion','explicit-content'),('tematica','festividad')
on conflict (categoria, nombre) do nothing;

insert into public.configuracion(clave, valor) values
('ciudad', '"Ciudad de México"'),
('coordenadas', '{"lat":19.4326,"lon":-99.1332}'),
('zona_horaria', '"America/Mexico_City"'),
('duracion_ronda_segundos', '240'),
('regla_desempate', '"prioridad"'),
('limite_votos_ip_minuto', '10'),
('ventana_repeticion', '12'),
('programacion_pausada', 'false'),
('proveedor_reproduccion', '"deshabilitado"'),
('canciones_respaldo', '[]')
on conflict (clave) do nothing;
