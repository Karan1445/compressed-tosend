export function aggressiveNormalize(s) {
  let normalized = "";
  const posMap = [];

  const lower = s.toLowerCase();

  for (let i = 0; i < lower.length; i++) {
    const char = lower[i];

    if (!/[a-z0-9_]/.test(char)) continue;

    if (char === "_") {
      let count = 1;
      while (i + 1 < lower.length && lower[i + 1] === "_") {
        i++;
        count++;
      }
      normalized += "_";
      posMap.push(i - (count - 1));
      continue;
    }

    normalized += char;
    posMap.push(i);
  }

  return { normalized, posMap };
}
