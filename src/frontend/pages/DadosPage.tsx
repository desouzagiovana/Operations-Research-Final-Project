import React from 'react';
import { Badge } from '../components/Badge';
import { Constraint } from '../types';
import { NumericInput } from '../components/NumericInput';

interface DadosPageProps {
  tipo: 'max' | 'min';
  nVars: number;
  nRest: number;
  funcZ: Record<number, number | string>;
  setFuncZ: (fn: (prev: Record<number, number | string>) => Record<number, number | string>) => void;
  restricoes: Constraint[];
  setRestricoes: (fn: (prev: Constraint[]) => Constraint[]) => void;
  onResolve: (includeDual?: boolean) => void;
  loading: boolean;
}

export const DadosPage: React.FC<DadosPageProps> = ({ tipo, nVars, nRest, funcZ, setFuncZ, restricoes, setRestricoes, onResolve, loading }) => {
  const handleZChange = (i: number, val: string) => {
    setFuncZ(prev => ({ ...prev, [i]: val }));
  };

  const handleRestChange = (rIdx: number, cIdx: number, val: string) => {
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

  const handleRestRhs = (rIdx: number, val: string) => {
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
                <NumericInput 
                  value={funcZ[i] !== undefined ? funcZ[i] : 0}
                  onChange={(val) => handleZChange(i, val)}
                  className="w-20"
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
                    <NumericInput 
                      value={r.coeficientes[j] !== undefined ? r.coeficientes[j] : 0}
                      onChange={(val) => handleRestChange(i, j, val)}
                      className="w-20"
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
              <NumericInput 
                value={r.rhs !== undefined ? r.rhs : 0}
                onChange={(val) => handleRestRhs(i, val)}
                className="w-24"
              />
            </div>
          ))}
          <div className="mt-4 text-sm text-[#8c827a] italic">
            x<sub>i</sub> ≥ 0 para todo i
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
          <button
            onClick={() => onResolve(false)}
            className={`bg-[#362724] hover:bg-[#201715] text-white px-10 py-4 rounded-lg font-medium shadow-xl transition-all flex items-center gap-3 ${loading ? 'opacity-70 cursor-wait' : ''}`}
            disabled={loading}
          >
            {loading ? 'Resolvendo...' : 'Resolver Simplex'}
          </button>
          <button
            onClick={() => onResolve(true)}
            className={`bg-white border-2 border-[#6b5894] text-[#6b5894] hover:bg-[#6b5894] hover:text-white px-10 py-4 rounded-lg font-medium shadow-sm transition-all flex items-center gap-3 ${loading ? 'opacity-70 cursor-wait' : ''}`}
            disabled={loading}
            title="Resolve o problem e também monta e resolve o problema dual (forma tabular)"
          >
            {loading ? 'Resolvendo...' : 'Resolver Dual Simplex'}
          </button>
        </div>
      </div>
    </>
  );
};

