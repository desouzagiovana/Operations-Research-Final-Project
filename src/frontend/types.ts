export type Screen = 'HOME' | 'TIPO' | 'ESTRUTURA' | 'DADOS' | 'RESULTADO';

export interface Constraint {
  coeficientes: Record<number, number>;
  sinal: string;
  rhs: number;
}

export interface AppState {
  screen: Screen;
  tipo: 'max' | 'min';
  nVars: number;
  nRest: number;
  funcZ: Record<number, number>;
  restricoes: Constraint[];
  resultado: any;
  loading: boolean;
}
