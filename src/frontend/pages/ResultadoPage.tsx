import React from 'react';
import { Badge } from '../components/Badge';
import { SimplexGraph } from '../components/SimplexGraph';

interface ResultadoPageProps {
  resultado: any;
  nVars: number;
  funcZ: Record<number, number>;
  restricoes: any[];
  onNovoProblema: () => void;
}

export const ResultadoPage: React.FC<ResultadoPageProps> = ({ resultado, nVars, funcZ, restricoes, onNovoProblema }) => {
  if (!resultado) return null;

  const { status, optimalSolution, optimalValue, iterations, message } = resultado;

  let content = null;
  if (status === 'unbounded') {
    content = (
      <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-xl text-center shadow-sm">
        <h2 className="text-2xl font-bold mb-2">Problema Ilimitado (Unbounded Region)</h2>
        <p>{message || 'Não é possível encontrar uma solução finita, pois a região viável é aberta na direção do objetivo.'}</p>
      </div>
    );
  } else if (status === 'infeasible') {
    content = (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 p-6 rounded-xl text-center shadow-sm">
        <h2 className="text-2xl font-bold mb-2">Problema Inviável (Infeasible)</h2>
        <p>{message || 'Não existe região viável que satisfaça todas as restrições simultaneamente.'}</p>
      </div>
    );
  } else {
    content = (
      <>
        <div className="bg-[#F6EFE6] border border-[#e8dcc8] p-8 rounded-xl text-center shadow-sm mb-8">
          <h2 className="text-[#8c827a] text-sm font-bold uppercase tracking-widest mb-4">Solução Ótima Encontrada</h2>
          <div className="text-5xl font-serif font-bold text-[#df6a45] mb-8">
            Z = {Number(optimalValue).toFixed(2)}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 justify-center">
            {Object.entries(optimalSolution || {}).map(([v, val]) => {
              if (v.startsWith('x')) {
                return (
                  <div key={v} className="bg-white p-4 border border-[#e8dcc8] rounded-xl text-center shadow-sm">
                    <div className="text-[#8c827a] font-bold text-sm mb-1">{v}</div>
                    <div className="text-2xl font-serif text-[#362724]">{Number(val).toFixed(2)}</div>
                  </div>
                );
              }
              return null;
            })}
          </div>
        </div>
        
        <SimplexGraph 
          nVars={nVars} 
          funcZ={funcZ} 
          restricoes={restricoes} 
          optimalSolution={optimalSolution} 
          optimalValue={optimalValue} 
        />

        <div className="bg-white p-6 border border-[#e8dcc8] rounded-xl shadow-sm">
          <h3 className="text-lg font-bold text-[#362724] mb-6 border-b border-[#e8dcc8] pb-2">Passo a Passo (Tableau)</h3>
          {iterations && iterations.map((tab: number[][], idx: number) => (
            <div key={`tab-${idx}`} className="mb-8 overflow-x-auto">
              <h4 className="text-sm font-bold text-[#8c827a] mb-2 uppercase tracking-wide">Iteração {idx}</h4>
              <table className="w-full border-collapse text-sm">
                <tbody>
                  {tab.map((r, i) => (
                    <tr key={`r-${i}`} className={i === tab.length - 1 ? 'font-bold bg-[#F6EFE6]' : 'bg-white'}>
                      {r.map((c, j) => (
                        <td key={`c-${j}`} className="p-2 border border-[#e8dcc8] text-center">{Number(c).toFixed(2)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <Badge text="Resultado Final" />
      {content}
      <div className="mt-8 flex justify-center">
        <button 
          onClick={onNovoProblema}
          className="text-[#df6a45] border-2 border-[#df6a45] hover:bg-[#df6a45] hover:text-white px-6 py-2 rounded-lg font-medium transition-colors"
        >
          Resolver Novo Problema
        </button>
      </div>
    </>
  );
};
