/** Best-effort browser TTS when ElevenLabs is unavailable. */

export function isWebSpeechAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function pickEnglishVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang.startsWith("en-US")) ??
    voices.find((v) => v.lang.startsWith("en")) ??
    voices[0]
  );
}

/** Chrome loads voices async; call once on mount to warm the list. */
export function warmWebSpeechVoices(): void {
  if (!isWebSpeechAvailable()) return;
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
  };
}

export function cancelWebSpeech(): void {
  if (!isWebSpeechAvailable()) return;
  window.speechSynthesis.cancel();
}

export function pauseWebSpeech(): void {
  if (!isWebSpeechAvailable()) return;
  window.speechSynthesis.pause();
}

export function resumeWebSpeech(): void {
  if (!isWebSpeechAvailable()) return;
  window.speechSynthesis.resume();
}

export function speakWithWebSpeech(
  text: string,
  rate: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!isWebSpeechAvailable()) {
      reject(new Error("Web Speech API not available"));
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = Math.min(Math.max(rate, 0.5), 2);
    const voice = pickEnglishVoice();
    if (voice) utterance.voice = voice;
    utterance.onend = () => resolve();
    utterance.onerror = () => reject(new Error("Web speech failed"));
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  });
}
