import React, { useEffect, useMemo, useState } from "react";

function fmt(n) {
  if (!isFinite(n)) return "0";
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function solveRate({ pv, pmt, fv, n }) {
  const f = (r) => {
    if (Math.abs(r) < 1e-10) return pv + pmt * n - fv;
    const g = Math.pow(1 + r, n - 1);
    const first = pmt * g;
    const rest = pmt * ((g - 1) / r) * (1 + r);
    return pv * Math.pow(1 + r, n) + first + rest - fv;
  };
  let lo = -0.99, hi = 5;
  let flo = f(lo), fhi = f(hi);
  if (flo * fhi > 0) return 0;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const fm = f(mid);
    if (Math.abs(fm) < 1e-10) return mid;
    if (flo * fm <= 0) hi = mid; else lo = mid;
  }
  return (lo + hi) / 2;
}

const emptyProject = () => ({
  name: "Nuevo proyecto",
  meta: 100000,
  balanceInicial: 0,
  aporteFijo: 2000,
  cuotas: 24,
  periodo: "quincenal",
  personas: 2,
  checks: {},
});

export default function App() {
  const [projects, setProjects] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [draft, setDraft] = useState(emptyProject());
  const [view, setView] = useState("home");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("reama_xo_projects");
      if (raw) setProjects(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem("reama_xo_projects", JSON.stringify(projects));
  }, [projects]);

  const interes = useMemo(() => solveRate({
    pv: Number(draft.balanceInicial)||0,
    pmt: Number(draft.aporteFijo)||0,
    fv: Number(draft.meta)||0,
    n: Math.max(1, Number(draft.cuotas)||1),
  }), [draft]);

  const rows = useMemo(() => {
    let saldo = Number(draft.balanceInicial)||0;
    const list = [];
    for (let i=1;i<=draft.cuotas;i++){
      const aporte = Number(draft.aporteFijo)||0;
      const base = saldo + aporte;
      const ganancia = i===1 ? 0 : base*interes;
      const saldoFinal = base + ganancia;
      list.push({
        i, aporte, ganancia,
        aportePersona: draft.personas>0 ? aporte/draft.personas : 0,
        extraPersona: draft.personas>0 ? ganancia/draft.personas : 0,
        saldoFinal
      });
      saldo = saldoFinal;
    }
    return list;
  }, [draft, interes]);

  const saldoFinal = rows.length ? rows[rows.length-1].saldoFinal : draft.balanceInicial;
  const progreso = draft.meta>0 ? Math.min(100, (saldoFinal/draft.meta)*100) : 0;

  const createProject = () => {
    const id = crypto.randomUUID();
    setProjects(prev => [{id, ...draft}, ...prev]);
    setView("home");
  };

  const openProject = (p) => {
    setActiveId(p.id);
    setDraft({...p});
    setView("editor");
  };

  const saveEdits = () => {
    setProjects(prev => prev.map(p => p.id===activeId ? {...draft, id:p.id} : p));
    setView("home");
  };

  const toggleCheck = (i) => {
    setDraft(d => ({...d, checks:{...d.checks, [i]: !d.checks?.[i]}}));
  };

  if (view === "home") {
    return (
      <div style={{maxWidth:900, margin:"20px auto", fontFamily:"system-ui"}}>
        <h1>Reama XO</h1>
        <p style={{color:"#555"}}>Ahorra inteligente. Crece en equipo.</p>
        <button onClick={()=>{setDraft(emptyProject()); setActiveId(null); setView("editor");}}>
          + Nuevo proyecto
        </button>
        <hr style={{margin:"20px 0"}}/>
        {projects.length===0 ? <p>No hay proyectos aún.</p> :
          projects.map(p => (
            <div key={p.id} style={{border:"1px solid #ddd", borderRadius:10, padding:12, marginBottom:10}}>
              <b>{p.name}</b>
              <div style={{fontSize:12, color:"#666"}}>Meta: {fmt(p.meta)} · {p.cuotas} cuotas</div>
              <div style={{marginTop:8}}>
                <button onClick={()=>openProject(p)}>Abrir</button>
                <button onClick={()=>setProjects(prev=>prev.filter(x=>x.id!==p.id))} style={{marginLeft:8}}>Eliminar</button>
              </div>
            </div>
          ))
        }
      </div>
    );
  }

  return (
    <div style={{maxWidth:1000, margin:"20px auto", fontFamily:"system-ui"}}>
      <h2>Reama XO — Editor</h2>

      <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:10}}>
        <label>Nombre
          <input value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/>
        </label>
        <label>Meta
          <input type="number" value={draft.meta} onChange={e=>setDraft({...draft,meta:Number(e.target.value)})}/>
        </label>
        <label>Balance inicial
          <input type="number" value={draft.balanceInicial} onChange={e=>setDraft({...draft,balanceInicial:Number(e.target.value)})}/>
        </label>
        <label>Aporte fijo
          <input type="number" value={draft.aporteFijo} onChange={e=>setDraft({...draft,aporteFijo:Number(e.target.value)})}/>
        </label>
        <label>Cuotas
          <input type="number" value={draft.cuotas} onChange={e=>setDraft({...draft,cuotas:Number(e.target.value)})}/>
        </label>
        <label>Personas
          <input type="number" value={draft.personas} onChange={e=>setDraft({...draft,personas:Number(e.target.value)})}/>
        </label>
      </div>

      <p><b>% interés necesario:</b> {(interes*100).toFixed(4)}%</p>
      <p><b>Aporte por persona:</b> {fmt(draft.personas>0?draft.aporteFijo/draft.personas:0)} | <b>Saldo proyectado:</b> {fmt(saldoFinal)} | <b>Progreso:</b> {fmt(progreso)}%</p>

      <div style={{margin:"10px 0"}}>
        {activeId ? <button onClick={saveEdits}>Guardar cambios</button> : <button onClick={createProject}>Crear proyecto</button>}
        <button onClick={()=>setView("home")} style={{marginLeft:8}}>Volver</button>
      </div>

      <div style={{overflow:"auto"}}>
      <table style={{width:"100%", borderCollapse:"collapse"}}>
        <thead>
          <tr>
            <th>✔</th><th>Cuota</th><th>Aporte</th><th>Extra interés</th><th>Por persona</th><th>Extra por persona</th><th>Saldo</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r=>(
            <tr key={r.i}>
              <td><input type="checkbox" checked={!!draft.checks?.[r.i]} onChange={()=>toggleCheck(r.i)} /></td>
              <td>{r.i}</td>
              <td>{fmt(r.aporte)}</td>
              <td>{fmt(r.ganancia)}</td>
              <td>{fmt(r.aportePersona)}</td>
              <td>{fmt(r.extraPersona)}</td>
              <td><b>{fmt(r.saldoFinal)}</b></td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}