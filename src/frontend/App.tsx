import React, { useState } from 'react';
import { Header } from './components/Header';
import { HomePage } from './pages/HomePage';
import { TipoPage } from './pages/TipoPage';
import { EstruturaPage } from './pages/EstruturaPage';
import { DadosPage } from './pages/DadosPage';
import { ResultadoPage } from './pages/ResultadoPage';
import { AppState, Screen, Constraint } from './types';

const App: React.FC = () => {
  const [screen, setScreen] = useState<Screen>('HOME');
  const [tipo, setTipo] = useState<'max' | 'min'>('max');
  const [nVars, setNVars] = useState<number>(2);
  const [nRest, setNRest] = useState<number>(2);
  const [funcZ, setFuncZ] = useState<Record<number, number>>({});
  const [restricoes, setRestricoes] = useState<Constraint[]>([]);
  const [resultado, setResultado] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleNavigate = (s: Screen) => setScreen(s);

  const handleGoBack = () => {
    if (screen === 'RESULTADO') setScreen('DADOS');
    else if (screen === 'DADOS') setScreen('ESTRUTURA');
    else if (screen === 'ESTRUTURA') setScreen('TIPO');
    else if (screen === 'TIPO') setScreen('HOME');
  };

  const initStructures = (vars: number, rests: number) => {
    const newFuncZ = { ...funcZ };
    for (let i = 0; i < vars; i++) newFuncZ[i] = newFuncZ[i] || 0;
    setFuncZ(newFuncZ);

    let newRestricoes = [...restricoes];
    while (newRestricoes.length < rests) {
      const coefs: Record<number, number> = {};
      for (let i = 0; i < vars; i++) coefs[i] = 0;
      newRestricoes.push({ coeficientes: coefs, sinal: '<=', rhs: 0 });
    }
    setRestricoes(newRestricoes.slice(0, rests));
  };

  const handleSolve = async () => {
    setLoading(true);
    try {
      const payload = {
        objective: {
          direction: tipo,
          coefficients: Array.from({ length: nVars }).map((_, i) => funcZ[i] || 0)
        },
        constraints: restricoes.map(r => ({
          coefficients: Array.from({ length: nVars }).map((_, i) => r.coeficientes[i] || 0),
          type: r.sinal,
          rhs: r.rhs
        }))
      };

      const res = await fetch('/api/simplex', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      setResultado(data);
      setScreen('RESULTADO');
    } catch (err) {
      alert('Erro ao comunicar com a API: ' + String(err));
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    switch (screen) {
      case 'HOME':
        return <HomePage onStart={() => setScreen('TIPO')} />;
      case 'TIPO':
        return <TipoPage tipo={tipo} setTipo={setTipo} onContinue={() => setScreen('ESTRUTURA')} />;
      case 'ESTRUTURA':
        return <EstruturaPage 
          tipo={tipo} nVars={nVars} setNVars={setNVars} nRest={nRest} setNRest={setNRest} 
          onContinue={() => {
            initStructures(nVars, nRest);
            setScreen('DADOS');
          }} 
        />;
      case 'DADOS':
        return <DadosPage 
          tipo={tipo} nVars={nVars} nRest={nRest} funcZ={funcZ} setFuncZ={setFuncZ}
          restricoes={restricoes} setRestricoes={setRestricoes} onResolve={handleSolve} loading={loading}
        />;
      case 'RESULTADO':
        return <ResultadoPage 
          resultado={resultado} nVars={nVars} funcZ={funcZ} restricoes={restricoes} 
          onNovoProblema={() => { setResultado(null); setScreen('TIPO'); }} 
        />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#3d332d] font-sans selection:bg-[#df6a45] selection:text-white flex flex-col">
      <Header screen={screen} onNavigate={handleNavigate} onGoBack={handleGoBack} />
      <main className="flex-1 w-full max-w-4xl mx-auto pt-16 pb-20 px-6 flex flex-col justify-center">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
