import {useHead} from '../lib/head.tsx';
import {Link} from '../lib/router.tsx';
import {STATIC_SITE} from '../lib/base.ts';
export function PremiumGate({title,summary}:{title:string;summary:string}){
 useHead(title+' · Premium',summary);
 return <div className="container prose"><p className="eyebrow">CONTINUE SUA EVOLUÇÃO · PREMIUM</p><h1>{title}</h1><p className="lead">{summary}</p><div className="card"><h2>Seu próximo passo está na trilha completa.</h2><p>A trilha gratuita ensina computação e lógica até funções. O Premium continua com Python, estruturas de dados, algoritmos, web e os demais níveis.</p><p>Esta lição e seus exercícios exigem uma assinatura ativa. Concluir pré-requisitos ou importar progresso não libera conteúdo Premium.</p><Link className="btn accent" to="/planos">Conhecer o Premium</Link> <Link className="btn" to="/nivel/n1">Continuar na trilha gratuita</Link>{!STATIC_SITE&&<p>Já possui acesso? <Link to="/conta">Entre na sua conta</Link>.</p>}<p className="small muted">O Premium ainda não está à venda. {STATIC_SITE?'Esta demonstração oferece o percurso gratuito e a apresentação dos próximos níveis.':''} Seu progresso anterior é preservado.</p></div></div>;
}
