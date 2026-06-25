import React, { useEffect, useRef, useState } from 'react';
import { Constraint } from '../types';

interface SimplexGraphProps {
  nVars: number;
  funcZ: Record<number, number>;
  restricoes: Constraint[];
  optimalSolution: Record<string, number>;
  optimalValue: number;
  integerSolution?: Record<string, number>; // Solução inteira (Branch and Bound), opcional
}

type GraphTab = 'continua' | 'inteira';

export const SimplexGraph: React.FC<SimplexGraphProps> = ({ nVars, funcZ, restricoes, optimalSolution, optimalValue, integerSolution }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tab, setTab] = useState<GraphTab>('continua');

  // Aba efetiva: só usa "inteira" se existir solução inteira
  const activeTab: GraphTab = tab === 'inteira' && integerSolution ? 'inteira' : 'continua';

  useEffect(() => {
    if (nVars !== 2 || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const TOL = 1e-9;
    const FEAS_TOL = 1e-6;
    const W = canvas.width;
    const H = canvas.height;
    const pad = { l: 48, r: 24, t: 24, b: 48 };
    const pw = W - pad.l - pad.r;
    const ph = H - pad.t - pad.b;

    const sol = optimalSolution;
    const ox = sol.x1 || 0;
    const oy = sol.x2 || 0;

    // Coeficientes da função objetivo
    const aZ = parseFloat(funcZ[0] as any || 0);
    const bZ = parseFloat(funcZ[1] as any || 0);

    // Determine axis limits
    let xMax = Math.max(10, ox * 1.5);
    let yMax = Math.max(10, oy * 1.5);
    restricoes.forEach(r => {
      const a = parseFloat(r.coeficientes[0] as any || 0);
      const b = parseFloat(r.coeficientes[1] as any || 0);
      const c = parseFloat(r.rhs as any || 0);
      if (a > TOL) xMax = Math.max(xMax, c / a * 1.3);
      if (b > TOL) yMax = Math.max(yMax, c / b * 1.3);
    });

    const tx = (x: number) => pad.l + (x / xMax) * pw;
    const ty = (y: number) => pad.t + (1 - y / yMax) * ph;

    // Restrições como retas + teste de viabilidade (reaproveitado nas duas abas)
    const cons = restricoes.map(r => ({
      a: parseFloat(r.coeficientes[0] as any || 0),
      b: parseFloat(r.coeficientes[1] as any || 0),
      c: parseFloat(r.rhs as any || 0),
      type: (r.sinal as string) || '<=',
    }));
    const isFeasible = (x: number, y: number) => {
      if (x < -FEAS_TOL || y < -FEAS_TOL) return false;
      for (const k of cons) {
        const val = k.a * x + k.b * y;
        const tol = FEAS_TOL * (1 + Math.abs(k.c));
        if (k.type === '<=' && val > k.c + tol) return false;
        if (k.type === '>=' && val < k.c - tol) return false;
        if (k.type === '=' && Math.abs(val - k.c) > tol) return false;
      }
      return true;
    };

    // Clear + fundo
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#FDFBF7";
    ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = "rgba(0,0,0,0.05)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const x = pad.l + (i / 5) * pw;
      ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, pad.t + ph); ctx.stroke();
      const y = pad.t + (i / 5) * ph;
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + pw, y); ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = "rgba(0,0,0,0.2)";
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(pad.l, pad.t); ctx.lineTo(pad.l, pad.t + ph); ctx.lineTo(pad.l + pw, pad.t + ph); ctx.stroke();

    // Axis labels
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.font = "11px sans-serif";
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
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.font = "13px sans-serif";
    ctx.fillText("x₁", pad.l + pw + 16, pad.t + ph + 4);
    ctx.textAlign = "right";
    ctx.fillText("x₂", pad.l - 6, pad.t - 8);
    ctx.textAlign = "center";

    // ===== Coloração da Região de Viabilidade (comum às duas abas) =====
    {
      const flines = [
        ...cons.map(k => ({ a: k.a, b: k.b, c: k.c })),
        { a: 1, b: 0, c: 0 },
        { a: 0, b: 1, c: 0 },
      ];
      const verts: { x: number; y: number }[] = [];
      for (let i = 0; i < flines.length; i++) {
        for (let j = i + 1; j < flines.length; j++) {
          const L1 = flines[i], L2 = flines[j];
          const det = L1.a * L2.b - L2.a * L1.b;
          if (Math.abs(det) < TOL) continue;
          const x = (L1.c * L2.b - L2.c * L1.b) / det;
          const y = (L1.a * L2.c - L2.a * L1.c) / det;
          if (isFeasible(x, y) && !verts.some(u => Math.abs(u.x - x) < 1e-6 && Math.abs(u.y - y) < 1e-6)) {
            verts.push({ x, y });
          }
        }
      }
      if (verts.length >= 3) {
        const cx = verts.reduce((s, v) => s + v.x, 0) / verts.length;
        const cy = verts.reduce((s, v) => s + v.y, 0) / verts.length;
        verts.sort((p, q) => Math.atan2(p.y - cy, p.x - cx) - Math.atan2(q.y - cy, q.x - cx));
        ctx.beginPath();
        verts.forEach((v, i) => {
          const px = tx(v.x), py = ty(v.y);
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        });
        ctx.closePath();
        ctx.fillStyle = "rgba(223,106,69,0.32)";
        ctx.fill();
        ctx.strokeStyle = "rgba(223,106,69,0.95)";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // ===== Retas das restrições (comum às duas abas) =====
    const colors = ["#6b5894", "#df6a45", "#10b981", "#f59e0b", "#ef4444", "#ec4899"];
    restricoes.forEach((r, idx) => {
      const a = parseFloat(r.coeficientes[0] as any || 0);
      const b = parseFloat(r.coeficientes[1] as any || 0);
      const c = parseFloat(r.rhs as any || 0);

      ctx.strokeStyle = colors[idx % colors.length];
      ctx.lineWidth = 1.5;
      ctx.setLineDash([]);
      ctx.globalAlpha = 0.8;

      if (Math.abs(b) > TOL) {
        const y0 = c / b;
        const y1 = (c - a * xMax) / b;
        ctx.beginPath(); ctx.moveTo(tx(0), ty(y0)); ctx.lineTo(tx(xMax), ty(y1)); ctx.stroke();
      } else if (Math.abs(a) > TOL) {
        const x = c / a;
        ctx.beginPath(); ctx.moveTo(tx(x), ty(0)); ctx.lineTo(tx(x), ty(yMax)); ctx.stroke();
      }

      ctx.fillStyle = colors[idx % colors.length];
      ctx.font = "11px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`R${idx + 1}`, pad.l + pw - 24, pad.t + 14 + idx * 14);
      ctx.globalAlpha = 1;
    });

    if (activeTab === 'continua') {
      // ===== Curvas de Nível (progressão da função objetivo) =====
      const zVal = optimalValue || 0;
      if (Math.abs(aZ) > TOL || Math.abs(bZ) > TOL) {
        const levelCurves: number[] = [];
        if (Math.abs(zVal) > TOL) {
          levelCurves.push(0);
          levelCurves.push(zVal * 0.5);
        }
        levelCurves.push(zVal);

        levelCurves.forEach((z, index) => {
          const isOptimalLine = index === levelCurves.length - 1;
          ctx.strokeStyle = "#362724";
          ctx.lineWidth = isOptimalLine ? 2 : 1;
          ctx.setLineDash(isOptimalLine ? [6, 3] : [2, 4]);
          ctx.globalAlpha = isOptimalLine ? 0.9 : 0.3;

          ctx.beginPath();
          if (Math.abs(bZ) > TOL) {
            const x0 = -xMax, y0 = (z - aZ * (-xMax)) / bZ;
            const x1 = xMax * 2, y1 = (z - aZ * (xMax * 2)) / bZ;
            ctx.moveTo(tx(x0), ty(y0));
            ctx.lineTo(tx(x1), ty(y1));
          } else {
            const x = z / aZ;
            ctx.moveTo(tx(x), ty(-yMax));
            ctx.lineTo(tx(x), ty(yMax * 2));
          }
          ctx.stroke();

          if (!isOptimalLine) {
            ctx.fillStyle = "rgba(54,39,36,0.6)";
            ctx.font = "italic 9px sans-serif";
            ctx.textAlign = "right";
            const labelX = xMax * 0.8;
            const labelY = Math.abs(bZ) > TOL ? (z - aZ * labelX) / bZ : yMax * 0.8;
            ctx.fillText(`Z=${z.toFixed(1)}`, tx(labelX), ty(labelY) - 4);
          }
        });
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      }

      // ===== Ponto Ótimo (contínuo) =====
      const grad = ctx.createRadialGradient(tx(ox), ty(oy), 0, tx(ox), ty(oy), 18);
      grad.addColorStop(0, "rgba(223,106,69,0.4)");
      grad.addColorStop(1, "rgba(223,106,69,0)");
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(tx(ox), ty(oy), 18, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = "#df6a45";
      ctx.beginPath(); ctx.arc(tx(ox), ty(oy), 6, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = "#362724";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`(${ox.toFixed(2)}, ${oy.toFixed(2)})`, tx(ox) + 10, ty(oy) - 8);

    } else {
      // ===== ABA INTEIRA =====
      const ix = Math.round(integerSolution!.x1 || 0);
      const iy = Math.round(integerSolution!.x2 || 0);

      // Pontos inteiros viáveis (lattice) dentro da região
      const maxI = Math.floor(xMax);
      const maxJ = Math.floor(yMax);
      if ((maxI + 1) * (maxJ + 1) <= 2500) {
        ctx.fillStyle = "rgba(107,88,148,0.45)";
        for (let i = 0; i <= maxI; i++) {
          for (let j = 0; j <= maxJ; j++) {
            if (isFeasible(i, j)) {
              ctx.beginPath();
              ctx.arc(tx(i), ty(j), 2.2, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      }

      // Curva de nível de Z passando pela solução inteira ótima
      if (Math.abs(aZ) > TOL || Math.abs(bZ) > TOL) {
        const zInt = aZ * ix + bZ * iy;
        ctx.strokeStyle = "#6b5894";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 3]);
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        if (Math.abs(bZ) > TOL) {
          const y0 = zInt / bZ;
          const y1 = (zInt - aZ * xMax) / bZ;
          ctx.moveTo(tx(0), ty(y0));
          ctx.lineTo(tx(xMax), ty(y1));
        } else {
          const x = zInt / aZ;
          ctx.moveTo(tx(x), ty(0));
          ctx.lineTo(tx(x), ty(yMax));
        }
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      }

      // Solução inteira ótima — losango roxo com glow
      const px = tx(ix), py = ty(iy);
      const grad = ctx.createRadialGradient(px, py, 0, px, py, 18);
      grad.addColorStop(0, "rgba(107,88,148,0.4)");
      grad.addColorStop(1, "rgba(107,88,148,0)");
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(px, py, 18, 0, Math.PI * 2); ctx.fill();

      const s = 7;
      ctx.fillStyle = "#6b5894";
      ctx.beginPath();
      ctx.moveTo(px, py - s);
      ctx.lineTo(px + s, py);
      ctx.lineTo(px, py + s);
      ctx.lineTo(px - s, py);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = "#362724";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`(${ix}, ${iy})`, px + 12, py - 8);
    }

  }, [nVars, funcZ, restricoes, optimalSolution, optimalValue, integerSolution, activeTab]);

  const handleDownloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `grafico-${activeTab}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  if (nVars !== 2) return null;

  const tabBtn = (id: GraphTab) =>
    `px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
      activeTab === id ? 'bg-[#362724] text-white' : 'bg-[#F6EFE6] text-[#8c827a] hover:bg-[#efe6d8]'
    }`;

  return (
    <div className="mb-10 p-6 bg-white border border-[#e8dcc8] rounded-xl shadow-sm">
      <div className="flex items-start justify-between gap-4 mb-3">
        <h3 className="text-lg font-bold text-[#362724]">Análise Gráfica</h3>
        <button
          onClick={handleDownloadImage}
          className="shrink-0 text-xs font-medium border border-[#e8dcc8] bg-transparent hover:bg-[#F6EFE6] px-3 py-1.5 rounded-full transition-colors flex items-center gap-1.5"
          title="Baixar imagem do gráfico (PNG)"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
          Baixar gráfico
        </button>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <button className={tabBtn('continua')} onClick={() => setTab('continua')}>Contínua</button>
        {integerSolution && (
          <button className={tabBtn('inteira')} onClick={() => setTab('inteira')}>Inteira</button>
        )}
      </div>

      <p className="text-xs text-[#8c827a] mb-4">
        {activeTab === 'continua'
          ? 'A reta tracejada escura representa Z máximo/mínimo. As retas claras mostram o deslocamento (níveis) de Z.'
          : 'Os pontos roxos são as soluções inteiras viáveis. O losango destacado é a solução inteira ótima (Branch and Bound), e a reta tracejada é a curva de nível de Z nela.'}
      </p>

      <canvas ref={canvasRef} width={400} height={250} className="w-full h-auto"></canvas>
    </div>
  );
};
