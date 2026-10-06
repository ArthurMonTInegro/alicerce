// Aplica o tema salvo antes da primeira pintura (evita "piscar"). Arquivo separado para permitir CSP sem 'unsafe-inline'.
try {
  var t = localStorage.getItem('alicerce:tema');
  if (t) document.documentElement.dataset.theme = t;
} catch (e) {}
