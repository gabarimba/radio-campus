"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase-browser";
import type { Session } from "@supabase/supabase-js";

type Song = { id: string; titulo: string; artista: string; activa: boolean; autorizada: boolean; autorizacion_verificada: boolean; explicita: boolean; proveedor?: string; url_proveedor?: string; notas_derechos?: string };
type Setting = { clave: string; valor: unknown };
type AdminEvent = { id: string; nombre: string; inicia_en: string; termina_en: string; activo: boolean };
type AdminAnnouncement = { id: string; titulo: string; texto: string; estado: string; termina_en: string | null };
type AdminRule = { id: string; nombre: string; prioridad: number; preferencias: Record<string, unknown>; activa: boolean };
type AdminTag = { id: string; nombre: string; categoria: string; cancion_etiquetas: { cancion_id: string }[] };
type AdminPlaylist = { id: string; nombre: string; autorizada: boolean; lista_canciones: { cancion_id: string }[] };
type AdminData = { events: AdminEvent[]; announcements: AdminAnnouncement[]; rules: AdminRule[]; settings: Setting[]; tags: AdminTag[]; playlists: AdminPlaylist[] };
type AdminStats = { totals: { canciones: number; cancionesAutorizadas: number; rondas: number; votos: number }; rounds: { id: string; estado: string; creada_en: string; ganador_id: string | null; resultado: Record<string, unknown>; totalVotos: number }[]; queue: { id: string; tipo: string; estado: string; canciones: { titulo: string; artista: string } | null }[]; history: { id: string; tipo: string; ocurrido_en: string; canciones: { titulo: string; artista: string } | null; anuncios: { titulo: string } | null }[] };

export default function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [data, setData] = useState<AdminData | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [section, setSection] = useState("catalogo");

  useEffect(() => { const supabase = supabaseBrowser(); void supabase.auth.getSession().then(({ data: result }) => setSession(result.session)); const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next)); return () => listener.subscription.unsubscribe(); }, []);
  const token = session?.access_token;
  const api = useCallback(async (path: string, init?: RequestInit) => {
    const response = await fetch(path, { ...init, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...init?.headers } });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || "No se pudo completar la operación.");
    return body;
  }, [token]);
  const load = useCallback(async () => {
    if (!token) return;
    try { const [catalog, meta, tags, playlists, metrics] = await Promise.all([api("/api/admin/catalog"), api("/api/admin/config"), api("/api/admin/tags"), api("/api/admin/playlists"), api("/api/admin/stats")]); setSongs((catalog.songs ?? []) as Song[]); setData({ settings: (meta.settings ?? []) as Setting[], events: (meta.events ?? []) as AdminEvent[], announcements: (meta.announcements ?? []) as AdminAnnouncement[], rules: (meta.rules ?? []) as AdminRule[], tags: (tags.tags ?? []) as AdminTag[], playlists: (playlists.playlists ?? []) as AdminPlaylist[] }); setStats(metrics as AdminStats); setMessage(""); }
    catch (error) { setMessage((error as Error).message); }
  }, [api, token]);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);
  const config = useMemo<Record<string, unknown>>(() => Object.fromEntries((data?.settings ?? []).map((x) => [x.clave, x.valor])), [data]);
  const coordinates = config["coordenadas"] as { lat?: number; lon?: number } | undefined;
  const schedulePaused = config["programacion_pausada"] === true;
  async function login(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    const { error } = await supabaseBrowser().auth.signInWithPassword({ email, password });
    setMessage(error ? "No se pudo iniciar sesión. Revisa tus datos y el acceso al proyecto." : "Sesión iniciada."); setBusy(false);
  }
  async function addSong(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage(""); const form = new FormData(event.currentTarget);
    try {
      const etiquetas = String(form.get("etiquetas") || "").split(",").map((entry) => entry.trim()).filter(Boolean).map((entry) => { const [categoria, ...parts] = entry.split(":"); return { categoria, nombre: parts.join(":").trim() }; });
      await api("/api/admin/catalog", { method: "POST", body: JSON.stringify({ titulo: form.get("titulo"), artista: form.get("artista"), proveedor: form.get("proveedor") || undefined, id_proveedor: form.get("id_proveedor") || undefined, url_proveedor: form.get("url_proveedor") || undefined, notas_derechos: form.get("notas_derechos"), autorizacion_verificada: form.get("autorizacion_verificada") === "on", autorizada: form.get("autorizada") === "on", explicita: form.get("explicita") === "on", prioridad: Number(form.get("prioridad") || 0), etiquetas }) });
      event.currentTarget.reset(); setMessage("Canción añadida al catálogo."); await load();
    } catch (error) { setMessage((error as Error).message); } finally { setBusy(false); }
  }
  async function newRound() {
    setBusy(true); setMessage("");
    try { const result = await api("/api/admin/rounds", { method: "POST", body: "{}" }); setMessage(`Ronda abierta. Termina a las ${new Date(result.closesAt).toLocaleTimeString("es-MX")}.`); }
    catch (error) { setMessage((error as Error).message); } finally { setBusy(false); }
  }
  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); const form = new FormData(event.currentTarget);
    try { await api("/api/admin/config", { method: "PATCH", body: JSON.stringify({ ciudad: form.get("ciudad"), latitud: Number(form.get("latitud")), longitud: Number(form.get("longitud")), duracion_ronda_segundos: Number(form.get("duracion")), regla_desempate: form.get("desempate"), limite_votos_ip_minuto: Number(form.get("limite")), ventana_repeticion: Number(form.get("repeticion")) }) }); setMessage("Configuración guardada de forma persistente."); await load(); }
    catch (error) { setMessage((error as Error).message); } finally { setBusy(false); }
  }
  async function toggleSchedule() {
    try { await api("/api/admin/config", { method: "PATCH", body: JSON.stringify({ programacion_pausada: !schedulePaused }) }); setMessage(schedulePaused ? "Programación reanudada." : "Programación pausada."); await load(); }
    catch (error) { setMessage((error as Error).message); }
  }
  async function createMetadata(event: FormEvent<HTMLFormElement>, type: "evento" | "anuncio" | "regla") {
    event.preventDefault(); setBusy(true); const form = new FormData(event.currentTarget);
    const starts = String(form.get("inicia_en") || ""); const ends = String(form.get("termina_en") || "");
    const payload = type === "evento" ? { tipo: type, nombre: form.get("nombre"), descripcion: form.get("descripcion"), inicia_en: new Date(starts).toISOString(), termina_en: new Date(ends).toISOString(), prioridad: Number(form.get("prioridad") || 50), etiquetas_requeridas: [] }
      : type === "anuncio" ? { tipo: type, titulo: form.get("titulo"), texto: form.get("texto"), inicia_en: new Date(starts).toISOString(), termina_en: new Date(ends).toISOString(), frecuencia_minutos: Number(form.get("frecuencia") || 60) }
      : { tipo: type, nombre: form.get("nombre"), prioridad: Number(form.get("prioridad") || 20), condicion: { evento: form.get("evento") || undefined, hora_inicio: form.get("hora_inicio") ? Number(form.get("hora_inicio")) : undefined, hora_fin: form.get("hora_fin") ? Number(form.get("hora_fin")) : undefined, temp_min: form.get("temp_min") ? Number(form.get("temp_min")) : undefined, temp_max: form.get("temp_max") ? Number(form.get("temp_max")) : undefined }, preferencias: { energia: form.get("energia") || "moderada" } };
    try { await api("/api/admin/metadata", { method: "POST", body: JSON.stringify(payload) }); setMessage(type === "anuncio" ? "Anuncio programado; falta revisarlo y aprobarlo para su locución." : "Registro guardado."); event.currentTarget.reset(); await load(); }
    catch (error) { setMessage((error as Error).message); } finally { setBusy(false); }
  }
  async function changeSong(song: Song) {
    try { await api("/api/admin/catalog", { method: "PATCH", body: JSON.stringify({ id: song.id, changes: { autorizada: !song.autorizada, autorizacion_verificada: !song.autorizada, activa: true } }) }); setMessage(song.autorizada ? "Canción desautorizada." : "Canción autorizada y activa."); await load(); }
    catch (error) { setMessage((error as Error).message); }
  }
  async function updateAnnouncement(id: string, estado: string) {
    try { await api("/api/admin/metadata", { method: "PATCH", body: JSON.stringify({ tipo: "anuncio", id, changes: { estado } }) }); setMessage(`Anuncio ${estado}.`); await load(); }
    catch (error) { setMessage((error as Error).message); }
  }
  async function forceSong(id: string) {
    try { await api("/api/admin/queue", { method: "POST", body: JSON.stringify({ accion: "forzar_cancion", cancion_id: id }) }); setMessage("Canción añadida a la cola como solicitud manual."); await load(); }
    catch (error) { setMessage((error as Error).message); }
  }
  async function skipQueue(id: string) {
    try { await api("/api/admin/queue", { method: "POST", body: JSON.stringify({ accion: "saltar", queue_id: id }) }); setMessage("Elemento omitido de la cola."); await load(); }
    catch (error) { setMessage((error as Error).message); }
  }
  async function addTag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); const form = new FormData(event.currentTarget);
    try { await api("/api/admin/tags", { method: "POST", body: JSON.stringify({ categoria: form.get("categoria"), nombre: form.get("nombre") }) }); event.currentTarget.reset(); setMessage("Etiqueta guardada."); await load(); }
    catch (error) { setMessage((error as Error).message); } finally { setBusy(false); }
  }
  async function deleteTag(id: string) {
    try { await api(`/api/admin/tags?id=${id}`, { method: "DELETE" }); setMessage("Etiqueta eliminada."); await load(); }
    catch (error) { setMessage((error as Error).message); }
  }
  async function addPlaylist(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); const form = new FormData(event.currentTarget); const element = event.currentTarget.elements.namedItem("canciones") as HTMLSelectElement;
    try { await api("/api/admin/playlists", { method: "POST", body: JSON.stringify({ nombre: form.get("nombre"), descripcion: form.get("descripcion"), autorizada: form.get("autorizada") === "on", canciones: Array.from(element.selectedOptions).map((option) => option.value) }) }); event.currentTarget.reset(); setMessage("Lista creada."); await load(); }
    catch (error) { setMessage((error as Error).message); } finally { setBusy(false); }
  }
  function previewSpeech(button: HTMLButtonElement) {
    const text = (button.form?.elements.namedItem("texto") as HTMLTextAreaElement | null)?.value.trim();
    if (!text || !("speechSynthesis" in window)) { setMessage("La vista previa TTS no está disponible en este navegador o falta texto."); return; }
    window.speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(text); utterance.lang = "es-MX"; window.speechSynthesis.speak(utterance); setMessage("Reproduciendo vista previa con la voz del navegador.");
  }
  async function exportBackup() {
    try { const response = await fetch("/api/admin/backup", { headers: { Authorization: `Bearer ${token}` } }); if (!response.ok) throw new Error("No se pudo exportar el respaldo."); const blob = await response.blob(); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "radio-campus-respaldo.json"; link.click(); URL.revokeObjectURL(url); setMessage("Respaldo descargado."); }
    catch (error) { setMessage((error as Error).message); }
  }
  async function importBackup(input: HTMLInputElement) {
    const file = input.files?.[0]; if (!file) return;
    try { const backup = JSON.parse(await file.text()); await api("/api/admin/backup", { method: "POST", body: JSON.stringify(backup) }); setMessage("Respaldo de configuración restaurado."); await load(); }
    catch (error) { setMessage((error as Error).message || "El archivo JSON no es válido."); }
    finally { input.value = ""; }
  }

  if (!session) return <main className="wrap"><header className="topbar"><Link className="brand" href="/">RADIO <b>CAMPUS</b></Link><nav className="nav"><Link href="/">Pantalla pública</Link></nav></header><section className="panel"><div className="eyebrow">Acceso protegido</div><h1>Administración</h1><p className="muted">Inicia sesión con una cuenta activa en Supabase Auth y un perfil autorizado en perfiles_admin.</p><form className="card form" onSubmit={(e) => void login(e)}><input type="email" placeholder="Correo institucional" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required/><input type="password" placeholder="Contraseña" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required/><button className="btn" disabled={busy}>Iniciar sesión</button>{message && <div className="msg">{message}</div>}</form></section></main>;

  const tabs = [["catalogo","Catálogo"],["listas","Listas y etiquetas"],["contexto","Contexto"],["eventos","Eventos"],["anuncios","Anuncios"],["supervision","Supervisión"]];
  return <main className="wrap"><header className="topbar"><Link className="brand" href="/">RADIO <b>CAMPUS</b></Link><nav className="nav"><Link href="/">Pantalla pública</Link><button className="btn secondary" onClick={() => void supabaseBrowser().auth.signOut()}>Cerrar sesión</button></nav></header>
    <section className="hero"><div><div className="eyebrow">Consola de operación</div><h1>Administración</h1><p>Programación: {schedulePaused ? "pausada" : "activa"}</p></div><div style={{display:"flex",gap:10,flexWrap:"wrap"}}><button className="btn secondary" onClick={() => void toggleSchedule()}>{schedulePaused ? "Reanudar" : "Pausar programación"}</button><button className="btn" onClick={() => void newRound()} disabled={busy || schedulePaused}>Abrir ronda</button></div></section>
    <div className="nav" style={{marginBottom:18}}>{tabs.map(([id,label]) => <button key={id} className={`btn ${section === id ? "" : "secondary"}`} onClick={() => setSection(id)}>{label}</button>)}</div>
    {message && <p className="msg">{message}</p>}
    {section === "catalogo" && <div className="admin-grid"><section className="card"><div className="section-title"><h2>Agregar canción</h2><span className="pill">CATÁLOGO</span></div><p className="msg">Solo se ofrecen canciones con autorización verificada. Adjunta la evidencia o referencia interna de derechos y el identificador de un proveedor admitido.</p><form className="form" onSubmit={(e) => void addSong(e)}><input name="titulo" placeholder="Título" required/><input name="artista" placeholder="Artista" required/><select name="proveedor" defaultValue=""><option value="">Proveedor (sin configurar)</option><option value="youtube-iframe">YouTube IFrame (player visible)</option><option value="radio-licenciada">Proveedor/licencia institucional</option></select><input name="id_proveedor" placeholder="ID de canción / video (opcional)"/><input name="url_proveedor" placeholder="Enlace del proveedor (opcional)"/><input name="etiquetas" placeholder="Etiquetas: genero:indie, energia:moderada"/><textarea name="notas_derechos" placeholder="Referencia de autorización o licencia institucional" rows={3}/><label className="check"><input type="checkbox" name="autorizacion_verificada"/> Confirmo que comprobé la autorización de reproducción pública de esta grabación.</label><label className="check"><input type="checkbox" name="autorizada"/> Habilitar en selección (requiere la confirmación anterior).</label><label className="check"><input type="checkbox" name="explicita"/> Contenido explícito: excluir de la radio.</label><input name="prioridad" type="number" placeholder="Prioridad contextual" defaultValue="0"/><button className="btn" disabled={busy}>Guardar canción</button></form></section>
      <section className="card"><div className="section-title"><h2>Canciones</h2><span className="pill">{songs.length} REGISTROS</span></div>{songs.length ? songs.map((song) => <div className="song-row" key={song.id}><div><strong>{song.titulo}</strong><small>{song.artista} · {song.autorizada && song.autorizacion_verificada ? "Autorizada" : "No autorizada"}</small></div><div style={{display:"flex",gap:6}}>{song.autorizada && <button className="btn secondary" onClick={() => void forceSong(song.id)}>Encolar</button>}<button className={`btn ${song.autorizada ? "danger" : "secondary"}`} onClick={() => void changeSong(song)}>{song.autorizada ? "Deshabilitar" : "Habilitar"}</button></div></div>) : <p className="msg">El catálogo está vacío. Agrega únicamente música con fuente y derechos revisados.</p>}<button className="btn secondary" style={{marginTop:16}} onClick={() => void load()}>Actualizar datos</button></section></div>}
    {section === "listas" && <div className="admin-grid"><section className="card"><h2>Listas de reproducción</h2><form className="form" onSubmit={(e) => void addPlaylist(e)}><input name="nombre" placeholder="Nombre de lista" required/><textarea name="descripcion" placeholder="Descripción"/><label className="check"><input type="checkbox" name="autorizada"/> Lista autorizada para programación</label><label className="muted">Canciones de la lista (Ctrl/⌘ para varias)</label><select name="canciones" multiple size={7}>{songs.map((song) => <option value={song.id} key={song.id}>{song.titulo} — {song.artista}</option>)}</select><button className="btn">Crear lista</button></form>{(data?.playlists ?? []).map((playlist) => <div className="song-row" key={playlist.id}><div><strong>{playlist.nombre}</strong><small>{playlist.lista_canciones?.length ?? 0} canciones · {playlist.autorizada ? "Autorizada" : "No autorizada"}</small></div><button className="btn danger" onClick={async () => { try { await api(`/api/admin/playlists?id=${playlist.id}`, { method: "DELETE" }); await load(); } catch (error) { setMessage((error as Error).message); } }}>Eliminar</button></div>)}</section><section className="card"><h2>Etiquetas</h2><p className="msg">Categorías disponibles: género, energía, ambiente, temática y restricción. Asigna una etiqueta al crear canción con formato <code>energia:moderada</code>.</p><form className="form" onSubmit={(e) => void addTag(e)}><select name="categoria"><option value="genero">Género</option><option value="energia">Energía</option><option value="ambiente">Ambiente</option><option value="tematica">Temática</option><option value="restriccion">Restricción</option></select><input name="nombre" placeholder="Nombre de etiqueta" required/><button className="btn">Crear etiqueta</button></form>{(data?.tags ?? []).map((tag) => <div className="song-row" key={tag.id}><div><strong>{tag.nombre}</strong><small>{tag.categoria} · {tag.cancion_etiquetas?.length ?? 0} canciones asociadas</small></div><button className="btn danger" onClick={() => void deleteTag(tag.id)}>Eliminar</button></div>)}</section></div>}
    {section === "contexto" && <div className="admin-grid"><section className="card wide"><h2>Reglas contextuales activas</h2>{(data?.rules ?? []).map((rule) => <div className="song-row" key={rule.id}><div><strong>{rule.nombre}</strong><small>Prioridad {rule.prioridad} · {JSON.stringify(rule.preferencias)}</small></div><span className="pill">{rule.activa ? "ACTIVA" : "PAUSADA"}</span></div>)}</section><section className="card"><h2>Crear regla</h2><p className="msg">La prioridad más alta gana. Horas en formato 0–23; temperatura en °C.</p><form className="form" onSubmit={(e) => void createMetadata(e,"regla")}><input name="nombre" placeholder="Nombre: clima fresco, bienvenida…" required/><input name="prioridad" type="number" placeholder="Prioridad" defaultValue="30"/><input name="evento" placeholder="Nombre exacto del evento (opcional)"/><div className="admin-grid"><input name="hora_inicio" type="number" min="0" max="23" placeholder="Hora desde"/><input name="hora_fin" type="number" min="1" max="24" placeholder="Hora hasta"/><input name="temp_min" type="number" step="any" placeholder="Temp. mín."/><input name="temp_max" type="number" step="any" placeholder="Temp. máx."/></div><select name="energia"><option value="moderada">Energía moderada</option><option value="baja">Energía baja</option><option value="dinamica">Energía dinámica</option></select><button className="btn">Guardar regla</button></form></section><section className="card"><h2>Parámetros generales</h2><form className="form" onSubmit={(e) => void saveSettings(e)}><input name="ciudad" defaultValue={String(config["ciudad"] ?? "Ciudad de México")} placeholder="Ciudad" required/><div className="admin-grid"><input name="latitud" type="number" step="any" defaultValue={Number(coordinates?.lat ?? 19.4326)} placeholder="Latitud"/><input name="longitud" type="number" step="any" defaultValue={Number(coordinates?.lon ?? -99.1332)} placeholder="Longitud"/></div><input name="duracion" type="number" min="30" max="3600" defaultValue={Number(config["duracion_ronda_segundos"] ?? 240)} placeholder="Duración de ronda en segundos"/><select name="desempate" defaultValue={String(config["regla_desempate"] ?? "prioridad")}><option value="prioridad">Mayor prioridad contextual</option><option value="primera_opcion">Primera opción</option><option value="aleatorio">Aleatorio</option></select><input name="limite" type="number" min="1" max="100" defaultValue={Number(config["limite_votos_ip_minuto"] ?? 10)} placeholder="Votos por IP por minuto"/><input name="repeticion" type="number" min="0" max="100" defaultValue={Number(config["ventana_repeticion"] ?? 12)} placeholder="Ventana de no repetición"/><button className="btn">Guardar configuración</button></form></section><section className="card"><h2>Respaldo de configuración</h2><p className="msg">Exporta e importa parámetros, reglas y eventos en JSON.</p><button className="btn" onClick={() => void exportBackup()}>Exportar JSON</button><label className="btn secondary" style={{display:"block",marginTop:12}}>Importar JSON<input type="file" accept="application/json" style={{display:"none"}} onChange={(e) => void importBackup(e.currentTarget)}/></label></section></div>}
    {section === "eventos" && <div className="admin-grid"><section className="card"><h2>Registrar evento</h2><p className="msg">El nombre del evento puede emplearse en la regla correspondiente para seleccionar etiquetas temáticas.</p><form className="form" onSubmit={(e) => void createMetadata(e,"evento")}><input name="nombre" placeholder="Exámenes de otoño, bienvenida…" required/><textarea name="descripcion" placeholder="Información institucional"/><input name="inicia_en" type="datetime-local" required/><input name="termina_en" type="datetime-local" required/><input name="prioridad" type="number" defaultValue="50" placeholder="Prioridad"/><button className="btn">Guardar evento</button></form></section><section className="card"><h2>Calendario del campus</h2>{(data?.events ?? []).map((item) => <div className="song-row" key={item.id}><div><strong>{item.nombre}</strong><small>{new Date(item.inicia_en).toLocaleString("es-MX")} – {new Date(item.termina_en).toLocaleString("es-MX")}</small></div><span className="pill">{item.activo ? "ACTIVO" : "INACTIVO"}</span></div>)}</section></div>}
    {section === "anuncios" && <div className="admin-grid"><section className="card"><h2>Programar locución</h2><p className="msg">El texto se guarda para revisión. La locución y su reproducción entre canciones están pendientes de configurar un motor TTS y proveedor musical autorizado.</p><form className="form" onSubmit={(e) => void createMetadata(e,"anuncio")}><input name="titulo" placeholder="Título interno" required/><textarea name="texto" placeholder="Texto autorizado para locución" rows={5} required/><button type="button" className="btn secondary" onClick={(e) => previewSpeech(e.currentTarget)}>Escuchar vista previa del navegador</button><input name="inicia_en" type="datetime-local" required/><input name="termina_en" type="datetime-local" required/><input name="frecuencia" type="number" min="5" defaultValue="60" placeholder="Frecuencia en minutos"/><button className="btn">Guardar para revisión</button></form></section><section className="card"><h2>Revisión de anuncios</h2>{(data?.announcements ?? []).map((item) => <div className="song-row" key={item.id}><div><strong>{item.titulo}</strong><small>{item.estado} · vigente hasta {item.termina_en ? new Date(item.termina_en).toLocaleString("es-MX") : "sin fecha"}</small><p className="msg">{item.texto}</p></div>{item.estado !== "aprobado" && <button className="btn secondary" onClick={() => void updateAnnouncement(item.id,"aprobado")}>Aprobar</button>}</div>)}</section></div>}
    {section === "supervision" && <div className="admin-grid"><section className="card wide"><div className="section-title"><h2>Participación</h2><button className="btn secondary" onClick={() => void load()}>Actualizar</button></div><div className="admin-grid"><div className="banner">Canciones: <b>{stats?.totals.canciones ?? 0}</b> · autorizadas: <b>{stats?.totals.cancionesAutorizadas ?? 0}</b></div><div className="banner">Rondas consultadas: <b>{stats?.totals.rondas ?? 0}</b> · votos registrados: <b>{stats?.totals.votos ?? 0}</b></div></div><h3 style={{marginTop:22}}>Rondas recientes</h3>{stats?.rounds.map((round) => <div className="song-row" key={round.id}><div><strong>{round.estado.toUpperCase()} · {round.totalVotos} votos</strong><small>{new Date(round.creada_en).toLocaleString("es-MX")} · {round.resultado.sin_votos ? "sin votos" : round.resultado.empate ? "empate" : "resultado registrado"}</small></div><span className="pill">{round.id.slice(0,8)}</span></div>)}</section><section className="card"><h2>Cola de reproducción</h2><p className="msg">La cola se administra en el servidor. No comenzará audio hasta que se configure un proveedor.</p>{stats?.queue.map((item) => <div className="song-row" key={item.id}><div><strong>{item.canciones?.titulo ?? item.tipo}</strong><small>{item.canciones?.artista ?? ""} · {item.estado}</small></div>{item.estado === "pendiente" && <button className="btn danger" onClick={() => void skipQueue(item.id)}>Omitir</button>}</div>)}</section><section className="card"><h2>Historial</h2>{stats?.history.slice(0,15).map((item) => <div className="song-row" key={item.id}><div><strong>{item.canciones?.titulo ?? item.anuncios?.titulo ?? item.tipo}</strong><small>{item.tipo} · {new Date(item.ocurrido_en).toLocaleString("es-MX")}</small></div></div>)}</section></div>}
    <footer className="footer"><span>Sesión: {session.user.email}</span><span>Los cambios quedan registrados en la base de datos.</span></footer>
  </main>;
}
