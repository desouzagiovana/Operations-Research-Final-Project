import React from 'react';
import { Badge } from '../components/Badge';

interface TipoPageProps {
  tipo: 'max' | 'min';
  setTipo: (tipo: 'max' | 'min') => void;
  onContinue: () => void;
}

export const TipoPage: React.FC<TipoPageProps> = ({ tipo, setTipo, onContinue }) => {
  return (
    <>
      <Badge text="Função Objetivo" />
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-medium tracking-tight text-[#362724] mb-4">
          Qual tipo de <span className="font-serif italic text-[#df6a45] font-bold">problema</span><br/>você quer resolver?
        </h1>
        <p className="text-[#8c827a] text-sm md:text-base">Escolha o tipo de função objetivo para começar.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
        <button 
          className={`tipo-card text-left p-8 rounded-xl border-2 transition-all ${tipo === 'max' ? 'bg-[#F6EFE6] border-[#df6a45] shadow-sm' : 'bg-white border-[#e8dcc8] hover:border-[#df6a45]/50'}`} 
          onClick={() => setTipo('max')}
        >
          <div className="w-10 h-10 rounded-lg bg-[#df6a45]/10 flex items-center justify-center mb-4 text-[#df6a45]">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
          </div>
          <h3 className="text-xl font-semibold mb-2 text-[#362724]">Maximização</h3>
          <p className="text-[#8c827a] text-sm leading-relaxed">Quando você quer obter o maior valor possível — lucro, produção ou rendimento.</p>
        </button>

        <button 
          className={`tipo-card text-left p-8 rounded-xl border-2 transition-all ${tipo === 'min' ? 'bg-[#F6EFE6] border-[#6b5894] shadow-sm' : 'bg-white border-[#e8dcc8] hover:border-[#6b5894]/50'}`} 
          onClick={() => setTipo('min')}
        >
          <div className="w-10 h-10 rounded-lg bg-[#6b5894]/10 flex items-center justify-center mb-4 text-[#6b5894]">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"></path></svg>
          </div>
          <h3 className="text-xl font-semibold mb-2 text-[#362724]">Minimização</h3>
          <p className="text-[#8c827a] text-sm leading-relaxed">Quando o objetivo é reduzir custos, desperdícios ou tempo ao mínimo possível.</p>
        </button>
      </div>
      
      <div className="flex justify-center mt-12">
        <button 
          onClick={onContinue}
          className="bg-[#df6a45] hover:bg-[#c25938] text-white px-8 py-3 rounded-lg font-medium shadow-lg shadow-[#df6a45]/20 transition-all flex items-center gap-2"
        >
          Continuar <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
        </button>
      </div>
    </>
  );
};
