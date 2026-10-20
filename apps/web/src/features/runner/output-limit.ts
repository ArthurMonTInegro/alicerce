export const MAX_OUTPUT_CHARS=65536;
export function outputBuffer(){
  let text='';
  return {write(line:string){const value=(text?'\n':'')+line;const left=MAX_OUTPUT_CHARS-text.length;text+=value.slice(0,left);if(value.length>left)throw new Error('Saída limitada a 65536 caracteres. Reduza os logs e tente novamente.');},read(){return text;}};
}
