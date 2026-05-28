import React from 'react';
import { Screen } from '../types';

interface HeaderProps {
  screen: Screen;
  onNavigate: (screen: Screen) => void;
  onGoBack: () => void;
}

export const Header: React.FC<HeaderProps> = ({ screen, onNavigate, onGoBack }) => {
  const isHome = screen === 'HOME';

  return (
    <header className={`flex items-center justify-between py-6 px-10 ${!isHome ? 'border-b border-[#e8dcc8]/50' : ''}`}>
      <div className="flex items-center gap-6">
        <div 
          className="flex items-center gap-2 bg-[#362724] text-[#FDFBF7] px-3 py-1.5 rounded text-sm font-semibold tracking-wider cursor-pointer" 
          onClick={() => onNavigate('HOME')}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7"></path></svg>
          Ripa
        </div>
        {!isHome && (
          <nav className="hidden md:flex gap-4 text-sm text-[#8c827a] font-medium">
            <span className={screen === 'TIPO' ? 'text-[#df6a45]' : ''}>Tipo</span> •
            <span className={screen === 'ESTRUTURA' ? 'text-[#df6a45]' : ''}>Estrutura</span> •
            <span className={screen === 'DADOS' ? 'text-[#df6a45]' : ''}>Dados</span> •
            <span className={screen === 'RESULTADO' ? 'text-[#df6a45]' : ''}>Resultado</span>
          </nav>
        )}
      </div>
      {(!isHome && screen !== 'TIPO') ? (
        <button 
          onClick={onGoBack} 
          className="text-sm font-medium border border-[#e8dcc8] bg-transparent hover:bg-[#F6EFE6] px-4 py-2 rounded-full transition-colors"
        >
          ← Voltar
        </button>
      ) : <div />}
    </header>
  );
};
