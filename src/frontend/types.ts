export type Screen = 'HOME' | 'TIPO' | 'ESTRUTURA' | 'DADOS' | 'RESULTADO';

export interface Constraint {
  coeficientes: Record<number, number | string>;
  sinal: string;
  rhs: number | string;
}

export interface AppState {
  screen: Screen;
  tipo: 'max' | 'min';
  nVars: number;
  nRest: number;
  funcZ: Record<number, number | string>;
  restricoes: Constraint[];
  resultado: any;
  loading: boolean;
}

