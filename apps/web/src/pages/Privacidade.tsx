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
        Seu progresso (exercícios tentados, lições concluídas, cartões de revisão, rascunhos de código, respostas do diagnóstico e quantas perguntas você fez ao tutor em cada dia, só a contagem, sem o texto) fica apenas no armazenamento local do seu navegador (<span lang="en">localStorage</span>) e não é enviado ao servidor. O código que você executa roda no próprio navegador.
      </p>

      <h2>Com conta</h2>
      <ul>
        <li>Guardamos e-mail, nome (opcional), um resumo criptográfico da senha (scrypt com sal, nunca a senha em si) e uma cópia do seu progresso para sincronizar entre aparelhos.</li>
        <li>Guardamos também o plano da conta (gratuito ou premium), até quando ele vale, o histórico de mudanças de plano e quantas perguntas você fez ao tutor com IA em cada dia, para aplicar os limites diário e mensal. Se você assinar o Premium, guardamos a assinatura: mensal ou anual, preço, situação e as datas de pagamento, de cancelamento e de desistência. Quando houver cobrança de verdade, o pagamento vai acontecer na página do provedor de pagamento, que vai receber o seu e-mail para a cobrança; os dados do cartão ou do Pix ficam só com ele, nunca na Alicerce.</li>
        <li>Para criar a conta, mandamos um link para o seu e-mail. Até você abrir o link, guardamos o e-mail, o nome e o resumo da senha num pedido de cadastro, com só um resumo criptográfico do código do link. O link vale por 60 minutos e uma vez só; depois disso, o pedido é apagado do servidor em até 10 minutos, e a conta não é criada (uma cópia de segurança do banco feita nesse meio-tempo guarda o pedido até ser descartada). Se o e-mail já tem conta, nada é guardado: a mensagem só explica como entrar.</li>
        <li>Se você pedir para trocar a senha, mandamos um link para o seu e-mail e guardamos só um resumo criptográfico do código dele, que vale por 30 minutos e uma vez só.</li>
        <li>
          A sessão usa um cookie <span lang="en">HttpOnly</span> e <span lang="en">SameSite=Lax</span>, válido por até 30 dias; no servidor fica só o hash do token. O atributo <span lang="en">Secure</span> (o cookie só trafega por HTTPS) depende da configuração do servidor: vem ligado quando ele roda em modo de produção (<code>NODE_ENV=production</code>). A variável <code>COOKIE_SECURE</code>, quando tem valor, decide em qualquer modo: <code>1</code>, <code>true</code>, <code>yes</code> ou <code>sim</code> ligam o atributo, e qualquer outro valor o desliga. Numa instalação local sem essas opções, o cookie vai sem <span lang="en">Secure</span>.
        </li>
        <li>
          Em <Link to="/conta">Conta</Link>, “Sair de todos os aparelhos” encerra de uma vez todas as sessões da conta, inclusive a do aparelho em uso.
        </li>
        <li>
          Você pode excluir a conta a qualquer momento em <Link to="/conta">Conta</Link>, confirmando com a senha atual; isso apaga do servidor, imediatamente, a conta e tudo o que está ligado a ela: progresso sincronizado, histórico de planos, assinatura, pedidos de troca de senha, uso do tutor e sessões. Uma assinatura em vigor tem a renovação cancelada antes. As cópias de segurança do banco do servidor feitas antes da exclusão ainda guardam esses dados até serem descartadas. A cópia do progresso dessa conta que está no navegador não é apagada pela exclusão nem passa para o modo visitante: continua guardada nele, sem acesso pelo site. Para levá-la, exporte-a em <Link to="/progresso">Progresso</Link> antes de excluir; para apagá-la, limpe os dados deste site nas configurações do navegador (isso apaga também o progresso de visitante).
        </li>
      </ul>

      <h2>Tutor</h2>
      <p>
        O tutor com IA é só do Premium. Quando ele está ativado no servidor e a sua conta tem o Premium ativo, sua pergunta, as mensagens anteriores da conversa, seu código e a mensagem de erro vão ao provedor de IA (Anthropic) apenas para gerar a resposta, junto com o enunciado e a próxima dica do exercício. Não envie dados pessoais nas perguntas. Quando a IA não está ativada, quando você não tem conta, quando a sua conta não tem o Premium ativo ou quando o limite diário ou o mensal acaba, nada vai ao provedor de IA: as pistas são geradas pelo próprio servidor da Alicerce, e a pergunta e o código chegam ao servidor só para gerar a resposta e não são guardados. Na versão de demonstração, sem servidor, o tutor roda no navegador e nada é enviado.
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
