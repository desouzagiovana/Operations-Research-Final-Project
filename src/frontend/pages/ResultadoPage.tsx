import React from 'react';
import { Badge } from '../components/Badge';
import { SimplexGraph } from '../components/SimplexGraph';

interface ResultadoPageProps {
  resultado: any;
  integerResultado?: any; // <-- Prop opcional adicionada para corrigir o erro do TypeScript
  dualResultado?: any; // <-- Solução tabular dual (bônus)
  nVars: number;
  funcZ: Record<number, number>;
  restricoes: any[]; // ou Constraint[] dependendo de como você importou
  onNovoProblema: () => void;
  onVoltarEditar: () => void; // <-- Volta para a tela de Dados mantendo o problema
}

// Formata número curto (sem casas desnecessárias)
const fmtNum = (v: number) => {
  const r = Math.round(v * 100) / 100;
  return Number.isInteger(r) ? String(r) : r.toFixed(2);
};
// Monta uma combinação linear "c1·v1 + c2·v2 + ..."
const fmtLinear = (coeffs: number[], varName: string) =>
  coeffs.map((c, i) => `${fmtNum(c)}·${varName}${i + 1}`).join(' + ');

export const ResultadoPage: React.FC<ResultadoPageProps> = ({
  resultado,
  integerResultado, // <-- Extraindo a prop aqui
  dualResultado, // <-- Solução dual
  nVars,
  funcZ,
  restricoes,
  onNovoProblema,
  onVoltarEditar
}) => {
  if (!resultado) return null;

  const { status, optimalSolution, optimalValue, iterations, message, hasMultipleSolutions } = resultado;

  const handleDownloadTabela = async () => {
    if (!iterations || iterations.length === 0) return;
    // Carrega a lib só ao baixar, para não pesar o bundle inicial.
    const XLSX = await import('xlsx');
    // Exporta XLSX com números nativos: o valor é guardado como número binário,
    // sem separador decimal no texto, então não há ambiguidade de locale (pt-BR x EUA).
    const aoa: (string | number)[][] = [];
    iterations.forEach((tab: number[][], idx: number) => {
      aoa.push([`Iteração ${idx}`]);
      tab.forEach((row: number[]) => {
        // Arredonda para 4 casas, mas mantém como NÚMERO (não string).
        aoa.push(row.map((c) => Number(Number(c).toFixed(4))));
      });
      aoa.push([]); // linha em branco entre as tabelas
    });

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tableau');
    XLSX.writeFile(wb, 'tabela-simplex.xlsx');
  };

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
        {/* CARD PRINCIPAL: SOLUÇÃO CONTÍNUA */}
        <div className="bg-[#F6EFE6] border border-[#e8dcc8] p-8 rounded-xl text-center shadow-sm mb-6">
          {hasMultipleSolutions && (
            <div className="absolute top-4 right-4 bg-yellow-100 text-yellow-800 text-xs font-bold px-3 py-1 rounded-full border border-yellow-300 shadow-sm animate-pulse">
              ⚠️ Soluções Múltiplas Identificadas
            </div>
          )}
          <h2 className="text-[#8c827a] text-sm font-bold uppercase tracking-widest mb-4">Solução Ótima (Contínua)</h2>
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

        {/* NOVO: CARD DE DICA (SOLUÇÃO INTEIRA - BRANCH AND BOUND) */}
        {integerResultado && integerResultado.hasIntegerSolution && (
          <div className="bg-white border-2 border-[#6b5894]/20 p-6 rounded-xl shadow-sm mb-8 relative overflow-hidden">
            {/* Faixa lateral decorativa */}
            <div className="absolute top-0 left-0 w-1.5 h-full bg-[#6b5894]"></div>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 ml-2">
              <div>
                <h3 className="text-[#6b5894] font-bold text-sm uppercase tracking-widest mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                  Insight: Solução 100% Inteira
                </h3>
                <p className="text-[#8c827a] text-xs md:text-sm max-w-md">
                  Se o problema exigir objetos indivisíveis (ex: pessoas, peças, carros), o algoritmo de <strong>Branch and Bound</strong> sugere esta configuração exata:
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="bg-[#F6EFE6] px-4 py-2 border border-[#e8dcc8] rounded-lg">
                  <span className="text-[#8c827a] text-[10px] uppercase font-bold mr-2">Novo Z</span>
                  <span className="font-serif font-bold text-lg text-[#362724]">{Number(integerResultado.bestZ).toFixed(2)}</span>
                </div>
                {Object.entries(integerResultado.bestIntegerSolution || {}).map(([v, val]) => {
                  if (v.startsWith('x')) {
                    return (
                      <div key={`int-${v}`} className="bg-white px-4 py-2 border border-[#e8dcc8] rounded-lg">
                        <span className="text-[#8c827a] text-[10px] uppercase font-bold mr-2">{v}</span>
                        {/* Solução inteira formatada sem casas decimais */}
                        <span className="font-serif font-bold text-lg text-[#362724]">{Number(val).toFixed(0)}</span>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          </div>
        )}
        
        <SimplexGraph
          nVars={nVars}
          funcZ={funcZ}
          restricoes={restricoes}
          optimalSolution={optimalSolution}
          optimalValue={optimalValue}
          integerSolution={integerResultado && integerResultado.hasIntegerSolution ? integerResultado.bestIntegerSolution : undefined}
        />

        <div className="bg-white p-6 border border-[#e8dcc8] rounded-xl shadow-sm mt-8">
          <div className="flex items-center justify-between gap-4 mb-6 border-b border-[#e8dcc8] pb-2">
            <h3 className="text-lg font-bold text-[#362724]">Passo a Passo (Tableau)</h3>
            <button
              onClick={handleDownloadTabela}
              className="shrink-0 text-xs font-medium border border-[#e8dcc8] bg-transparent hover:bg-[#F6EFE6] px-3 py-1.5 rounded-full transition-colors flex items-center gap-1.5"
              title="Baixar tabela (Excel .xlsx)"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
              Baixar tabela
            </button>
          </div>
          {iterations && iterations.map((tab: number[][], idx: number) => (
            <div key={`tab-${idx}`} className="mb-8 overflow-x-auto">
              <h4 className="text-sm font-bold text-[#8c827a] mb-2 uppercase tracking-wide">Iteração {idx}</h4>
              <table className="w-full border-collapse text-sm">
                <tbody>
                  {tab.map((r: number[], i: number) => (
                    <tr key={`r-${i}`} className={i === tab.length - 1 ? 'font-bold bg-[#F6EFE6]' : 'bg-white'}>
                      {r.map((c: number, j: number) => (
                        <td key={`c-${j}`} className="p-2 border border-[#e8dcc8] text-center">{Number(c).toFixed(2)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        {/* ===== SOLUÇÃO TABULAR DUAL (bônus) ===== */}
        {dualResultado && dualResultado.problem && dualResultado.result && (
          <div className="bg-white p-6 border-2 border-[#6b5894]/30 rounded-xl shadow-sm mt-8">
            <h3 className="text-lg font-bold text-[#6b5894] mb-1">Solução Dual (Tabular)</h3>
            <p className="text-xs text-[#8c827a] mb-4">
              Problema dual montado a partir do primal. Pela dualidade forte, o valor ótimo do dual coincide com o do primal.
            </p>

            {/* Formulação do dual */}
            <div className="bg-[#F6EFE6] border border-[#e8dcc8] rounded-lg p-4 mb-5 text-sm">
              <div className="font-serif">
                <span className="font-bold text-[#6b5894]">
                  {dualResultado.problem.objective.direction === 'max' ? 'Max' : 'Min'} W ={' '}
                </span>
                {fmtLinear(dualResultado.problem.objective.coefficients, 'y')}
              </div>
              <div className="mt-2 mb-1 text-[#8c827a] text-[11px] uppercase font-bold tracking-wide">Sujeito a:</div>
              {dualResultado.problem.constraints.map((c: any, i: number) => (
                <div key={`dc-${i}`} className="font-serif">
                  {fmtLinear(c.coefficients, 'y')} {c.type} {fmtNum(c.rhs)}
                </div>
              ))}
              <div className="mt-1 text-xs italic text-[#8c827a]">y<sub>i</sub> ≥ 0</div>
            </div>

            {dualResultado.result.status === 'optimal' ? (
              <>
                <div className="flex flex-wrap items-center gap-3 mb-5">
                  <div className="bg-[#6b5894] text-white px-4 py-2 rounded-lg">
                    <span className="text-[10px] uppercase font-bold mr-2 opacity-80">W ótimo</span>
                    <span className="font-serif font-bold text-lg">{Number(dualResultado.result.optimalValue).toFixed(2)}</span>
                  </div>
                  {Object.entries(dualResultado.result.optimalSolution || {}).map(([v, val]) => (
                    v.startsWith('x') ? (
                      <div key={`dy-${v}`} className="bg-white px-4 py-2 border border-[#e8dcc8] rounded-lg">
                        <span className="text-[#8c827a] text-[10px] uppercase font-bold mr-2">{v.replace('x', 'y')}</span>
                        <span className="font-serif font-bold text-lg text-[#362724]">{Number(val).toFixed(2)}</span>
                      </div>
                    ) : null
                  ))}
                </div>

                {dualResultado.result.iterations && dualResultado.result.iterations.map((tab: number[][], idx: number) => (
                  <div key={`dtab-${idx}`} className="mb-6 overflow-x-auto">
                    <h4 className="text-sm font-bold text-[#8c827a] mb-2 uppercase tracking-wide">Iteração {idx}</h4>
                    <table className="w-full border-collapse text-sm">
                      <tbody>
                        {tab.map((r: number[], i: number) => (
                          <tr key={`dr-${i}`} className={i === tab.length - 1 ? 'font-bold bg-[#6b5894]/10' : 'bg-white'}>
                            {r.map((cell: number, j: number) => (
                              <td key={`dcell-${j}`} className="p-2 border border-[#e8dcc8] text-center">{Number(cell).toFixed(2)}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 p-4 rounded-lg text-sm">
                {dualResultado.result.message || 'O dual não pôde ser resolvido.'}
              </div>
            )}
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4 mb-2">
        <button
          onClick={onVoltarEditar}
          className="text-sm font-medium border border-[#e8dcc8] bg-transparent hover:bg-[#F6EFE6] px-4 py-2 rounded-full transition-colors flex items-center gap-1.5"
          title="Voltar e editar o problema"
        >
          ← Editar problema
        </button>
        <Badge text="Resultado Final" />
      </div>
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