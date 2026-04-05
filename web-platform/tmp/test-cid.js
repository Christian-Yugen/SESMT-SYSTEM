
const MUSCULOSKELETAL_PREFIXES = ["M"];

function isMusculoskeletalCid(cidCode, chapter) {
  if (!cidCode && !chapter) return false;
  const code = (cidCode || "").toUpperCase();
  const chap = (chapter || "").toUpperCase();
  
  // Exclusao explicita de CID F e Z no contexto de ergonomia pura
  if (code.startsWith("F") || code.startsWith("Z")) {
      console.log(`REJECTED: ${code}`);
      return false;
  }

  const result = (
    MUSCULOSKELETAL_PREFIXES.some((prefix) => code.startsWith(prefix)) ||
    chap.includes("XIII") ||
    chap.startsWith("M")
  );
  console.log(`CID: ${code}, Chap: ${chap}, Result: ${result}`);
  return result;
}

isMusculoskeletalCid("F32", "V - Transtornos mentais");
isMusculoskeletalCid("Z73", "XXI - Fatores que influenciam...");
isMusculoskeletalCid("M79.7", "XIII - Doencas do sistema...");
isMusculoskeletalCid("M54", null);
