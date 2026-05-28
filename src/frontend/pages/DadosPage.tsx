import React from 'react';
import { Badge } from '../components/Badge';
import { Constraint } from '../types';

interface DadosPageProps {
  tipo: 'max' | 'min';
  nVars: number;
  nRest: number;
  funcZ: Record<number, number>;
  setFuncZ: (fn: (prev: Record<number, number>) => Record<number, number>) => void;
  restricoes: Constraint[];
  setRestricoes: (fn: (prev: Constraint[]) => Constraint[]) => void;
  onResolve: () => void;
  loading: boolean;
}

export const DadosPage: React.FC<DadosPageProps> = ({ tipo, nVars, nRest, funcZ, setFuncZ, restricoes, setRestricoes, onResolve, loading }) => {
  const handleZChange = (i: number, val: number) => {
    setFuncZ(prev => ({ ...prev, [i]: val }));
  };

  const handleRestChange = (rIdx: number, cIdx: number, val: number) => {
    setRestricoes(prev => {
      const copy = [...prev];
      copy[rIdx].coeficientes[cIdx] = val;
      return copy;
    });
  };

  const handleRestSinal = (rIdx: number, val: string) => {
    setRestricoes(prev => {
      const copy = [...prev];
      copy[rIdx].sinal = val;
      return copy;
    });
  };

  const handleRestRhs = (rIdx: number, val: number) => {
    setRestricoes(prev => {
      const copy = [...prev];
      copy[rIdx].rhs = val;
      return copy;
    });
  };

  return (
    <>
      <Badge text="Inserção de Dados" />
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-medium tracking-tight text-[#362724] mb-3">
          Defina os coeficientes do <span className="font-serif italic text-[#df6a45] font-bold">Problema</span>
        </h1>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="bg-[#F6EFE6] border border-[#e8dcc8] p-6 rounded-xl mb-8 shadow-sm">
          <h3 className="text-sm font-bold tracking-widest uppercase text-[#8c827a] mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#df6a45]"></span> Função Objetivo ({tipo === 'max' ? 'Max' : 'Min'})
          </h3>
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-serif italic text-xl font-bold text-[#df6a45]">Z = </span>
            {Array.from({ length: nVars }).map((_, i) => (
              <div key={`z-${i}`} className="flex items-center gap-2">
                <input 
                  type="number" 
                  className="w-20 p-2 border border-[#e8dcc8] rounded bg-white text-center focus:border-[#df6a45] outline-none" 
                  value={funcZ[i] || 0}
                  onChange={(e) => handleZChange(i, parseFloat(e.target.value) || 0)}
                />
                <span className="font-serif italic text-lg">x<sub>{i + 1}</sub></span>
                {i < nVars - 1 && <span className="text-[#8c827a] font-medium">+</span>}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#F6EFE6] border border-[#e8dcc8] p-6 rounded-xl shadow-sm mb-8">
          <h3 className="text-sm font-bold tracking-widest uppercase text-[#8c827a] mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#6b5894]"></span> Restrições Sujeito a:
          </h3>
          {restricoes.map((r, i) => (
            <div key={`r-${i}`} className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-xl border border-[#e8dcc8] mb-4">
              <div className="text-sm font-bold text-[#8c827a] w-8">R{i + 1}</div>
              <div className="flex flex-wrap items-center gap-3">
                {Array.from({ length: nVars }).map((_, j) => (
                  <div key={`rc-${i}-${j}`} className="flex items-center gap-2">
                    <input 
                      type="number" 
                      className="w-20 p-2 border border-[#e8dcc8] rounded bg-white text-center focus:border-[#df6a45] outline-none" 
                      value={r.coeficientes[j] || 0}
                      onChange={(e) => handleRestChange(i, j, parseFloat(e.target.value) || 0)}
                    />
                    <span className="font-serif italic text-lg">x<sub>{j + 1}</sub></span>
                    {j < nVars - 1 && <span className="text-[#8c827a] font-medium">+</span>}
                  </div>
                ))}
              </div>
              <select 
                className="p-2 border border-[#e8dcc8] rounded bg-[#FDFBF7] outline-none" 
                value={r.sinal}
                onChange={(e) => handleRestSinal(i, e.target.value)}
              >
                <option value="<=">≤</option>
                <option value=">=">≥</option>
                <option value="=">=</option>
              </select>
              <input 
                type="number" 
                className="w-24 p-2 border border-[#e8dcc8] rounded bg-white text-center focus:border-[#df6a45] outline-none" 
                value={r.rhs || 0}
                onChange={(e) => handleRestRhs(i, parseFloat(e.target.value) || 0)}
              />
            </div>
          ))}
          <div className="mt-4 text-sm text-[#8c827a] italic">
            x<sub>i</sub> ≥ 0 para todo i
          </div>
        </div>
        
        <div className="flex justify-center">
          <button 
            onClick={onResolve}
            className={`bg-[#362724] hover:bg-[#201715] text-white px-10 py-4 rounded-lg font-medium shadow-xl transition-all flex items-center gap-3 ${loading ? 'opacity-70 cursor-wait' : ''}`}
            disabled={loading}
          >
            {loading ? 'Resolvendo...' : 'Resolver Simplex'}
          </button>
        </div>
      </div>
    </>
  );
};
