/** Pronúncia em inglês com a síntese de voz do próprio navegador (sem serviço externo). */
export function speak(text: string, lang = 'en-US') {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = 0.9;
  const voice = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith('en'));
  if (voice) u.voice = voice;
  window.speechSynthesis.speak(u);
}

export function SpeakButton({ text }: { text: string }) {
  return (
    <button type="button" className="speak" onClick={() => speak(text)} aria-label={`Ouvir a pronúncia de "${text}"`} title="Ouvir pronúncia">
      🔊
    </button>
  );
}
