// @ts-check
/**
 * Página de execução do Alicerce (runner.html). O site a carrega num
 * <iframe sandbox="allow-scripts"> sem allow-same-origin, então a origem dela é
 * opaca ("null"): nada aqui dentro envia o cookie da sessão, lê respostas da API
 * ou enxerga o localStorage, o IndexedDB e a página do site.
 *
 * O código do estudante não roda nesta thread: roda em workers criados aqui a
 * partir do texto que o site manda (URL data:, porque um worker de URL do site
 * seria recusado numa origem opaca e um worker de blob: módulo falha no Chromium).
 *
 * Script clássico de propósito: um <script type="module"> precisaria de CORS,
 * e este arquivo não depende de cabeçalho nenhum do servidor.
 */
(function () {
  'use strict';
  var PROTOCOL = 1;
  var aviso = document.getElementById('aviso');

  /** @param {string} motivo */
  function recusar(motivo) {
    if (aviso) aviso.textContent = 'Página interna de execução do Alicerce. ' + motivo + ' Nada foi executado.';
  }

  // Aberta como página normal (sem a CSP sandbox do servidor, como no GitHub Pages), teria a origem do site.
  if (self.origin !== 'null') return recusar('Ela só roda isolada, dentro de um iframe sandbox.');
  // Aberta direto com a CSP sandbox, a origem é opaca, mas não há site em volta: também não roda.
  if (window.parent === window) return recusar('Ela só funciona dentro do site.');
  // Onde o navegador informa, só aceita ser emoldurada pelo próprio site (no servidor, a CSP frame-ancestors faz o mesmo).
  var ancestors = /** @type {DOMStringList | undefined} */ (location.ancestorOrigins);
  if (ancestors && ancestors.length && ancestors[0] !== new URL(location.href).origin) return recusar('Ela só funciona dentro do site do Alicerce.');

  /** @type {MessagePort | null} */
  var port = null;

  /** @param {string} code */
  function makeWorker(code) {
    return new Worker('data:text/javascript;charset=utf-8,' + encodeURIComponent(code), { type: 'module' });
  }

  /**
   * @param {number} id
   * @param {boolean} ok
   * @param {unknown} [result]
   * @param {unknown} [error]
   */
  function reply(id, ok, result, error) {
    if (port) port.postMessage({ id: id, ok: ok, result: result, error: typeof error === 'string' ? error : error ? String(error) : undefined });
  }

  /* ---------- Python (um worker que dura enquanto o iframe durar) ---------- */
  /** @type {Worker | null} */
  var py = null;
  /** @type {Set<number>} */
  var pyPending = new Set();

  /** @param {string} motivo */
  function pyCrash(motivo) {
    if (py) py.terminate();
    py = null;
    pyPending.forEach(function (id) {
      reply(id, false, undefined, motivo);
    });
    pyPending.clear();
  }

  /** @param {Record<string, unknown>} m */
  function toPython(m) {
    var id = /** @type {number} */ (m.id);
    if (m.op === 'python:boot' && !py) {
      if (typeof m.workerCode !== 'string') return reply(id, false, undefined, 'pedido sem o código do worker');
      try {
        py = makeWorker(m.workerCode);
      } catch (err) {
        return reply(id, false, undefined, 'não foi possível criar o worker do Python: ' + err);
      }
      py.onmessage = function (e) {
        var d = e.data;
        // O worker só responde a pedidos. Qualquer outra mensagem veio do código do estudante
        // (from js import postMessage), por exemplo uma enxurrada que ocuparia esta thread (no Chromium,
        // a página do site chegou a levar mais de 1 s para responder): encerra o Python, e o site o
        // inicia de novo na próxima execução.
        if (!d || typeof d.id !== 'number' || !pyPending.has(d.id)) return pyCrash('o Python mandou uma mensagem inesperada');
        pyPending.delete(d.id);
        reply(d.id, d.ok === true, d.result, d.error);
      };
      py.onerror = function (e) {
        e.preventDefault();
        pyCrash('o Python parou: ' + (e.message || 'erro no worker'));
      };
      py.onmessageerror = function () {
        pyCrash('o Python mandou uma mensagem ilegível');
      };
    }
    // texto conferido por python.ts, que inicia o Python de novo ao recebê-lo
    if (!py) return reply(id, false, undefined, 'o Python não foi iniciado');
    var msg = Object.assign({}, m);
    delete msg.workerCode;
    /** @type {Transferable[]} */
    var transfer = [];
    if (m.op === 'python:boot' && m.files && typeof m.files === 'object') {
      Object.values(m.files).forEach(function (b) {
        if (b instanceof ArrayBuffer) transfer.push(b);
      });
    }
    pyPending.add(id);
    py.postMessage(msg, transfer);
  }

  /* ---------- JavaScript (um worker novo por execução) ---------- */
  /** @param {Record<string, unknown>} m */
  function runJs(m) {
    var id = /** @type {number} */ (m.id);
    if (typeof m.workerCode !== 'string' || typeof m.code !== 'string') return reply(id, false, undefined, 'pedido inválido');
    /** @type {Worker} */
    var w;
    try {
      w = makeWorker(m.workerCode);
    } catch (err) {
      return reply(id, false, undefined, 'não foi possível criar o worker de JavaScript: ' + err);
    }
    var done = false;
    /**
     * @param {boolean} ok
     * @param {unknown} [result]
     * @param {string} [error]
     */
    function finish(ok, result, error) {
      if (done) return;
      done = true;
      w.terminate();
      reply(id, ok, result, error);
    }
    w.onmessage = function (e) {
      var d = e.data;
      if (d && typeof d === 'object' && 'result' in d) finish(true, d.result);
      else finish(false, undefined, 'o worker de JavaScript mandou uma resposta inesperada');
    };
    w.onerror = function (e) {
      e.preventDefault();
      finish(false, undefined, 'o worker de JavaScript parou: ' + (e.message || 'erro no worker'));
    };
    w.onmessageerror = function () {
      finish(false, undefined, 'o worker de JavaScript mandou uma mensagem ilegível');
    };
    w.postMessage({ id: id, code: m.code });
  }

  /** @param {MessageEvent} e */
  function onRequest(e) {
    var m = e.data;
    if (!m || typeof m !== 'object' || typeof m.id !== 'number' || typeof m.op !== 'string') return;
    if (m.op === 'python:boot' || m.op === 'python:run' || m.op === 'python:sql') toPython(m);
    else if (m.op === 'js:run') runJs(m);
    else reply(m.id, false, undefined, 'operação desconhecida');
  }

  if (aviso) aviso.textContent = '';
  // O canal nasce aqui e segue junto com o "pronto"; o site nunca manda nada para a janela deste
  // iframe. O site põe um valor aleatório no fragmento da URL do iframe e só aceita o "pronto" que o
  // devolve: quem emoldura o site (no GitHub Pages, qualquer página pode) consegue trocar a página
  // deste iframe por outra, com o mesmo contentWindow, mas não lê a URL dele, então não sabe o valor.
  // (Se o site respondesse para o contentWindow, a resposta poderia chegar à página que entrou no lugar.)
  var canal = new MessageChannel();
  port = canal.port1;
  port.onmessage = onRequest;
  window.parent.postMessage({ alicerce: 'runner', type: 'pronto', v: PROTOCOL, n: location.hash.slice(1) }, '*', [canal.port2]);
})();
