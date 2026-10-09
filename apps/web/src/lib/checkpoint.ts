export function checkpoint(version:number){
  const price=12+version*3, count=3, discount=5+version;
  return [
    {id:'budget',skill:'logica-operadores',title:'Do enunciado para uma expressão',prompt:`Uma compra tem ${count} itens de R$ ${price} e um desconto único de R$ ${discount} no total. Quanto será pago? Responda só com o número.`,answer:String(count*price-discount),explain:`Primeiro multiplique os itens: ${count} × ${price}. Depois desconte ${discount} uma única vez.`,review:'/modulo/m1-2'},
    {id:'condition',skill:'logica-operadores',title:'Uma decisão com duas condições',prompt:`Um sistema libera acesso se créditos >= ${price} E cadastro_confirmado for verdadeiro. A pessoa tem ${price+2} créditos, mas o cadastro não foi confirmado. O acesso será liberado? Responda sim ou não.`,answer:'nao',explain:'A operação E exige que as duas condições sejam verdadeiras. Crédito suficiente não substitui a confirmação.',review:'/modulo/m1-3'},
    {id:'trace',skill:'logica-variaveis',title:'Acompanhar mudanças de estado',prompt:`Sem executar: saldo = ${price}; saldo = saldo + 4; saldo = saldo - ${discount}. Qual é o valor final de saldo? Responda só com o número.`,answer:String(price+4-discount),explain:`A atribuição atualiza o valor anterior: ${price} + 4 − ${discount}.`,review:'/modulo/m1-2'},
  ];
}
export const checkAnswer=(answer:string,expected:string)=>answer.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(',','.').replace(/\.0+$/,'')===expected;
