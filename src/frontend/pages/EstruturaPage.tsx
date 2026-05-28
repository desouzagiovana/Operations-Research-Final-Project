import React from 'react';
import { Badge } from '../components/Badge';

interface EstruturaPageProps {
  tipo: 'max' | 'min';
  nVars: number;
  setNVars: (v: number) => void;
  nRest: number;
  setNRest: (r: number) => void;
  onContinue: () => void;
}

export const EstruturaPage: React.FC<EstruturaPageProps> = ({ tipo, nVars, setNVars, nRest, setNRest, onContinue }) => {
  return (
    <>
      <Badge text={tipo === 'max' ? 'Maximização' : 'Minimização'} />
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-medium tracking-tight text-[#362724] mb-4">
          Estrutura do <span className="font-serif italic text-[#df6a45] font-bold">Problema</span>
        </h1>
        <p className="text-[#8c827a] text-sm md:text-base">Informe quantas variáveis e restrições para a <strong className="text-[#362724]">{tipo === 'max' ? 'maximização' : 'minimização'}</strong>.</p>
      </div>

      <div className="flex flex-col sm:flex-row justify-center gap-6 max-w-xl mx-auto">
        <div className="bg-[#F6EFE6] border border-[#e8dcc8] p-6 rounded-xl flex-1 text-center shadow-sm">
          <div className="w-8 h-8 mx-auto rounded bg-[#df6a45]/10 flex items-center justify-center mb-3 text-[#df6a45]">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"></path></svg>
          </div>
          <label className="block text-xs font-bold tracking-widest uppercase text-[#8c827a] mb-2">Variáveis</label>
          <input 
            type="number" 
            className="w-full text-center text-xl p-3 border border-[#e8dcc8] rounded bg-white text-[#362724] outline-none focus:border-[#df6a45]" 
            value={nVars} 
            min={2} max={10} 
            onChange={(e) => setNVars(parseInt(e.target.value) || 2)}
          />
          <p className="text-[10px] text-[#8c827a] mt-2">Entre 2 e 10 variáveis</p>
        </div>

        <div className="bg-[#F6EFE6] border border-[#e8dcc8] p-6 rounded-xl flex-1 text-center shadow-sm">
          <div className="w-8 h-8 mx-auto rounded bg-[#6b5894]/10 flex items-center justify-center mb-3 text-[#6b5894]">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path></svg>
          </div>
          <label className="block text-xs font-bold tracking-widest uppercase text-[#8c827a] mb-2">Restrições</label>
          <input 
            type="number" 
            className="w-full text-center text-xl p-3 border border-[#e8dcc8] rounded bg-white text-[#362724] outline-none focus:border-[#6b5894]" 
            value={nRest} 
            min={1} max={15} 
            onChange={(e) => setNRest(parseInt(e.target.value) || 1)}
          />
          <p className="text-[10px] text-[#8c827a] mt-2">Entre 1 e 15 restrições</p>
        </div>
      </div>
      
      <div className="flex justify-center mt-10">
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
