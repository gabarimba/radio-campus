"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import Image from "next/image";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase-browser";

type RoundState = { id: string; status: string; closesAt: string | null; winnerId: string | null; result: { votos_total?: number; empate?: boolean; sin_votos?: boolean }; choices: { id: string; titulo: string; artista: string; position: number; votes: number }[] };
type State = { serverTime: string; round: RoundState | null; playback: { state: string; message: string } };

export default function PublicScreen() {
  const [state, setState] = useState<State | null>(null);
  const [qr, setQr] = useState("");
  const [left, setLeft] = useState(0);

  async function refresh() {
    try { const response = await fetch("/api/public/state", { cache: "no-store" }); if (response.ok) setState(await response.json()); }
    catch { /* La próxima consulta recupera conexión. */ }
  }
  useEffect(() => {
    const initial = setTimeout(() => void refresh(), 0); const id = setInterval(refresh, 8000);
    let channel: ReturnType<ReturnType<typeof supabaseBrowser>["channel"]> | undefined;
    try { channel = supabaseBrowser().channel("radio-publica").on("broadcast", { event: "estado_actualizado" }, () => void refresh()).subscribe(); } catch { /* La consulta periódica queda como respaldo. */ }
    return () => { clearTimeout(initial); clearInterval(id); if (channel) void supabaseBrowser().removeChannel(channel); };
  }, []);
  useEffect(() => {
    if (state?.round?.status === "abierta" && state.round.id && typeof window !== "undefined") {
      void QRCode.toDataURL(`${window.location.origin}/votar?r=${state.round.id}`, { width: 220, margin: 1 }).then(setQr).catch(() => setQr(""));
    }
  }, [state?.round?.id, state?.round?.status]);
  useEffect(() => {
    const tick = () => setLeft(state?.round?.status === "abierta" && state.round.closesAt ? Math.max(0, Math.ceil((new Date(state.round.closesAt).getTime() - Date.now()) / 1000)) : 0);
    tick(); const id = setInterval(tick, 500); return () => clearInterval(id);
  }, [state?.round?.closesAt, state?.round?.status]);

  const round = state?.round;
  const current = round?.status === "cerrada" ? round.choices.find((c) => c.id === round.winnerId) : null;
  return <main className="public-screen">
    <div className="wrap">
      <header className="topbar"><Link className="brand" href="/">RADIO <b>CAMPUS</b></Link><nav className="nav"><Link href="/">En vivo</Link><Link href="/votar">Votar</Link><Link href="/admin">Administración</Link></nav></header>
      <section className="hero"><div><div className="eyebrow">Frecuencia universitaria · Ciudad de México</div><h1>La comunidad elige<br/>lo que suena.</h1></div><p>Vota desde tu celular por la siguiente canción. Las opciones se ajustan al contexto del campus y a la programación autorizada.</p></section>
      <section className="grid">
        <article className="card current"><div><div className="status"><span className={`dot ${state ? "off" : "off"}`}></span>REPRODUCCIÓN DETENIDA · FUENTE NO CONFIGURADA</div>
          <h2 className="track-title">{current ? current.titulo : "La radio está en preparación"}</h2><div className="meta">{current ? current.artista : "La música iniciará cuando exista un proveedor autorizado."}</div></div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"end",gap:12}}><span className="badge">{round?.status === "abierta" ? "Votación abierta" : round?.status === "cerrada" ? "Último resultado" : "En espera de programación"}</span>{round?.status === "abierta" && <div><div className="eyebrow">Cierra en</div><div className="timer">{String(Math.floor(left/60)).padStart(2,"0")}:{String(left%60).padStart(2,"0")}</div></div>}</div>
        </article>
        <article className="card"><div className="section-title"><h2>{round?.status === "cerrada" ? "Resultado de la ronda" : "Vota por la siguiente"}</h2><span className="pill">{round?.status === "abierta" ? "EN VIVO" : "CAMPUS"}</span></div>
          {round?.choices?.length ? <div className="candidate-list">{round.choices.map((choice) => <div className="candidate" key={choice.id}><div><strong>{choice.titulo}</strong><small>{choice.artista}</small></div><span className="vote-count">{round.status === "abierta" ? `${choice.votes} votos` : `${choice.votes} votos`}</span></div>)}</div> : <p className="msg">Las dos opciones aparecerán aquí cuando un administrador inicie una ronda con canciones autorizadas.</p>}
          {round?.status === "cerrada" && <div className="banner">{round.result.sin_votos ? "No hubo votos; se aplicó la regla configurada." : round.result.empate ? "Hubo empate; se aplicó la regla de desempate." : "Ganadora de la votación."}</div>}
          {round?.status === "abierta" && <div className="qr-card"><div className="qr-box">{qr && <Image src={qr} alt="Código QR para abrir la votación" width={90} height={90} unoptimized/>}</div><p>Escanea el QR con la cámara del celular y elige una canción. La ronda cierra en el servidor.</p></div>}
        </article>
      </section>
      <div className="banner"><b>Estado de reproducción:</b> {state?.playback.message ?? "Conectando con el servidor…"}</div>
      <footer className="footer"><span>Radio Campus · Sistema universitario participativo</span><span>Conexión: {state ? "consultando programación" : "reconectando"} · El cierre de ronda lo decide el servidor</span></footer>
    </div>
  </main>;
}
