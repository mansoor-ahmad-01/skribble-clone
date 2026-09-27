export function normalize(str) {
  return String(str).trim().toLowerCase();
}

export function isCorrectGuess(guess, word) {
  return normalize(guess) === normalize(word);
}
