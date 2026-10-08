// Aplica o tema salvo antes da primeira pintura (evita "piscar"). Arquivo separado para permitir CSP sem 'unsafe-inline'.
try {
  var t = localStorage.getItem('alicerce:tema');
  if (t) {
    document.documentElement.dataset.theme = t;
    // A barra do navegador acompanha o tema escolhido, não só o do sistema.
    document.querySelectorAll('meta[name="theme-color"]').forEach(function (m) {
      m.setAttribute('content', t === 'dark' ? '#2c3820' : '#3b4a2a');
    });
  }
} catch (e) {}
