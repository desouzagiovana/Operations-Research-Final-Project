import React, { useEffect, useRef } from 'react';
import { Constraint } from '../types';

interface SimplexGraphProps {
  nVars: number;
  funcZ: Record<number, number>;
  restricoes: Constraint[];
  optimalSolution: Record<string, number>;
  optimalValue: number;
}

export const SimplexGraph: React.FC<SimplexGraphProps> = ({ nVars, funcZ, restricoes, optimalSolution, optimalValue }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (nVars !== 2 || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const TOL = 1e-9;
    const W = canvas.width;
    const H = canvas.height;
    const pad = { l: 48, r: 24, t: 24, b: 48 };
    const pw = W - pad.l - pad.r;
    const ph = H - pad.t - pad.b;

    // Determine axis limits
    const sol = optimalSolution;
    let xMax = Math.max(10, (sol.x1 || 0) * 1.5);
    let yMax = Math.max(10, (sol.x2 || 0) * 1.5);

    restricoes.forEach(r => {
      const a = parseFloat(r.coeficientes[0] as any || 0);
      const b = parseFloat(r.coeficientes[1] as any || 0);
      const c = parseFloat(r.rhs as any || 0);
      if (a > TOL) xMax = Math.max(xMax, c / a * 1.3);
      if (b > TOL) yMax = Math.max(yMax, c / b * 1.3);
    });

    const tx = (x: number) => pad.l + (x / xMax) * pw;
    const ty = (y: number) => pad.t + (1 - y / yMax) * ph;

    // Clear
    ctx.clearRect(0, 0, W, H);

    // Background for the chart area
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

    // Constraint lines
    const colors = ["#6b5894", "#df6a45", "#10b981", "#f59e0b", "#ef4444", "#ec4899"];
    const zCoefs = Object.values(funcZ);

    restricoes.forEach((r, idx) => {
      const a = parseFloat(r.coeficientes[0] as any || 0);
      const b = parseFloat(r.coeficientes[1] as any || 0);
      const c = parseFloat(r.rhs as any || 0);

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
      ctx.font = "11px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`R${idx + 1}`, pad.l + pw - 24, pad.t + 14 + idx * 14);
      ctx.globalAlpha = 1;
    });

    // Objective at optimal
    const aZ = parseFloat(zCoefs[0] as any || 0);
    const bZ = parseFloat(zCoefs[1] as any || 0);
    const zVal = optimalValue || 0;
    if (Math.abs(bZ) > TOL) {
      ctx.strokeStyle = "#362724";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      ctx.globalAlpha = 0.9;
      const x0 = 0, y0 = zVal / bZ;
      const x1 = xMax, y1 = (zVal - aZ * xMax) / bZ;
      ctx.beginPath(); ctx.moveTo(tx(x0), ty(y0)); ctx.lineTo(tx(x1), ty(y1)); ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }

    // Optimal point
    const ox = sol.x1 || 0;
    const oy = sol.x2 || 0;
    
    // Glow
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

    // Label optimal
    ctx.fillStyle = "#362724";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`(${ox.toFixed(2)}, ${oy.toFixed(2)})`, tx(ox) + 10, ty(oy) - 8);

  }, [nVars, funcZ, restricoes, optimalSolution, optimalValue]);

  if (nVars !== 2) return null;

  return (
    <div className="mb-10 p-6 bg-white border border-[#e8dcc8] rounded-xl shadow-sm">
      <h3 className="text-lg font-bold text-[#362724] mb-4">Gráfico da Região Viável</h3>
      <canvas ref={canvasRef} width={400} height={250} className="w-full h-auto"></canvas>
    </div>
  );
};
