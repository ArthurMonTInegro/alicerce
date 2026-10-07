import { useHead } from '../lib/head.tsx';
import { Link } from '../lib/router.tsx';

export function Privacidade() {
  useHead('Privacidade', 'Que dados a Alicerce guarda, onde, por quanto tempo e como você os exporta ou apaga.');
  return (
    <div className="container prose" style={{ maxWidth: '72ch' }}>
      <p className="eyebrow">Privacidade · privacy</p>
      <h1>Seus dados</h1>
      <p className="lead">Guardamos o mínimo para a plataforma funcionar, e você controla tudo.</p>

      <h2>Sem conta</h2>
      <p>
        Seu progresso (exercícios tentados, lições concluídas, cartões de revisão, rascunhos de código e respostas do diagnóstico) fica apenas no armazenamento local do seu navegador (<span lang="en">localStorage</span>) e não é enviado ao servidor. O código que você executa roda no próprio navegador.
      </p>

      <h2>Com conta</h2>
      <ul>
        <li>Guardamos e-mail, nome (opcional), um resumo criptográfico da senha (scrypt com sal, nunca a senha em si) e uma cópia do seu progresso para sincronizar entre aparelhos.</li>
        <li>Guardamos também o plano da conta (gratuito ou premium), até quando ele vale, o histórico de mudanças de plano e quantas perguntas você fez ao tutor com IA em cada dia, para aplicar o limite diário. Quando houver cobrança, os dados do cartão vão ficar só com o provedor de pagamento, nunca na Alicerce.</li>
        <li>A sessão usa um cookie <span lang="en">HttpOnly</span>, <span lang="en">Secure</span> e <span lang="en">SameSite=Lax</span>; no servidor fica só o hash do token.</li>
        <li>
          Você pode excluir a conta a qualquer momento em <Link to="/conta">Conta</Link>; isso apaga os dados do servidor imediatamente.
        </li>
      </ul>

      <h2>Tutor</h2>
      <p>
        Quando o tutor com IA está ativado no servidor, sua pergunta, o enunciado do exercício, seu código e a mensagem de erro são enviados ao provedor de IA (Anthropic) apenas para gerar a resposta. Não envie dados pessoais nas perguntas. Quando a IA não está ativada, quando você não tem conta ou quando o limite diário acaba, as pistas são geradas pelo próprio servidor da Alicerce: a pergunta e o código chegam ao servidor só para gerar a resposta e não são guardados. Na versão de demonstração, sem servidor, o tutor roda no navegador e nada é enviado.
      </p>

      <h2>O que não fazemos</h2>
      <ul>
        <li>Não usamos anúncios, rastreadores ou análise de terceiros.</li>
        <li>Não vendemos nem compartilhamos dados.</li>
        <li>Não carregamos fontes nem scripts de outros domínios.</li>
      </ul>

      <h2>Exportar e apagar</h2>
      <p>
        Em <Link to="/progresso">Progresso</Link> você exporta tudo em JSON, importa em outro navegador ou apaga o progresso local.
      </p>
    </div>
  );
}
