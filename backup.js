// =====================================================
// Backup: exporta / importa todos os dados (localStorage) em JSON
// =====================================================
const BACKUP_APP = "sistema-solo-leveling";
const BACKUP_VERSAO = 1;

function dadosBackup() {
  const dados = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    dados[k] = localStorage.getItem(k);
  }
  return { app: BACKUP_APP, versao: BACKUP_VERSAO, criadoEm: new Date().toISOString(), dados };
}

function exportarBackup() {
  const json = JSON.stringify(dadosBackup(), null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const agora = new Date();
  const carimbo = `${isoLocal(agora)}_${String(agora.getHours()).padStart(2, "0")}${String(agora.getMinutes()).padStart(2, "0")}`;
  a.href = url;
  a.download = `sistema-backup_${carimbo}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  localStorage.setItem("ultimoBackup", agora.toISOString());
  atualizarInfoBackup();
  if (typeof notificar === "function") notificar("BACKUP", "Seus dados foram exportados com sucesso.");
}

function importarBackup(arquivo) {
  const leitor = new FileReader();
  leitor.onload = () => {
    let obj;
    try { obj = JSON.parse(leitor.result); } catch { alert("Arquivo inválido: não é um JSON."); return; }
    if (!obj || obj.app !== BACKUP_APP || typeof obj.dados !== "object") {
      alert("Este arquivo não é um backup do Sistema.");
      return;
    }
    const qtd = Object.keys(obj.dados).length;
    const quando = obj.criadoEm ? new Date(obj.criadoEm).toLocaleString("pt-BR") : "data desconhecida";
    if (!confirm(`Restaurar backup de ${quando} (${qtd} registros)?\n\nOs dados atuais serão SUBSTITUÍDOS.`)) return;

    // Cópia de segurança automática do estado atual antes de sobrescrever
    try { sessionStorage.setItem("backupAntesImportar", JSON.stringify(dadosBackup())); } catch { /* sem espaço */ }

    localStorage.clear();
    for (const [k, v] of Object.entries(obj.dados)) {
      if (typeof v === "string") localStorage.setItem(k, v);
    }
    alert("Backup restaurado! A página será recarregada.");
    location.reload();
  };
  leitor.readAsText(arquivo);
}

function atualizarInfoBackup() {
  const el = document.getElementById("backup-info");
  if (!el) return;
  const ult = localStorage.getItem("ultimoBackup");
  if (!ult) { el.textContent = "Nenhum backup feito ainda"; el.className = "backup-alerta"; return; }
  const dias = Math.floor((Date.now() - new Date(ult)) / 86400000);
  el.textContent = dias === 0 ? "Último backup: hoje" : `Último backup: há ${dias} dia${dias > 1 ? "s" : ""}`;
  el.className = dias >= 7 ? "backup-alerta" : "";
}

document.getElementById("btn-exportar").addEventListener("click", exportarBackup);
document.getElementById("btn-importar").addEventListener("click", () => document.getElementById("arq-importar").click());
document.getElementById("arq-importar").addEventListener("change", e => {
  const f = e.target.files[0];
  if (f) importarBackup(f);
  e.target.value = "";
});
atualizarInfoBackup();
