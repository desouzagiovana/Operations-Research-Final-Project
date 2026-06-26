import React, { useState } from 'react';
import { Header } from './components/Header';
import { HomePage } from './pages/HomePage';
import { TipoPage } from './pages/TipoPage';
import { EstruturaPage } from './pages/EstruturaPage';
import { DadosPage } from './pages/DadosPage';
import { ResultadoPage } from './pages/ResultadoPage';
import { AppState, Screen, Constraint } from './types';
import { parseNumericValue } from './utils/math';

const App: React.FC = () => {
  const [screen, setScreen] = useState<Screen>('HOME');
  const [tipo, setTipo] = useState<'max' | 'min'>('max');
  const [nVars, setNVars] = useState<number | string>(2);
  const [nRest, setNRest] = useState<number | string>(2);
  const [funcZ, setFuncZ] = useState<Record<number, number | string>>({});
  const [restricoes, setRestricoes] = useState<Constraint[]>([]);
  const [resultado, setResultado] = useState<any>(null);
  
  // NOVO: Estado para armazenar o resultado da solução inteira (Branch and Bound)
  const [integerResultado, setIntegerResultado] = useState<any>(null);
  // NOVO: Estado para a solução tabular dual (bônus)
  const [dualResultado, setDualResultado] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleNavigate = (s: Screen) => setScreen(s);

  const handleGoBack = () => {
    if (screen === 'RESULTADO') setScreen('DADOS');
    else if (screen === 'DADOS') setScreen('ESTRUTURA');
    else if (screen === 'ESTRUTURA') setScreen('TIPO');
    else if (screen === 'TIPO') setScreen('HOME');
  };

  const initStructures = (vars: number | string, rests: number | string) => {
    let parsedVars = typeof vars === 'number' ? vars : parseInt(vars.toString()) || 2;
    parsedVars = Math.max(2, Math.min(10, parsedVars));
    let parsedRests = typeof rests === 'number' ? rests : parseInt(rests.toString()) || 2;
    parsedRests = Math.max(1, Math.min(15, parsedRests));

    setNVars(parsedVars);
    setNRest(parsedRests);

    const newFuncZ = { ...funcZ };
    for (let i = 0; i < parsedVars; i++) newFuncZ[i] = newFuncZ[i] !== undefined ? newFuncZ[i] : 0;
    setFuncZ(newFuncZ);

    let newRestricoes = [...restricoes];
    while (newRestricoes.length < parsedRests) {
      const coefs: Record<number, number | string> = {};
      for (let i = 0; i < parsedVars; i++) coefs[i] = 0;
      newRestricoes.push({ coeficientes: coefs, sinal: '<=', rhs: 0 });
    }
    setRestricoes(newRestricoes.slice(0, parsedRests));
  };

  const handleSolve = async (includeDual: boolean = false) => {
    setLoading(true);
    try {
      const varsCount = typeof nVars === 'number' ? nVars : parseInt(nVars.toString()) || 2;
      const payload = {
        objective: {
          direction: tipo,
          coefficients: Array.from({ length: varsCount }).map((_, i) => {
            const val = parseNumericValue(funcZ[i]);
            return isNaN(val) ? 0 : val;
          })
        },
        constraints: restricoes.map(r => ({
          coefficients: Array.from({ length: varsCount }).map((_, i) => {
            const val = parseNumericValue(r.coeficientes[i]);
            return isNaN(val) ? 0 : val;
          }),
          type: r.sinal,
          rhs: (() => {
            const val = parseNumericValue(r.rhs);
            return isNaN(val) ? 0 : val;
          })()
        })),
        includeDual // NOVO: pede ao backend a solução tabular dual
      };

      const res = await fetch('/api/simplex', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });


      const data = await res.json();

      // NOVO: A API agora envia dois objetos distintos. Salvamos cada um em seu próprio estado.
      setResultado(data.continuous);
      setIntegerResultado(data.integer);
      setDualResultado(data.dual || null); // NOVO: solução dual (só vem quando includeDual=true)
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
        const varsCount = typeof nVars === 'number' ? nVars : parseInt(nVars.toString()) || 2;
        const restsCount = typeof nRest === 'number' ? nRest : parseInt(nRest.toString()) || 2;
        return <DadosPage 
          tipo={tipo} nVars={varsCount} nRest={restsCount} funcZ={funcZ} setFuncZ={setFuncZ}
          restricoes={restricoes} setRestricoes={setRestricoes} onResolve={handleSolve} loading={loading}
        />;
      case 'RESULTADO':
        const resVarsCount = typeof nVars === 'number' ? nVars : parseInt(nVars.toString()) || 2;
        return <ResultadoPage
          resultado={resultado}
          integerResultado={integerResultado} // NOVO: Passando a prop
          dualResultado={dualResultado} // NOVO: solução tabular dual
          nVars={resVarsCount}
          funcZ={funcZ}
          restricoes={restricoes}
          onNovoProblema={() => {
            setResultado(null);
            setIntegerResultado(null); // NOVO: Limpando a dica de inteiros ao resetar
            setDualResultado(null); // NOVO: Limpando o dual ao resetar
            setScreen('TIPO');
          }}
          onVoltarEditar={() => setScreen('DADOS')} // NOVO: Volta para edição mantendo os dados
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