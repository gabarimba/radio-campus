"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { deviceToken } from "@/lib/device-token";

type Choice = { id: string; titulo: string; artista: string; position: number; votes: number };
type RadioState = { round: { id: string; status: string; closesAt: string | null; choices: Choice[] } | null };

export default function VotingPage() {
  const [state, setState] = useState<RadioState | null>(null);
  const [roundId, setRoundId] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { const timer = setTimeout(() => { const params = new URLSearchParams(location.search); setRoundId(params.get("r") ?? ""); }, 0); return () => clearTimeout(timer); }, []);
  useEffect(() => { let alive = true; const load = async () => { try { const response = await fetch("/api/public/state", { cache: "no-store" }); const result = await response.json(); if (alive) setState(result); } catch { if (alive) setMessage("Sin conexión. Volveremos a intentar automáticamente."); } }; void load(); const timer = setInterval(load, 5000); return () => { alive = false; clearInterval(timer); }; }, []);
  const round = state?.round;
  const selectedRound = roundId || round?.id || "";
  const open = round?.status === "abierta" && selectedRound === round.id;
  async function vote(songId: string) {
    if (!selectedRound) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/votes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ roundId: selectedRound, songId, deviceToken: deviceToken() }) });
      const body = await response.json(); setMessage(response.ok ? body.message : body.error);
    } catch { setMessage("No se pudo conectar. Intenta otra vez."); }
    finally { setBusy(false); }
  }
  return <main className="wrap"><header className="topbar"><Link className="brand" href="/">RADIO <b>CAMPUS</b></Link><nav className="nav"><Link href="/">Pantalla en vivo</Link><Link href="/admin">Administración</Link></nav></header>
    <section className="panel"><div className="eyebrow">Votación móvil</div><h1>¿Qué ponemos después?</h1><p className="muted">Elige una canción. Se acepta un voto por dispositivo durante cada ronda.</p>
      {!open && <div className="banner">{roundId ? "Este QR corresponde a una ronda que ya cerró o dejó de estar activa." : "No hay una votación abierta en este momento."}</div>}
      {open && <div className="card"><div className="eyebrow">Ronda abierta</div>{round.choices.map((choice) => <button className="choice-button" key={choice.id} onClick={() => void vote(choice.id)} disabled={busy}><strong>{choice.titulo}</strong><span>{choice.artista}</span></button>)}{message && <p className={`msg ${message.includes("registrado") ? "ok" : "error"}`}>{message}</p>}</div>}
      <p className="msg" style={{marginTop:18}}>No solicitamos nombre ni cuenta para votar. Se guarda un token anónimo del navegador y una señal de red protegida para reducir abuso.</p>
    </section></main>;
}
