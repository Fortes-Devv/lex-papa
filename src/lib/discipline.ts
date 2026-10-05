// Nome e sigla da matéria (sem acesso a banco: usado no admin, na venda e na área do aluno).

// "Língua Portuguesa Aulas" e "Língua Portuguesa PDFs" viram a mesma disciplina.
export function disciplineName(title: string) {
  return title.replace(/[\s\-–—·:]+(aulas?|pdfs?|v[ií]deos?|materia(is|l)|apostilas?)$/i, "").trim() || title;
}

const STOP = new Set(["de", "da", "do", "das", "dos", "e", "a", "o", "em", "para", "com", "na", "no"]);

// Sigla da matéria para a capa automática: Língua Portuguesa = LP, Direito Penal = DP,
// Raciocínio Lógico Matemático = RL, Informática = IN, Atualidades = AT.
export function subjectInitials(title: string): string {
  const words = disciplineName(title)
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .split(/[^A-Za-z0-9]+/).filter((w) => w && !STOP.has(w.toLowerCase()));
  if (words.length === 0) return "";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
