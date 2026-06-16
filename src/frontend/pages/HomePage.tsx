import React from 'react';
import { HomeBadge } from '../components/Badge';

export const HomePage: React.FC<{ onStart: () => void }> = ({ onStart }) => {
  return (
    <div className="flex flex-col items-center text-center mt-[-40px]">
      <HomeBadge text="PROGRAMAÇÃO LINEAR" />
      
      {/* Linha colorida */}
      <div className="flex w-full max-w-[400px] h-1 rounded-full overflow-hidden mb-12 opacity-80">
        <div className="flex-1 bg-[#362724]"></div>
        <div className="flex-1 bg-[#8c827a]"></div>
        <div className="flex-1 bg-[#df6a45]"></div>
        <div className="flex-1 bg-[#6b5894]"></div>
      </div>

      {/* Logo Gigante com Fundo Oval */}
      <div className="relative mb-8 inline-block">
        <div className="absolute inset-0 bg-[#f2ebd9] rounded-[100%] scale-150 opacity-40 blur-md"></div>
        <h1 className="relative text-8xl md:text-[140px] font-serif font-bold tracking-tight leading-none">
          <span className="text-[#df6a45]">R</span><span className="text-[#362724]">ipa</span>
        </h1>
      </div>

      <p className="text-[#8c827a] text-lg max-w-[420px] mb-10 leading-relaxed">
        Resolva problemas de <strong className="text-[#6b5894] font-semibold">Programação Linear</strong> de forma simples e rápida, pelo método Simplex.
      </p>

      <button 
        onClick={onStart}
        className="bg-[#df6a45] hover:bg-[#c25938] text-white px-8 py-3.5 rounded-lg font-medium shadow-lg shadow-[#df6a45]/20 transition-all flex items-center gap-2 mb-16"
      >
        Começar agora <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
      </button>

      {/* Rodapé da Home */}
      <div className="flex items-center justify-center gap-8 md:gap-16 text-center border-t border-[#e8dcc8]/50 pt-8 w-full max-w-[500px]">
        <div>
          <div className="font-serif font-bold text-xl text-[#362724]">Simplex</div>
          <div className="text-[10px] tracking-widest font-bold uppercase text-[#8c827a] mt-1">MÉTODO</div>
        </div>
        <div className="w-px h-10 bg-[#e8dcc8]/80"></div>
        <div>
          <div className="font-serif font-bold text-xl text-[#362724]">∞</div>
          <div className="text-[10px] tracking-widest font-bold uppercase text-[#8c827a] mt-1">VARIÁVEIS</div>
        </div>
        <div className="w-px h-10 bg-[#e8dcc8]/80"></div>
        <div>
          <div className="font-serif font-bold text-xl text-[#362724]">Livre</div>
          <div className="text-[10px] tracking-widest font-bold uppercase text-[#8c827a] mt-1">ACESSO</div>
        </div>
      </div>
    </div>
  );
};
