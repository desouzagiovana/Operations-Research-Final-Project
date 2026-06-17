import { useState, useCallback, useEffect, useRef } from "react";

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const BIG_M = 1e7;
const TOL = 1e-9;

// ─── SERVICE: FormaAumentada ──────────────────────────────────────────────────
function buildAugmented(problema) {
  const { tipo, variaveis, restricoes, z } = problema;
  let nVars = variaveis;
  const slackInfo = [];

  for (const r of restricoes) {
    if (r.sinal === "<=") { nVars++; slackInfo.push({ type: "slack" }); }
    else if (r.sinal === ">=") { nVars += 2; slackInfo.push({ type: "surplus" }, { type: "artificial" }); }
    else { nVars++; slackInfo.push({ type: "artificial" }); }
  }

  const isMax = tipo.toLowerCase() === "max";
  const zRow = { coefs: new Array(nVars).fill(0), rhs: 0, basicVar: -1 };

  const zCoefs = typeof z.coeficientes === "object" && !Array.isArray(z.coeficientes)
    ? Object.values(z.coeficientes) : (z.coeficientes || []);

  zCoefs.forEach((c, i) => { if (i < variaveis) zRow.coefs[i] = isMax ? -parseFloat(c) : parseFloat(c); });

  // BigM penalties for artificials
  let col = variaveis;
  for (const info of slackInfo) {
    if (info.type === "artificial") zRow.coefs[col] = BIG_M;
    col++;
  }

  const rows = [zRow];
  col = variaveis;

  for (let i = 0; i < restricoes.length; i++) {
    const r = restricoes[i];
    const row = { coefs: new Array(nVars).fill(0), rhs: parseFloat(r.rhs ?? r.termo ?? 0), basicVar: -1, sinal: r.sinal };

    const coefs = typeof r.coeficientes === "object" && !Array.isArray(r.coeficientes)
      ? Object.values(r.coeficientes) : (r.coeficientes || []);
    coefs.forEach((c, j) => { if (j < variaveis) row.coefs[j] = parseFloat(c); });

    if (r.sinal === "<=") {
      row.coefs[col] = 1; row.basicVar = col; col++;
    } else if (r.sinal === ">=") {
      row.coefs[col] = -1; col++;
      row.coefs[col] = 1; row.basicVar = col; col++;
    } else {
      row.coefs[col] = 1; row.basicVar = col; col++;
    }
    rows.push(row);
  }
  return rows;
}

// ─── SERVICE: ZFormalizada ────────────────────────────────────────────────────
function formalizeZ(tableau) {
  const t = JSON.parse(JSON.stringify(tableau));
  for (let j = 0; j < t[0].coefs.length; j++) {
    if (Math.abs(t[0].coefs[j] - BIG_M) < 1) {
      for (let i = 1; i < t.length; i++) {
        if (Math.abs(t[i].coefs[j] - 1) < TOL) {
          for (let k = 0; k < t[0].coefs.length; k++) {
            t[0].coefs[k] -= BIG_M * t[i].coefs[k];
          }
          t[0].rhs -= BIG_M * t[i].rhs;
          break;
        }
      }
    }
  }
  return t;
}

// ─── SERVICE: SolverSimplex ───────────────────────────────────────────────────
function solverSimplex(tableau, tipoObjetivo) {
  const tipo = tipoObjetivo.toLowerCase();
  let t = tableau.map(r => ({ ...r, coefs: [...r.coefs] }));
  const iterations = [];
  let step = 0;

  function shouldContinue(zCoefs) {
    return tipo === "max"
      ? zCoefs.some(c => c < -TOL)
      : zCoefs.some(c => c > TOL);
  }

  function pivotCol(zCoefs) {
    let col = null, best = tipo === "max" ? TOL : -TOL;
    for (let i = 0; i < zCoefs.length; i++) {
      if (tipo === "max" && zCoefs[i] < -best) { best = -zCoefs[i]; col = i; }
      else if (tipo === "min" && zCoefs[i] > best) { best = zCoefs[i]; col = i; }
    }
    return col;
  }

  function pivotRow(t, col) {
    let row = null, minRatio = Infinity;
    for (let i = 1; i < t.length; i++) {
      if (t[i].coefs[col] > TOL) {
        const ratio = t[i].rhs / t[i].coefs[col];
        if (ratio >= -TOL && ratio < minRatio - TOL) { minRatio = ratio; row = i; }
      }
    }
    return row;
  }

  while (shouldContinue(t[0].coefs) && step < 200) {
    step++;
    const col = pivotCol(t[0].coefs);
    if (col === null) break;
    const row = pivotRow(t, col);
    if (row === null) return { status: "unbounded", iterations, solucao: {}, passos: step };

    iterations.push({
      passo: step,
      colunaPivo: col,
      linhaPivo: row,
      tableau: t.map(r => ({ ...r, coefs: [...r.coefs] }))
    });

    // Pivot
    const nt = t.map(r => ({ ...r, coefs: [...r.coefs] }));
    const pivVal = nt[row].coefs[col];
    for (let j = 0; j < nt[row].coefs.length; j++) nt[row].coefs[j] /= pivVal;
    nt[row].rhs /= pivVal;
    nt[row].basicVar = col;

    for (let i = 0; i < nt.length; i++) {
      if (i !== row) {
        const fac = nt[i].coefs[col];
        for (let j = 0; j < nt[i].coefs.length; j++) nt[i].coefs[j] -= fac * nt[row].coefs[j];
        nt[i].rhs -= fac * nt[row].rhs;
      }
    }
    t = nt;
  }

  // Extract solution
  const nOriginal = tableau[0].coefs.length;
  const sol = {};
  for (let j = 0; j < nOriginal; j++) {
    let isBasic = false, basicRow = -1, oneCount = 0, zeroCount = 0;
    for (let i = 0; i < t.length; i++) {
      const v = t[i].coefs[j];
      if (Math.abs(v - 1) < TOL) { oneCount++; basicRow = i; }
      else if (Math.abs(v) < TOL) zeroCount++;
    }
    if (oneCount === 1 && zeroCount === t.length - 1 && basicRow > 0) {
      if (j < nOriginal) sol[`x${j + 1}`] = Math.abs(t[basicRow].rhs) < TOL ? 0 : t[basicRow].rhs;
    }
  }
  const nVarsOrig = Object.keys(sol).length || nOriginal;
  for (let i = 1; i <= tableau.length - 1; i++) {
    if (!sol[`x${i}`]) sol[`x${i}`] = 0;
  }
  sol.Z = t[0].rhs;

  // Fill missing original vars
  for (let i = 1; i <= tableau.length - 1; i++) {
    if (sol[`x${i}`] === undefined) sol[`x${i}`] = 0;
  }

  return { status: "optimal", iterations, solucao: sol, passos: step, tableauFinal: t };
}

// ─── SERVICE: BranchAndBound ──────────────────────────────────────────────────
function branchAndBound(problema, tipoObjetivo, nOrigVars) {
  let bestSol = null;
  let bestZ = tipoObjetivo === "max" ? -Infinity : Infinity;
  const nodes = [];
  let nodeId = 0;

  function isBetter(z) {
    if (bestSol === null) return true;
    return tipoObjetivo === "max" ? z > bestZ + TOL : z < bestZ - TOL;
  }

  function shouldPrune(z) {
    if (bestSol === null) return false;
    return tipoObjetivo === "max" ? z <= bestZ + TOL : z >= bestZ - TOL;
  }

  function getNonInteger(sol) {
    const nonInt = [];
    for (let i = 1; i <= nOrigVars; i++) {
      const v = sol[`x${i}`] ?? 0;
      const diff = Math.abs(v - Math.round(v));
      if (diff > TOL) nonInt.push({ index: i - 1, name: `x${i}`, value: v, diff });
    }
    return nonInt.sort((a, b) => b.diff - a.diff);
  }

  function explore(prob, parentId, branchLabel, depth) {
    if (depth > 30) return;
    const id = nodeId++;
    const node = { id, parentId, branch: branchLabel, depth, status: "processing" };

    try {
      const aug = buildAugmented(prob);
      const form = formalizeZ(aug);
      const result = solverSimplex(form, tipoObjetivo);

      if (result.status === "unbounded") {
        node.status = "unbounded";
        nodes.push(node);
        return;
      }

      const sol = result.solucao;
      const z = sol.Z;
      node.z = z;
      node.resultadoSimplex = result;

      if (shouldPrune(z)) {
        node.status = "pruned_bound";
        node.motivoPoda = `Z=${z?.toFixed(4)} não melhora ${bestZ?.toFixed(4)}`;
        nodes.push(node);
        return;
      }

      const nonInt = getNonInteger(sol);
      if (nonInt.length === 0) {
        if (isBetter(z)) { bestSol = sol; bestZ = z; }
        node.status = "integer_solution";
        nodes.push(node);
        return;
      }

      node.status = "branching";
      nodes.push(node);

      const varIdx = nonInt[0].index;
      const varVal = nonInt[0].value;
      const fl = Math.floor(varVal), cl = Math.ceil(varVal);

      // Left: x <= floor
      const probLeft = JSON.parse(JSON.stringify(prob));
      const restrictLeft = { coeficientes: {}, sinal: "<=", rhs: fl, termo: fl };
      restrictLeft.coeficientes[varIdx] = 1;
      probLeft.restricoes.push(restrictLeft);
      explore(probLeft, id, `x${varIdx + 1} ≤ ${fl}`, depth + 1);

      // Right: x >= ceil
      const probRight = JSON.parse(JSON.stringify(prob));
      const restrictRight = { coeficientes: {}, sinal: ">=", rhs: cl, termo: cl };
      restrictRight.coeficientes[varIdx] = 1;
      probRight.restricoes.push(restrictRight);
      explore(probRight, id, `x${varIdx + 1} ≥ ${cl}`, depth + 1);

    } catch (err) {
      node.status = "infeasible";
      node.motivoPoda = err.message;
      nodes.push(node);
    }
  }

  explore(problema, null, "Raiz", 0);

  return {
    solucao: bestSol ?? {},
    status: bestSol ? "optimal_integer" : "no_integer_solution",
    mensagem: bestSol ? "Solução inteira ótima encontrada." : "Nenhuma solução inteira viável.",
    iteracoesBranchAndBound: nodes,
    is_branch_and_bound: true,
    passos: nodeId
  };
}

// ─── CHART: Region feasible (2 vars) ─────────────────────────────────────────
function FeasibleRegionChart({ problema, resultado }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    const pad = { l: 48, r: 24, t: 24, b: 48 };
    const pw = W - pad.l - pad.r, ph = H - pad.t - pad.b;

    // Determine axis limits
    const sol = resultado.solucao;
    let xMax = Math.max(10, (sol.x1 || 0) * 1.5);
    let yMax = Math.max(10, (sol.x2 || 0) * 1.5);

    problema.restricoes.forEach(r => {
      const coefs = typeof r.coeficientes === "object" && !Array.isArray(r.coeficientes)
        ? Object.values(r.coeficientes) : (r.coeficientes || []);
      const a = parseFloat(coefs[0] || 0), b = parseFloat(coefs[1] || 0), c = parseFloat(r.rhs || r.termo || 0);
      if (a > TOL) xMax = Math.max(xMax, c / a * 1.3);
      if (b > TOL) yMax = Math.max(yMax, c / b * 1.3);
    });

    function tx(x) { return pad.l + (x / xMax) * pw; }
    function ty(y) { return pad.t + (1 - y / yMax) * ph; }

    // Clear
    ctx.clearRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const x = pad.l + (i / 5) * pw;
      ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, pad.t + ph); ctx.stroke();
      const y = pad.t + (i / 5) * ph;
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + pw, y); ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(pad.l, pad.t); ctx.lineTo(pad.l, pad.t + ph); ctx.lineTo(pad.l + pw, pad.t + ph); ctx.stroke();

    // Axis labels
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "11px monospace";
    ctx.textAlign = "center";
    for (let i = 0; i <= 5; i++) {
      const v = ((i / 5) * xMax).toFixed(1);
      ctx.fillText(v, tx(parseFloat(v)), pad.t + ph + 16);
      if (i > 0) {
        const vy = ((i / 5) * yMax).toFixed(1);
        ctx.textAlign = "right";
        ctx.fillText(vy, pad.l - 6, ty(parseFloat(vy)) + 4);
        ctx.textAlign = "center";
      }
    }

    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "13px monospace";
    ctx.fillText("x₁", pad.l + pw + 16, pad.t + ph + 4);
    ctx.textAlign = "right";
    ctx.fillText("x₂", pad.l - 6, pad.t - 8);
    ctx.textAlign = "center";

    // Constraint lines
    const colors = ["#6366f1", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#ec4899"];
    const zCoefs = typeof problema.z.coeficientes === "object" && !Array.isArray(problema.z.coeficientes)
      ? Object.values(problema.z.coeficientes) : (problema.z.coeficientes || []);

    problema.restricoes.forEach((r, idx) => {
      const coefs = typeof r.coeficientes === "object" && !Array.isArray(r.coeficientes)
        ? Object.values(r.coeficientes) : (r.coeficientes || []);
      const a = parseFloat(coefs[0] || 0), b = parseFloat(coefs[1] || 0), c = parseFloat(r.rhs || r.termo || 0);

      ctx.strokeStyle = colors[idx % colors.length];
      ctx.lineWidth = 1.5;
      ctx.setLineDash([]);
      ctx.globalAlpha = 0.8;

      if (Math.abs(b) > TOL) {
        const x0 = 0, y0 = c / b;
        const x1 = xMax, y1 = (c - a * xMax) / b;
        ctx.beginPath(); ctx.moveTo(tx(x0), ty(y0)); ctx.lineTo(tx(x1), ty(y1)); ctx.stroke();
      } else if (Math.abs(a) > TOL) {
        const x = c / a;
        ctx.beginPath(); ctx.moveTo(tx(x), ty(0)); ctx.lineTo(tx(x), ty(yMax)); ctx.stroke();
      }

      // Label
      ctx.fillStyle = colors[idx % colors.length];
      ctx.font = "11px monospace";
      ctx.textAlign = "left";
      ctx.fillText(`R${idx + 1}`, pad.l + pw - 24, pad.t + 14 + idx * 14);
      ctx.globalAlpha = 1;
    });

    // Objective at optimal
    const a = parseFloat(zCoefs[0] || 0), b = parseFloat(zCoefs[1] || 0);
    const zVal = resultado.solucao.Z || 0;
    if (Math.abs(b) > TOL) {
      ctx.strokeStyle = "#f97316";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      ctx.globalAlpha = 0.9;
      const x0 = 0, y0 = zVal / b;
      const x1 = xMax, y1 = (zVal - a * xMax) / b;
      ctx.beginPath(); ctx.moveTo(tx(x0), ty(y0)); ctx.lineTo(tx(x1), ty(y1)); ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }

    // Optimal point
    const ox = resultado.solucao.x1 || 0, oy = resultado.solucao.x2 || 0;
    // Glow
    const grad = ctx.createRadialGradient(tx(ox), ty(oy), 0, tx(ox), ty(oy), 18);
    grad.addColorStop(0, "rgba(249,115,22,0.4)");
    grad.addColorStop(1, "rgba(249,115,22,0)");
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(tx(ox), ty(oy), 18, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = "#f97316";
    ctx.beginPath(); ctx.arc(tx(ox), ty(oy), 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Label optimal
    ctx.fillStyle = "#fff";
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`(${ox.toFixed(2)}, ${oy.toFixed(2)})`, tx(ox) + 10, ty(oy) - 8);

  }, [problema, resultado]);

  return (
    <canvas
      ref={canvasRef}
      width={480}
      height={320}
      style={{ width: "100%", height: "auto", borderRadius: 8, background: "rgba(255,255,255,0.03)" }}
    />
  );
}

// ─── TABLEAU DISPLAY ──────────────────────────────────────────────────────────
function TableauView({ iteration, nVars }) {
  const { tableau, colunaPivo, linhaPivo, passo } = iteration;
  if (!tableau) return null;
  const nCols = tableau[0].coefs.length;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 6, fontFamily: "monospace" }}>
        Iteração {passo} — Pivot: col {colunaPivo} / linha {linhaPivo}
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", fontSize: 11, fontFamily: "monospace", width: "100%" }}>
          <thead>
            <tr>
              <th style={thStyle("#1e1e2e")}>Base</th>
              {Array.from({ length: nCols }).map((_, j) => (
                <th key={j} style={thStyle(j === colunaPivo ? "rgba(99,102,241,0.3)" : "#1e1e2e")}>
                  {j < nVars ? `x${j + 1}` : `s${j - nVars + 1}`}
                </th>
              ))}
              <th style={thStyle("#1e1e2e")}>RHS</th>
            </tr>
          </thead>
          <tbody>
            {tableau.map((row, i) => (
              <tr key={i} style={{ background: i === linhaPivo ? "rgba(99,102,241,0.15)" : i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent" }}>
                <td style={tdStyle}>{i === 0 ? "Z" : `R${i}`}</td>
                {row.coefs.map((c, j) => (
                  <td key={j} style={{ ...tdStyle, color: Math.abs(c) < TOL ? "rgba(255,255,255,0.2)" : i === linhaPivo && j === colunaPivo ? "#f97316" : "rgba(255,255,255,0.85)" }}>
                    {Math.abs(c) > 1e6 ? "M" : c.toFixed(3)}
                  </td>
                ))}
                <td style={{ ...tdStyle, color: "#34d399", fontWeight: 600 }}>{row.rhs.toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const thStyle = (bg) => ({
  background: bg,
  padding: "4px 8px",
  color: "rgba(255,255,255,0.6)",
  fontWeight: 500,
  border: "1px solid rgba(255,255,255,0.06)",
  textAlign: "center",
  whiteSpace: "nowrap"
});
const tdStyle = {
  padding: "3px 8px",
  border: "1px solid rgba(255,255,255,0.05)",
  textAlign: "center",
  color: "rgba(255,255,255,0.75)"
};

// ─── B&B TREE VIEW ────────────────────────────────────────────────────────────
function BBTreeView({ nodes }) {
  const statusColor = {
    integer_solution: { bg: "rgba(16,185,129,0.15)", border: "#10b981", text: "#34d399" },
    pruned_bound: { bg: "rgba(245,158,11,0.1)", border: "#f59e0b", text: "#fbbf24" },
    infeasible: { bg: "rgba(239,68,68,0.1)", border: "#ef4444", text: "#f87171" },
    branching: { bg: "rgba(99,102,241,0.1)", border: "#6366f1", text: "#a5b4fc" },
    unbounded: { bg: "rgba(236,72,153,0.1)", border: "#ec4899", text: "#f9a8d4" },
    processing: { bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.1)", text: "rgba(255,255,255,0.5)" }
  };

  const statusLabel = {
    integer_solution: "✓ Inteiro",
    pruned_bound: "⊘ Podado",
    infeasible: "✗ Inviável",
    branching: "⤷ Ramifica",
    unbounded: "∞ Ilimitado",
    processing: "…"
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {nodes.map(n => {
        const s = statusColor[n.status] || statusColor.processing;
        return (
          <div key={n.id} style={{
            marginLeft: Math.min(n.depth * 16, 48),
            background: s.bg,
            border: `1px solid ${s.border}`,
            borderRadius: 8,
            padding: "8px 12px"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.9)", fontFamily: "monospace", fontWeight: 600 }}>
                Nó #{n.id} {n.branch && n.branch !== "Raiz" ? `— ${n.branch}` : n.branch === "Raiz" ? "— Raiz" : ""}
              </span>
              <span style={{ fontSize: 11, color: s.text, fontFamily: "monospace", padding: "2px 8px", background: "rgba(0,0,0,0.2)", borderRadius: 4 }}>
                {statusLabel[n.status] || n.status}
              </span>
            </div>
            {n.z !== undefined && (
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontFamily: "monospace" }}>Z = {n.z.toFixed(4)}</div>
            )}
            {n.motivoPoda && (
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>{n.motivoPoda}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
const SCREENS = { HOME: "home", CONFIG: "config", DATA: "data", REVIEW: "review", RESULT: "result" };

export default function SimplexSolver() {
  const [screen, setScreen] = useState(SCREENS.HOME);
  const [config, setConfig] = useState({ tipo: "max", nVars: 2, nRest: 2, useInteger: false });
  const [funcZ, setFuncZ] = useState({});
  const [restricoes, setRestricoes] = useState([]);
  const [resultado, setResultado] = useState(null);
  const [activeTab, setActiveTab] = useState("solution");
  const [solving, setSolving] = useState(false);
  const [showAllIter, setShowAllIter] = useState(false);

  // Initialize form when config changes
  useEffect(() => {
    if (screen === SCREENS.DATA) {
      const z = {};
      for (let i = 0; i < config.nVars; i++) z[i] = funcZ[i] ?? 0;
      setFuncZ(z);

      if (restricoes.length !== config.nRest) {
        const r = Array.from({ length: config.nRest }, (_, i) => restricoes[i] || {
          coeficientes: Object.fromEntries(Array.from({ length: config.nVars }, (_, j) => [j, 0])),
          sinal: "<=",
          rhs: 0
        });
        setRestricoes(r);
      }
    }
  }, [screen]);

  const handleSolve = useCallback(() => {
    setSolving(true);
    setTimeout(() => {
      try {
        const problema = {
          tipo: config.tipo,
          variaveis: config.nVars,
          restricoes: restricoes.map(r => ({
            coeficientes: r.coeficientes,
            sinal: r.sinal,
            rhs: parseFloat(r.rhs) || 0
          })),
          z: { coeficientes: Object.fromEntries(Object.entries(funcZ).map(([k, v]) => [k, parseFloat(v) || 0])) },
          usarBranchAndBound: config.useInteger
        };

        let res;
        if (config.useInteger) {
          res = branchAndBound(problema, config.tipo, config.nVars);
        } else {
          const aug = buildAugmented(problema);
          const form = formalizeZ(aug);
          res = solverSimplex(form, config.tipo);
          res.is_branch_and_bound = false;
          if (res.status === "unbounded") {
            res.mensagem = "Problema ilimitado — não existe solução finita.";
          } else {
            res.status = "optimal";
            res.mensagem = "Solução ótima encontrada.";
          }
        }
        setResultado(res);
        setActiveTab("solution");
        setScreen(SCREENS.RESULT);
      } catch (err) {
        alert("Erro ao resolver: " + err.message);
      } finally {
        setSolving(false);
      }
    }, 50);
  }, [config, restricoes, funcZ]);

  // ── Styles ──
  const S = {
    app: {
      minHeight: "100vh",
      background: "#0f0f1a",
      color: "rgba(255,255,255,0.9)",
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      display: "flex",
      flexDirection: "column"
    },
    topbar: {
      background: "rgba(255,255,255,0.04)",
      borderBottom: "1px solid rgba(255,255,255,0.07)",
      padding: "0 16px",
      height: 52,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      position: "sticky",
      top: 0,
      zIndex: 50,
      backdropFilter: "blur(12px)"
    },
    logo: { display: "flex", alignItems: "center", gap: 8 },
    logoIcon: {
      width: 28, height: 28, borderRadius: 6,
      background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 14, fontWeight: 700, color: "#fff"
    },
    logoText: { fontSize: 15, fontWeight: 600, color: "#fff", letterSpacing: "-0.3px" },
    content: { flex: 1, padding: "20px 16px", maxWidth: 520, margin: "0 auto", width: "100%" },
    card: {
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 14,
      padding: 20,
      marginBottom: 16
    },
    label: { fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 500, marginBottom: 6, display: "block", letterSpacing: "0.5px", textTransform: "uppercase" },
    input: {
      width: "100%",
      background: "rgba(255,255,255,0.06)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 8,
      padding: "10px 12px",
      color: "#fff",
      fontSize: 14,
      outline: "none",
      boxSizing: "border-box",
      fontFamily: "inherit",
      transition: "border-color 0.2s"
    },
    select: {
      width: "100%",
      background: "#1a1a2e",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 8,
      padding: "10px 12px",
      color: "#fff",
      fontSize: 14,
      outline: "none",
      boxSizing: "border-box",
      cursor: "pointer"
    },
    btnPrimary: {
      width: "100%",
      background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
      border: "none",
      borderRadius: 10,
      padding: "13px 20px",
      color: "#fff",
      fontSize: 15,
      fontWeight: 600,
      cursor: "pointer",
      letterSpacing: "-0.2px",
      transition: "opacity 0.2s, transform 0.1s"
    },
    btnOutline: {
      background: "transparent",
      border: "1px solid rgba(255,255,255,0.15)",
      borderRadius: 10,
      padding: "10px 16px",
      color: "rgba(255,255,255,0.7)",
      fontSize: 14,
      cursor: "pointer",
      transition: "background 0.2s"
    },
    sectionTitle: { fontSize: 16, fontWeight: 600, color: "#fff", marginBottom: 12, marginTop: 0 },
    badge: (color) => ({
      display: "inline-block",
      padding: "3px 10px",
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: "0.4px",
      background: color === "green" ? "rgba(16,185,129,0.15)" : color === "red" ? "rgba(239,68,68,0.15)" : "rgba(99,102,241,0.15)",
      color: color === "green" ? "#34d399" : color === "red" ? "#f87171" : "#a5b4fc",
      border: `1px solid ${color === "green" ? "rgba(16,185,129,0.3)" : color === "red" ? "rgba(239,68,68,0.3)" : "rgba(99,102,241,0.3)"}`
    }),
    tab: (active) => ({
      padding: "8px 14px",
      borderRadius: 8,
      fontSize: 13,
      fontWeight: active ? 600 : 400,
      color: active ? "#fff" : "rgba(255,255,255,0.45)",
      background: active ? "rgba(99,102,241,0.25)" : "transparent",
      border: active ? "1px solid rgba(99,102,241,0.4)" : "1px solid transparent",
      cursor: "pointer",
      transition: "all 0.15s",
      whiteSpace: "nowrap"
    }),
    divider: { height: 1, background: "rgba(255,255,255,0.06)", margin: "16px 0" },
    metricCard: {
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 10,
      padding: "14px 16px",
      textAlign: "center",
      flex: 1
    }
  };

  const renderHome = () => (
    <div style={S.content}>
      {/* Hero */}
      <div style={{ textAlign: "center", padding: "32px 0 24px" }}>
        <div style={{ width: 64, height: 64, borderRadius: 16, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 16px", boxShadow: "0 0 40px rgba(99,102,241,0.3)" }}>
          ∑
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#fff", margin: "0 0 8px", letterSpacing: "-0.8px" }}>Simplex Solver</h1>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", margin: 0, lineHeight: 1.6 }}>
          Programação linear com Método Simplex e Branch & Bound
        </p>
      </div>

      {/* Features */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        {[
          { icon: "⊞", title: "Tableau Simplex", desc: "Iterações detalhadas", color: "#6366f1" },
          { icon: "🌿", title: "Branch & Bound", desc: "Variáveis inteiras", color: "#10b981" },
          { icon: "◈", title: "Gráfico 2D", desc: "Região viável", color: "#f59e0b" },
          { icon: "⊕", title: "BigM Method", desc: "Forma aumentada", color: "#06b6d4" }
        ].map(f => (
          <div key={f.title} style={{ ...S.card, marginBottom: 0, padding: "14px 14px" }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>{f.icon}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 2 }}>{f.title}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{f.desc}</div>
          </div>
        ))}
      </div>

      <button style={S.btnPrimary} onClick={() => setScreen(SCREENS.CONFIG)}>
        Novo Problema →
      </button>

      {resultado && (
        <button style={{ ...S.btnOutline, width: "100%", marginTop: 10 }} onClick={() => setScreen(SCREENS.RESULT)}>
          Ver último resultado
        </button>
      )}
    </div>
  );

  const renderConfig = () => (
    <div style={S.content}>
      <button style={{ ...S.btnOutline, marginBottom: 20 }} onClick={() => setScreen(SCREENS.HOME)}>← Voltar</button>
      <div style={S.card}>
        <h2 style={S.sectionTitle}>Configurar Problema</h2>

        <div style={{ marginBottom: 16 }}>
          <label style={S.label}>Tipo de Otimização</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {["max", "min"].map(t => (
              <button key={t} style={{
                padding: "10px",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                border: config.tipo === t ? "1px solid #6366f1" : "1px solid rgba(255,255,255,0.1)",
                background: config.tipo === t ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.04)",
                color: config.tipo === t ? "#a5b4fc" : "rgba(255,255,255,0.5)",
                transition: "all 0.15s"
              }} onClick={() => setConfig(c => ({ ...c, tipo: t }))}>
                {t === "max" ? "↑ Maximizar" : "↓ Minimizar"}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div>
            <label style={S.label}>Variáveis</label>
            <input style={S.input} type="number" min="1" max="10" value={config.nVars}
              onChange={e => setConfig(c => ({ ...c, nVars: Math.min(10, Math.max(1, parseInt(e.target.value) || 1)) }))} />
          </div>
          <div>
            <label style={S.label}>Restrições</label>
            <input style={S.input} type="number" min="1" max="20" value={config.nRest}
              onChange={e => setConfig(c => ({ ...c, nRest: Math.min(20, Math.max(1, parseInt(e.target.value) || 1)) }))} />
          </div>
        </div>

        <div style={{
          display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
          background: config.useInteger ? "rgba(16,185,129,0.1)" : "rgba(255,255,255,0.04)",
          border: config.useInteger ? "1px solid rgba(16,185,129,0.3)" : "1px solid rgba(255,255,255,0.08)",
          borderRadius: 10, cursor: "pointer", transition: "all 0.2s", marginBottom: 20
        }} onClick={() => setConfig(c => ({ ...c, useInteger: !c.useInteger }))}>
          <div style={{
            width: 40, height: 22, borderRadius: 11,
            background: config.useInteger ? "#10b981" : "rgba(255,255,255,0.15)",
            position: "relative", transition: "background 0.2s", flexShrink: 0
          }}>
            <div style={{
              position: "absolute", top: 2, left: config.useInteger ? 20 : 2,
              width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.2s"
            }} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>Variáveis Inteiras</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Ativa o algoritmo Branch & Bound</div>
          </div>
        </div>

        <button style={S.btnPrimary} onClick={() => setScreen(SCREENS.DATA)}>
          Inserir Dados →
        </button>
      </div>
    </div>
  );

  const renderData = () => {
    const updateZ = (i, v) => setFuncZ(z => ({ ...z, [i]: parseFloat(v) || 0 }));
    const updateCoef = (ri, vi, v) => setRestricoes(rs => {
      const n = rs.map(r => ({ ...r }));
      if (!n[ri]) n[ri] = { coeficientes: {}, sinal: "<=", rhs: 0 };
      n[ri] = { ...n[ri], coeficientes: { ...n[ri].coeficientes, [vi]: parseFloat(v) || 0 } };
      return n;
    });
    const updateSinal = (ri, v) => setRestricoes(rs => rs.map((r, i) => i === ri ? { ...r, sinal: v } : r));
    const updateRhs = (ri, v) => setRestricoes(rs => rs.map((r, i) => i === ri ? { ...r, rhs: parseFloat(v) || 0 } : r));

    return (
      <div style={S.content}>
        <button style={{ ...S.btnOutline, marginBottom: 20 }} onClick={() => setScreen(SCREENS.CONFIG)}>← Voltar</button>

        {/* Função Objetivo */}
        <div style={S.card}>
          <h2 style={S.sectionTitle}>{config.tipo.toUpperCase()} Z</h2>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(config.nVars, 4)}, 1fr)`, gap: 8 }}>
            {Array.from({ length: config.nVars }).map((_, i) => (
              <div key={i}>
                <label style={S.label}>x{i + 1}</label>
                <input style={S.input} type="number" step="any" value={funcZ[i] ?? 0}
                  onChange={e => updateZ(i, e.target.value)} />
              </div>
            ))}
          </div>
        </div>

        {/* Restrições */}
        {restricoes.map((r, ri) => (
          <div key={ri} style={S.card}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.6)", marginTop: 0, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(99,102,241,0.25)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>{ri + 1}</span>
              Restrição {ri + 1}
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(config.nVars, 3)}, 1fr)`, gap: 8, marginBottom: 10 }}>
              {Array.from({ length: config.nVars }).map((_, vi) => (
                <div key={vi}>
                  <label style={S.label}>x{vi + 1}</label>
                  <input style={S.input} type="number" step="any" value={r?.coeficientes?.[vi] ?? 0}
                    onChange={e => updateCoef(ri, vi, e.target.value)} />
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div>
                <label style={S.label}>Sinal</label>
                <select style={S.select} value={r?.sinal || "<="} onChange={e => updateSinal(ri, e.target.value)}>
                  <option value="<=">≤</option>
                  <option value=">=">≥</option>
                  <option value="=">=</option>
                </select>
              </div>
              <div>
                <label style={S.label}>RHS</label>
                <input style={S.input} type="number" step="any" value={r?.rhs ?? 0}
                  onChange={e => updateRhs(ri, e.target.value)} />
              </div>
            </div>

            {/* Preview */}
            <div style={{ marginTop: 10, padding: "8px 10px", background: "rgba(255,255,255,0.03)", borderRadius: 6, fontFamily: "monospace", fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
              {Object.entries(r?.coeficientes || {}).filter(([, v]) => v !== 0).map(([k, v], i) => (
                <span key={k}>{i > 0 ? (v > 0 ? " + " : " - ") : (v < 0 ? "-" : "")}
                  {Math.abs(v) !== 1 ? Math.abs(v) : ""}x{parseInt(k) + 1}
                </span>
              ))} {r?.sinal} {r?.rhs}
            </div>
          </div>
        ))}

        <button style={S.btnPrimary} onClick={() => setScreen(SCREENS.REVIEW)}>
          Revisar Problema →
        </button>
      </div>
    );
  };

  const renderReview = () => {
    const zStr = Object.entries(funcZ).filter(([, v]) => v !== 0).map(([k, v], i) => {
      const s = i === 0 ? (v < 0 ? "-" : "") : (v < 0 ? " - " : " + ");
      return `${s}${Math.abs(v) !== 1 ? Math.abs(v) : ""}x${parseInt(k) + 1}`;
    }).join("") || "0";

    return (
      <div style={S.content}>
        <button style={{ ...S.btnOutline, marginBottom: 20 }} onClick={() => setScreen(SCREENS.DATA)}>← Editar</button>

        <div style={S.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>Problema</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: "#fff", fontFamily: "monospace" }}>
                {config.tipo.toUpperCase()} Z = {zStr}
              </div>
            </div>
            <span style={S.badge(config.useInteger ? "green" : "purple")}>
              {config.useInteger ? "B&B" : "Simplex"}
            </span>
          </div>

          <div style={S.divider} />

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }}>
            {[
              { label: "Variáveis", value: config.nVars },
              { label: "Restrições", value: config.nRest },
              { label: "Método", value: config.useInteger ? "B&B" : "Simplex" }
            ].map(m => (
              <div key={m.label} style={{ textAlign: "center", padding: "10px 8px", background: "rgba(255,255,255,0.04)", borderRadius: 8 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#a5b4fc" }}>{m.value}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{m.label}</div>
              </div>
            ))}
          </div>

          <div style={S.divider} />
          <h3 style={{ ...S.sectionTitle, fontSize: 13, color: "rgba(255,255,255,0.6)" }}>Restrições</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {restricoes.map((r, i) => {
              const str = Object.entries(r?.coeficientes || {}).filter(([, v]) => v !== 0).map(([k, v], j) => {
                const s = j === 0 ? (v < 0 ? "-" : "") : (v < 0 ? " - " : " + ");
                return `${s}${Math.abs(v) !== 1 ? Math.abs(v) : ""}x${parseInt(k) + 1}`;
              }).join("") || "0";
              return (
                <div key={i} style={{ padding: "8px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 6, fontFamily: "monospace", fontSize: 13, color: "rgba(255,255,255,0.75)", borderLeft: "2px solid rgba(99,102,241,0.5)" }}>
                  {i + 1}. {str} {r.sinal} {r.rhs}
                </div>
              );
            })}
          </div>
        </div>

        <button style={{ ...S.btnPrimary, opacity: solving ? 0.6 : 1 }} onClick={handleSolve} disabled={solving}>
          {solving ? "Resolvendo..." : "⊞  Resolver Problema"}
        </button>
      </div>
    );
  };

  const renderResult = () => {
    if (!resultado) return null;
    const isOptimal = resultado.status === "optimal" || resultado.status === "optimal_integer";
    const sol = resultado.solucao || {};
    const iters = resultado.is_branch_and_bound ? resultado.iteracoesBranchAndBound : resultado.iterations;
    const nIters = iters?.length || resultado.passos || 0;
    const showChart = config.nVars === 2 && !resultado.is_branch_and_bound && isOptimal;

    const tabs = [
      { id: "solution", label: "Solução" },
      { id: "iterations", label: `Iterações (${nIters})` },
      ...(showChart ? [{ id: "chart", label: "Gráfico" }] : [])
    ];

    const problema = {
      tipo: config.tipo,
      variaveis: config.nVars,
      restricoes: restricoes,
      z: { coeficientes: funcZ },
      usarBranchAndBound: config.useInteger
    };

    return (
      <div style={S.content}>
        <div style={{ display: "flex", gap: 10, marginBottom: 20, alignItems: "center" }}>
          <button style={S.btnOutline} onClick={() => setScreen(SCREENS.HOME)}>← Início</button>
          <button style={{ ...S.btnOutline, flex: 1 }} onClick={() => setScreen(SCREENS.REVIEW)}>Novo</button>
        </div>

        {/* Status header */}
        <div style={{ ...S.card, borderColor: isOptimal ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)", background: isOptimal ? "rgba(16,185,129,0.07)" : "rgba(239,68,68,0.07)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 28 }}>{isOptimal ? "✓" : "✗"}</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: isOptimal ? "#34d399" : "#f87171" }}>
                {isOptimal ? "Solução Ótima" : resultado.status === "unbounded" ? "Problema Ilimitado" : "Sem Solução Inteira"}
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>{resultado.mensagem}</div>
            </div>
            <div style={{ marginLeft: "auto", textAlign: "right" }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#fff", fontFamily: "monospace", letterSpacing: "-1px" }}>
                {sol.Z !== undefined ? sol.Z.toFixed(4) : "—"}
              </div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", textTransform: "uppercase" }}>Valor Z</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 16, overflowX: "auto", padding: "2px 0" }}>
          {tabs.map(t => (
            <button key={t.id} style={S.tab(activeTab === t.id)} onClick={() => setActiveTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Solution tab */}
        {activeTab === "solution" && (
          <div>
            <div style={S.card}>
              <h3 style={S.sectionTitle}>Variáveis de Decisão</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {Object.entries(sol).filter(([k]) => k.startsWith("x")).map(([k, v]) => (
                  <div key={k} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "rgba(255,255,255,0.04)", borderRadius: 8, borderLeft: "3px solid #6366f1" }}>
                    <span style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>{k}</span>
                    <span style={{ fontFamily: "monospace", fontSize: 16, fontWeight: 700, color: "#a5b4fc" }}>
                      {typeof v === "number" ? v.toFixed(4) : v}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <div style={S.metricCard}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#f97316", fontFamily: "monospace" }}>{sol.Z?.toFixed(3) ?? "—"}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>Valor Ótimo Z</div>
              </div>
              <div style={S.metricCard}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#06b6d4", fontFamily: "monospace" }}>{nIters}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>Iterações</div>
              </div>
              <div style={S.metricCard}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#10b981", fontFamily: "monospace" }}>{config.nVars}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>Variáveis</div>
              </div>
            </div>
          </div>
        )}

        {/* Iterations tab */}
        {activeTab === "iterations" && (
          <div style={S.card}>
            <h3 style={S.sectionTitle}>
              {resultado.is_branch_and_bound ? "Nós Branch & Bound" : "Tableaux do Simplex"}
            </h3>
            {resultado.is_branch_and_bound ? (
              <BBTreeView nodes={resultado.iteracoesBranchAndBound || []} />
            ) : (
              <>
                {(resultado.iterations || []).slice(0, showAllIter ? 999 : 5).map((it, i) => (
                  <TableauView key={i} iteration={it} nVars={config.nVars} />
                ))}
                {(resultado.iterations?.length || 0) > 5 && !showAllIter && (
                  <button style={{ ...S.btnOutline, width: "100%", marginTop: 8 }}
                    onClick={() => setShowAllIter(true)}>
                    Ver todas as {resultado.iterations.length} iterações
                  </button>
                )}
                {(resultado.iterations?.length || 0) === 0 && (
                  <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 13, textAlign: "center", padding: 20 }}>
                    Solução encontrada na forma inicial (0 iterações de pivotamento)
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Chart tab */}
        {activeTab === "chart" && showChart && (
          <div style={S.card}>
            <h3 style={S.sectionTitle}>Região Viável</h3>
            <FeasibleRegionChart problema={problema} resultado={resultado} />
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                <span style={{ width: 24, height: 2, background: "#f97316", display: "inline-block", flexShrink: 0 }} /> Função objetivo (ótima)
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#f97316", display: "inline-block", flexShrink: 0 }} /> Ponto ótimo ({(sol.x1 || 0).toFixed(2)}, {(sol.x2 || 0).toFixed(2)})
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={S.app}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800&display=swap" rel="stylesheet" />
      <div style={S.topbar}>
        <div style={S.logo}>
          <div style={S.logoIcon}>Σ</div>
          <span style={S.logoText}>Simplex Solver</span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {[
            { s: SCREENS.HOME, label: "Início" },
            { s: SCREENS.CONFIG, label: "Config" }
          ].map(({ s, label }) => (
            <button key={s} style={{
              ...S.btnOutline,
              padding: "6px 12px",
              fontSize: 12,
              background: screen === s ? "rgba(99,102,241,0.15)" : "transparent",
              borderColor: screen === s ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.15)",
              color: screen === s ? "#a5b4fc" : "rgba(255,255,255,0.5)"
            }} onClick={() => setScreen(s)}>{label}</button>
          ))}
        </div>
      </div>

      {screen === SCREENS.HOME && renderHome()}
      {screen === SCREENS.CONFIG && renderConfig()}
      {screen === SCREENS.DATA && renderData()}
      {screen === SCREENS.REVIEW && renderReview()}
      {screen === SCREENS.RESULT && renderResult()}
    </div>
  );
}