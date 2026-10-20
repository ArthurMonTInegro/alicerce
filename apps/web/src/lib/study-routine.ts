export const GOALS={
  base:{label:'Construir minha base',tool:'Mapa de fundamentos',path:'/trilha',text:'Entenda a sequência e os pré-requisitos antes de escolher o próximo tema.'},
  faculdade:{label:'Acompanhar a faculdade',tool:'Conceitos em movimento',path:'/visualizacoes',text:'Explore visualizações de algoritmos, estruturas e sistemas para apoiar seus estudos.'},
  projetos:{label:'Construir meus projetos',tool:'Do conceito ao projeto',path:'/projetos',text:'Escolha um desafio com requisitos claros e aplique o que você está aprendendo.'},
} as const;
export interface Routine{goal:keyof typeof GOALS;minutes:15|30|60;days:2|3|5}
export const DEFAULT_ROUTINE:Routine={goal:'base',minutes:30,days:3};
export function readRoutine(raw:string|null):Routine{
  if(!raw)return {...DEFAULT_ROUTINE};
  try{const v:unknown=JSON.parse(raw);if(!v||typeof v!=='object')return {...DEFAULT_ROUTINE};const p=v as Partial<Routine>;
    return{goal:p.goal&&Object.hasOwn(GOALS,p.goal)?p.goal:'base',minutes:[15,30,60].includes(p.minutes??0)?p.minutes!:30,days:[2,3,5].includes(p.days??0)?p.days!:3};
  }catch{return {...DEFAULT_ROUTINE};}
}
export function splitSession(minutes:Routine['minutes'],review:boolean){const first=review?Math.round(minutes/5):Math.round(minutes/6),practice=Math.round(minutes/3);return{first,learn:minutes-first-practice,practice};}
