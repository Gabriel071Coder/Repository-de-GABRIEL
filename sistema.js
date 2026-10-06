// =====================================================
// SISTEMA — Personagem, Missões, Mental e Inventário
// (inspirado em Solo Leveling)
// Usa estado e utilitários definidos em app.js
// =====================================================

// ---------- Estado ----------
let mental = carregar("mental", []);              // [{id, data, tipo, minutos, livro, paginas, subtipo, texto}]
let tela = carregar("tela", {});                  // { data: horas }
let missaoFisica = carregar("missaoFisica", {});  // { data: {flexoes, abdominais, agachamentos} }
let configMissao = {
  flexoes: 100, abdominais: 100, agachamentos: 100,
  kmCardio: 3, leituraMin: 20, meditacaoMin: 10, limiteTela: 3,
  ...carregar("configMissao", {}),
};
let nomePersonagem = carregar("nomePersonagem", "");
let logSistema = carregar("logSistema", []);
let inventario = carregar("inventario", []);      // [{uid, itemId}]
let equipados = carregar("equipados", {});        // { slot: {uid, itemId} }
let pendentes = carregar("pendentes", []);        // itens aguardando espaço
let recebidas = carregar("recompensasRecebidas", []);
let pontosStatus = { for: 0, agi: 0, vit: 0, mag: 0, per: 0, ...carregar("pontosStatus", {}) };
let nivelAtual = 1;
let invSel = null;

const hojeStr = () => isoLocal(new Date());

// ---------- Atributos ----------
const ATRIBUTOS = [
  { id: "for", nome: "FORÇA", sigla: "FOR", icone: "💪", origem: "Musculação e treino do Sistema" },
  { id: "vit", nome: "VITALIDADE", sigla: "VIT", icone: "❤️", origem: "Alimentação, água e sono" },
  { id: "agi", nome: "AGILIDADE", sigla: "AGI", icone: "⚡", origem: "Km de cárdio" },
  { id: "mag", nome: "INTELIGÊNCIA", sigla: "INT", icone: "🔮", origem: "Leitura, meditação e escrita" },
  { id: "per", nome: "PERCEPÇÃO", sigla: "PER", icone: "👁️", origem: "Missões diárias e tempo de tela" },
];
const PONTOS_POR_NIVEL = 3;
const PONTOS_POR_MISSAO = 1;   // recompensa extra por concluir todas as missões do dia
let tituloSel = carregar("tituloSel", "");
let pontosBonus = carregar("pontosBonus", 0);   // pontos de atributo ganhos em Caixas da Determinação

// ---------- Classe (Job) por nível ----------
const CLASSES = [[60, "Monarca das Sombras"], [40, "Necromante"], [25, "Assassino Furtivo"], [10, "Caçador"], [1, "Nenhuma"]];
const classeDoNivel = n => CLASSES.find(([min]) => n >= min)[1];

// ---------- Títulos (desbloqueados por conquistas) ----------
const TITULOS = [
  { nome: "Jogador", req: "Iniciar o Sistema", ok: p => true },
  { nome: "Aquele que Venceu a Adversidade", req: "Completar todas as missões de um dia", ok: p => p.diasCompletos >= 1 },
  { nome: "Lobo Assassino", req: "10 dias com todas as missões", ok: p => p.diasCompletos >= 10 },
  { nome: "Persistente", req: "Alcançar o nível 10", ok: p => p.nivel >= 10 },
  { nome: "Caçador de Demônios", req: "30 dias com todas as missões", ok: p => p.diasCompletos >= 30 },
  { nome: "Mestre da Mente", req: "INT total 40", ok: p => p.total.mag >= 40 },
  { nome: "Rei dos Demônios", req: "Alcançar o nível 50", ok: p => p.nivel >= 50 },
];

// ---------- Habilidades (liberadas por nível) ----------
const HABILIDADES = [
  { nome: "Determinação", tipo: "passiva", nivel: 1, desc: "Reduz a fadiga em 50% quando o HP está baixo. Nunca desista." },
  { nome: "Recuperação Total", tipo: "passiva", nivel: 1, desc: "Concluir todas as missões diárias zera a fadiga e restaura HP e MP." },
  { nome: "Sprint", tipo: "ativa", nivel: 5, desc: "Aumenta a velocidade. Cada km de cárdio rende +10% de XP (custo: 10 MP)." },
  { nome: "Golpe Mortal", tipo: "ativa", nivel: 10, desc: "Ataque concentrado. Treinos de força dão +10% de XP (custo: 15 MP)." },
  { nome: "Resistência Tóxica", tipo: "passiva", nivel: 15, desc: "Imunidade a venenos: penalidades por tempo de tela reduzidas." },
  { nome: "Furtividade", tipo: "ativa", nivel: 20, desc: "Desaparece da vista dos inimigos. Foco total por 30 min (custo: 20 MP)." },
  { nome: "Intenção Assassina", tipo: "ativa", nivel: 25, desc: "Intimida inimigos mais fracos. Aumenta a disciplina do dia (custo: 25 MP)." },
  { nome: "Extração de Sombras", tipo: "ativa", nivel: 40, desc: "Transforma inimigos derrotados em soldados das sombras (custo: 50 MP)." },
  { nome: "Troca de Sombras", tipo: "ativa", nivel: 50, desc: "Troca de posição com uma sombra invocada (custo: 40 MP)." },
  { nome: "Domínio do Monarca", tipo: "passiva", nivel: 60, desc: "Todos os atributos dos soldados das sombras aumentam drasticamente." },
];

// ---------- Som do Sistema ("ding") ----------
let _audio;
function somSistema(tipo = "ding") {
  try {
    _audio = _audio || new (window.AudioContext || window.webkitAudioContext)();
    const t = _audio.currentTime;
    const notas = tipo === "alerta" ? [440, 330] : tipo === "level" ? [660, 880, 1320] : [1046, 1568];
    notas.forEach((f, i) => {
      const o = _audio.createOscillator(), g = _audio.createGain();
      o.type = tipo === "alerta" ? "square" : "sine";
      o.frequency.value = f;
      g.gain.setValueAtTime(0, t + i * 0.09);
      g.gain.linearRampToValueAtTime(0.12, t + i * 0.09 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.09 + 0.5);
      o.connect(g).connect(_audio.destination);
      o.start(t + i * 0.09); o.stop(t + i * 0.09 + 0.55);
    });
  } catch (e) { /* som indisponível */ }
}

// ---------- Ranks e níveis ----------
const RANKS = [[75, "S"], [50, "A"], [35, "B"], [20, "C"], [10, "D"], [1, "E"]];
const rankDoNivel = n => RANKS.find(([min]) => n >= min)[1];
const xpParaProximo = n => 100 + (n - 1) * 50;

// ---------- Itens ----------
const RARIDADES = [
  { nome: "Comum", cor: "#9ca3af", principal: 2, extra: 0, peso: 55 },
  { nome: "Raro", cor: "#3b82f6", principal: 4, extra: 0, peso: 28 },
  { nome: "Épico", cor: "#a855f7", principal: 7, extra: 1, peso: 12 },
  { nome: "Lendário", cor: "#f59e0b", principal: 12, extra: 3, peso: 4 },
  { nome: "Monarca", cor: "#ef4444", principal: 20, extra: 6, peso: 1 },
];

// Nomes na ordem: comum, raro, épico, lendário, monarca
const SLOTS = [
  { id: "elmo", nome: "Elmo", icone: "⛑️", attr: "per",
    itens: ["Capuz de Couro", "Elmo de Aço Reforçado", "Elmo do Cavaleiro Rubro", "Elmo do Rei Demônio", "Coroa do Monarca das Sombras"] },
  { id: "brincos", nome: "Brincos", icone: "💎", attr: "mag",
    itens: ["Brincos de Cobre", "Brincos de Safira", "Brincos do Mago Negro", "Brincos do Ancião", "Brincos do Monarca da Destruição"] },
  { id: "colar", nome: "Colar", icone: "📿", attr: "mag",
    itens: ["Colar de Corda", "Colar de Prata", "Colar da Alma Azul", "Colar do Dragão de Gelo", "Colar do Monarca Eterno"] },
  { id: "armadura", nome: "Roupa", icone: "🥋", attr: "vit",
    itens: ["Roupa de Treino", "Cota de Malha", "Armadura do Cavaleiro de Elite", "Armadura do Alto Orc", "Armadura do Monarca das Sombras"] },
  { id: "capa", nome: "Capa", icone: "🧥", attr: "agi",
    itens: ["Capa de Viajante", "Capa do Caçador", "Capa da Escuridão", "Capa do Assassino Silencioso", "Manto do Monarca das Sombras"] },
  { id: "luvas", nome: "Luvas", icone: "🧤", attr: "for",
    itens: ["Luvas de Couro", "Luvas de Ferro", "Manoplas do Cavaleiro", "Manoplas do Gigante", "Garras do Monarca das Bestas"] },
  { id: "anel", nome: "Anel", icone: "💍", attr: "per",
    itens: ["Anel de Ferro", "Anel de Rubi", "Anel da Percepção", "Anel do Sábio Ancestral", "Anel do Monarca do Fim"] },
  { id: "botas", nome: "Botas", icone: "👢", attr: "agi",
    itens: ["Botas de Couro", "Botas de Velocidade", "Botas do Vento Sombrio", "Botas do Caçador Lendário", "Botas do Monarca das Sombras"] },
  { id: "arma", nome: "Arma", icone: "🗡️", attr: "for",
    itens: ["Adaga Enferrujada", "Espada de Aço", "Presa Venenosa de Kasaka", "Adaga de Baruka", "Lâmina do Monarca das Sombras"] },
];

const ITENS = {};
SLOTS.forEach(s => s.itens.forEach((nome, r) => {
  ITENS[`${s.id}-${r}`] = { id: `${s.id}-${r}`, nome, slot: s.id, raridade: r };
}));
const slotDe = id => SLOTS.find(s => s.id === id);

function bonusItem(item) {
  const r = RARIDADES[item.raridade];
  const principal = slotDe(item.slot).attr;
  const b = {};
  ATRIBUTOS.forEach(a => b[a.id] = a.id === principal ? r.principal : r.extra);
  return b;
}
const textoBonus = b => ATRIBUTOS.filter(a => b[a.id]).map(a => `${a.nome.slice(0, 3)} +${b[a.id]}`).join(" · ");

// Inventário: começa com 6 espaços; a cada 5 níveis +2, a cada 10 níveis +3
const ganhoEspacos = k => (k % 10 === 0 ? 3 : 2);
function capacidadeInventario(n) {
  let c = 6;
  for (let k = 5; k <= n; k += 5) c += ganhoEspacos(k);
  return c;
}

// Recompensas por nível: nível 1 e a cada 5 níveis
const raridadeDoNivel = n => (n >= 50 ? 4 : n >= 35 ? 3 : n >= 20 ? 2 : n >= 10 ? 1 : 0);
function sortearRaridade() {
  let r = Math.random() * RARIDADES.reduce((s, x) => s + x.peso, 0);
  for (let i = 0; i < RARIDADES.length; i++) { if ((r -= RARIDADES[i].peso) < 0) return i; }
  return 0;
}
const sortearItem = rar => `${SLOTS[Math.floor(Math.random() * SLOTS.length)].id}-${rar}`;

// =====================================================
// Missões diárias
// =====================================================
function xpTela(h) {
  const L = configMissao.limiteTela;
  if (h === undefined || h === null) return 0;
  return h <= L ? Math.round(20 + (L - h) * 10) : -Math.round((h - L) * 15);
}

function missoesDoDia(d) {
  const c = configMissao;
  const plano = treinos.filter(t => t.dia === diaSemana(d));
  const kmDia = soma(cardios.filter(x => x.data === d), "km");
  const t = totaisDoDia(d);
  const ment = mental.filter(m => m.data === d);
  const leitura = soma(ment.filter(m => m.tipo === "leitura"), "minutos");
  const meditacao = soma(ment.filter(m => m.tipo === "meditacao"), "minutos");
  const escritas = ment.filter(m => m.tipo === "escrita").length;

  const lista = [
    // ---- Aba Treinos: cada exercício do plano do dia vira uma missão ----
    ...plano.map(t => ({
      id: `treino-${t.id}`, icone: "🏋️",
      nome: `${t.exercicio} — ${t.series}×${t.reps}${t.carga ? ` (${t.carga} kg)` : ""}`,
      atual: (feitos[d] || []).includes(t.id) ? 1 : 0, meta: 1, xp: 15, fmt: "check",
    })),
    // ---- Aba Cárdio ----
    { id: "cardio", icone: "🏃", nome: `Correr/pedalar ${c.kmCardio} km`, atual: r1(kmDia), meta: c.kmCardio, xp: 25, fmt: "km" },
    // ---- Aba Mental ----
    { id: "leitura", icone: "�", nome: `Ler ${c.leituraMin} min`, atual: leitura, meta: c.leituraMin, xp: 20, fmt: "min" },
    { id: "meditacao", icone: "🧘", nome: `Meditar ${c.meditacaoMin} min`, atual: meditacao, meta: c.meditacaoMin, xp: 20, fmt: "min" },
    { id: "escrita", icone: "✍️", nome: "Escrever (diário ou outro)", atual: escritas, meta: 1, xp: 20 },
    // ---- Aba Alimentação ----
    { id: "proteina", icone: "🍗", nome: `Proteína: ${metas.prot} g`, atual: r1(t.prot), meta: metas.prot || 1, xp: 20, fmt: "g" },
    { id: "calorias", icone: "🔥", nome: `Calorias: ${metas.kcal} kcal (±10%)`, atual: Math.round(t.kcal), meta: metas.kcal || 1, xp: 20, fmt: "kcal",
      ok: !!metas.kcal && t.kcal >= metas.kcal * 0.9 && t.kcal <= metas.kcal * 1.1 },
  ];
  if (!plano.length) lista.unshift({ id: "descanso", icone: "🛌", nome: "Dia de descanso (sem treino no plano)", atual: 1, meta: 1, xp: 15, fmt: "check" });
  lista.forEach(m => { if (m.ok === undefined) m.ok = m.atual >= m.meta; });
  return lista;
}

function temRegistro(d) {
  const mf = missaoFisica[d] || {};
  return !!((refeicoes[d] || []).length || agua[d] || sono[d] || (feitos[d] || []).length ||
    tela[d] !== undefined || mf.flexoes || mf.abdominais || mf.agachamentos ||
    cardios.some(c => c.data === d) || mental.some(m => m.data === d));
}

function diasComRegistro() {
  const s = new Set([
    ...Object.keys(refeicoes), ...Object.keys(agua), ...Object.keys(sono), ...Object.keys(feitos),
    ...Object.keys(tela), ...Object.keys(missaoFisica), ...cardios.map(c => c.data), ...mental.map(m => m.data),
  ]);
  return [...s].filter(temRegistro).sort();
}

const penalizado = (d, ms) => d < hojeStr() && ms.filter(m => m.ok).length < ms.length / 2;

// =====================================================
// Cálculo do personagem
// =====================================================
function calcularPersonagem() {
  const exFeitos = Object.values(feitos).reduce((s, l) => s + l.length, 0);
  const km = soma(cardios, "km");
  const minCardio = soma(cardios, "minutos");
  const leituras = mental.filter(m => m.tipo === "leitura");
  const leituraMin = soma(leituras, "minutos");
  const meditacaoMin = soma(mental.filter(m => m.tipo === "meditacao"), "minutos");
  const escritas = mental.filter(m => m.tipo === "escrita").length;

  let xpMissoes = 0, bonusDia = 0, penal = 0, xpDet = 0;
  let missoesOk = 0, diasCompletos = 0, metasVit = 0, repsSistema = 0;
  const diasCompletosLista = [], diasPenalizados = [];

  diasComRegistro().forEach(d => {
    const ms = missoesDoDia(d);
    const tudo = ms.every(m => m.ok);
    ms.forEach(m => {
      if (m.ok) xpMissoes += m.xp;
      if (m.ok) { missoesOk++; xpDet += tudo ? 2 : 1; }   // Determinação: +1 XP por missão, +2 se o dia foi perfeito
      if (m.ok && ["proteina", "calorias", "agua", "sono"].includes(m.id)) metasVit++;
    });
    const mf = missaoFisica[d] || {};
    repsSistema += (mf.flexoes || 0) + (mf.abdominais || 0) + (mf.agachamentos || 0);
    if (tudo) { bonusDia += 100; diasCompletos++; diasCompletosLista.push(d); }
    else if (penalizado(d, ms)) { penal += 50; diasPenalizados.push(d); }
  });

  // Marcos de Determinação: a cada 7 dias consecutivos perfeitos
  const marcosDet = [];
  let seqDet = 0, anterior = null;
  diasCompletosLista.forEach(d => {
    const ontem = new Date(d + "T12:00:00"); ontem.setDate(ontem.getDate() - 1);
    seqDet = anterior === isoLocal(ontem) ? seqDet + 1 : 1;
    anterior = d;
    if (seqDet % 7 === 0) marcosDet.push(d);
  });

  const fontes = [
    ["Exercícios de musculação concluídos", `${exFeitos} × 15`, exFeitos * 15],
    ["Cárdio", `${r1(km)} km × 10 + ${r1(minCardio)} min × 0,5`, km * 10 + minCardio * 0.5],
    ["Leitura", `${leituraMin} min × 1`, leituraMin],
    ["Meditação", `${meditacaoMin} min × 1,5`, meditacaoMin * 1.5],
    ["Escrita", `${escritas} registros × 10`, escritas * 10],
    ["Missões diárias", `${missoesOk} concluídas`, xpMissoes],
    ["Determinação", `+1 XP por missão (+2 em dias perfeitos)`, xpDet],
    ["Bônus: todas as missões do dia", `${diasCompletos} dias × 100`, bonusDia],
    ["Zona de Penalidade", `${diasPenalizados.length} dias × −50`, -penal],
  ];
  const xpTotal = Math.max(0, Math.floor(fontes.reduce((s, f) => s + f[2], 0)));

  let nivel = 1, resto = xpTotal;
  while (resto >= xpParaProximo(nivel)) { resto -= xpParaProximo(nivel); nivel++; }

  const base = {
    for: 10 + Math.floor(exFeitos / 3) + Math.floor(repsSistema / 300),
    agi: 10 + Math.floor(km / 5),
    vit: 10 + Math.floor(metasVit / 4),
    mag: 10 + Math.floor(leituraMin / 60 + meditacaoMin / 30 + escritas / 2),
    per: 10 + Math.floor(diasCompletos + missoesOk / 10),
  };
  const equip = { for: 0, agi: 0, vit: 0, mag: 0, per: 0 };
  Object.values(equipados).forEach(inst => {
    const b = bonusItem(ITENS[inst.itemId]);
    ATRIBUTOS.forEach(a => equip[a.id] += b[a.id]);
  });
  const total = {};
  ATRIBUTOS.forEach(a => total[a.id] = base[a.id] + (pontosStatus[a.id] || 0) + equip[a.id]);

  // ---- Vitais: HP (VIT), MP (INT) e Fadiga do dia selecionado ----
  const hpMax = 100 + total.vit * 10, mpMax = 50 + total.mag * 10;
  const msHoje = missoesDoDia(dataSel);
  let fadiga = 0;
  if (msHoje.every(m => m.ok)) fadiga = 0;                                     // Recuperação Total
  else {
    const sonoH = sono[dataSel];
    if (sonoH !== undefined) fadiga += Math.max(0, 7 - sonoH) * 10;            // falta de sono
    fadiga += (feitos[dataSel] || []).length * 4;                              // esforço dos treinos
    fadiga += Math.floor(soma(cardios.filter(x => x.data === dataSel), "km") * 3); // esforço do cárdio
    fadiga += (msHoje.length - msHoje.filter(m => m.ok).length) * 3;           // tarefas pendentes
    fadiga = Math.min(100, Math.round(fadiga));
  }
  const hp = Math.max(1, Math.round(hpMax * (1 - fadiga / 200)));
  const mp = Math.max(0, Math.round(mpMax * (1 - fadiga / 150)));

  return {
    xpTotal, nivel, xpNivel: resto, xpNecessario: xpParaProximo(nivel), rank: rankDoNivel(nivel),
    base, equip, total, fontes, diasCompletosLista, diasPenalizados, diasCompletos, marcosDet,
    hp, hpMax, mp, mpMax, fadiga, classe: classeDoNivel(nivel),
    pontosTotais: (nivel - 1) * PONTOS_POR_NIVEL + diasCompletos * PONTOS_POR_MISSAO + pontosBonus,
  };
}

const pontosLivres = p => Math.max(0, p.pontosTotais - Object.values(pontosStatus).reduce((s, v) => s + v, 0));

// =====================================================
// Notificações do Sistema (fila)
// =====================================================
const filaNotif = [];
let notifAtiva = false;
function notificar(titulo, msg, som = "ding") {
  filaNotif.push([titulo, msg, som]);
  if (!notifAtiva) proximaNotif();
}
function proximaNotif() {
  const el = $("notificacao");
  const n = filaNotif.shift();
  if (!n) { notifAtiva = false; return; }
  notifAtiva = true;
  somSistema(n[2]);
  el.classList.toggle("alerta", n[2] === "alerta");
  el.innerHTML = `<div class="notif-icone">!</div><div class="sistema-titulo">${n[0]}</div><div class="notif-msg">${n[1]}</div>`;
  el.classList.remove("visivel"); void el.offsetWidth;
  el.classList.add("visivel");
  setTimeout(() => { el.classList.remove("visivel"); setTimeout(proximaNotif, 450); }, 3800);
}

function registrarLog(texto) {
  logSistema.unshift({ data: hojeStr(), texto });
  logSistema = logSistema.slice(0, 30);
  salvar("logSistema", logSistema);
}

// =====================================================
// Itens: ganhar, equipar, descartar
// =====================================================
const novoUid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

function darItem(itemId, origem) {
  const inst = { uid: novoUid(), itemId };
  const cheio = inventario.length >= capacidadeInventario(nivelAtual);
  if (cheio) { pendentes.push(inst); salvar("pendentes", pendentes); }
  else { inventario.push(inst); salvar("inventario", inventario); }
  const it = ITENS[itemId], r = RARIDADES[it.raridade];
  notificar("ITEM OBTIDO",
    `<span style="color:${r.cor}">[${r.nome}] ${esc(it.nome)}</span><br><small>${esc(origem)}${cheio ? " — inventário cheio, guardado em pendentes" : ""}</small>`);
  registrarLog(`Obteve [${r.nome}] ${it.nome} — ${origem}`);
}

function equipar(uid) {
  const i = inventario.findIndex(x => x.uid === uid);
  if (i < 0) return;
  const inst = inventario[i];
  const slot = ITENS[inst.itemId].slot;
  inventario.splice(i, 1);
  if (equipados[slot]) inventario.push(equipados[slot]);
  equipados[slot] = inst;
  salvar("inventario", inventario);
  salvar("equipados", equipados);
  invSel = null;
  verificarSistema();
}

function desequipar(slot) {
  if (!equipados[slot]) return;
  if (inventario.length >= capacidadeInventario(nivelAtual)) {
    notificar("INVENTÁRIO CHEIO", "Libere um espaço antes de desequipar.");
    return;
  }
  inventario.push(equipados[slot]);
  delete equipados[slot];
  salvar("inventario", inventario);
  salvar("equipados", equipados);
  verificarSistema();
}

function descartar(uid) {
  const inst = inventario.find(x => x.uid === uid);
  if (!inst || !confirm(`Descartar "${ITENS[inst.itemId].nome}"? Esta ação não pode ser desfeita.`)) return;
  inventario = inventario.filter(x => x.uid !== uid);
  salvar("inventario", inventario);
  invSel = null;
  verificarSistema();
}

function resgatar(uid) {
  if (inventario.length >= capacidadeInventario(nivelAtual)) {
    notificar("INVENTÁRIO CHEIO", "Libere espaço ou suba de nível para desbloquear mais espaços.");
    return;
  }
  const inst = pendentes.find(x => x.uid === uid);
  if (!inst) return;
  pendentes = pendentes.filter(x => x.uid !== uid);
  inventario.push(inst);
  salvar("pendentes", pendentes);
  salvar("inventario", inventario);
  verificarSistema();
}

// =====================================================
// Verificação central: level up, recompensas e renderização
// =====================================================
let timerSistema;
function agendarSistema() {
  clearTimeout(timerSistema);
  timerSistema = setTimeout(verificarSistema, 150);
}

function verificarSistema() {
  const p = calcularPersonagem();
  nivelAtual = p.nivel;

  // Level up
  const nivelSalvo = carregar("nivelSalvo", null);
  if (nivelSalvo !== null && p.nivel > nivelSalvo) {
    const rankAntigo = rankDoNivel(nivelSalvo);
    const ganhos = (p.nivel - nivelSalvo) * PONTOS_POR_NIVEL;
    notificar("VOCÊ SUBIU DE NÍVEL!",
      `Nível ${nivelSalvo} → <strong>${p.nivel}</strong>` +
      (rankAntigo !== p.rank ? `<br>Rank ${rankAntigo} → <strong>${p.rank}</strong>` : "") +
      (classeDoNivel(nivelSalvo) !== p.classe ? `<br>Nova classe: <strong>${p.classe}</strong>` : "") +
      `<br><small>+${ganhos} pontos de atributo disponíveis</small>`, "level");
    HABILIDADES.filter(h => h.nivel > nivelSalvo && h.nivel <= p.nivel).forEach(h =>
      notificar("NOVA HABILIDADE", `Você adquiriu a habilidade <strong>[${h.nome}]</strong>.`));
    registrarLog(`Subiu para o nível ${p.nivel}${rankAntigo !== p.rank ? ` (Rank ${p.rank})` : ""}`);
  }
  if (nivelSalvo !== p.nivel) salvar("nivelSalvo", p.nivel);

  // Recompensas de nível (nível 1 e a cada 5)
  for (let n = 1; n <= p.nivel; n++) {
    if (n !== 1 && n % 5 !== 0) continue;
    const chave = `nivel-${n}`;
    if (recebidas.includes(chave)) continue;
    recebidas.push(chave);
    salvar("recompensasRecebidas", recebidas);
    darItem(n === 1 ? "armadura-0" : sortearItem(raridadeDoNivel(n)),
      n === 1 ? "Item inicial do Jogador" : `Recompensa do nível ${n}`);
  }

  // Recompensa por completar todas as missões do dia
  p.diasCompletosLista.forEach(d => {
    const chave = `missao-${d}`;
    if (recebidas.includes(chave)) return;
    recebidas.push(chave);
    salvar("recompensasRecebidas", recebidas);
    notificar("MISSÃO DIÁRIA CONCLUÍDA",
      `Missão diária "Preparação para se tornar forte" concluída.<br><br><strong>Recompensas:</strong><br>` +
      `• Recuperação Total (HP/MP restaurados, fadiga zerada)<br>• +${PONTOS_POR_MISSAO} ponto de atributo<br>• +100 XP<br>• Caixa Aleatória`);
    darItem(sortearItem(sortearRaridade()), `Caixa da missão diária (${dataBR(d)})`);
  });

  // Caixa da Determinação: a cada 7 dias consecutivos perfeitos
  p.marcosDet.forEach(d => {
    const chave = `determinacao-${d}`;
    if (recebidas.includes(chave)) return;
    recebidas.push(chave);
    salvar("recompensasRecebidas", recebidas);
    // Item de raridade mínima "Raro" + chance de pontos de atributo
    const rar = Math.max(1, sortearRaridade());
    const pts = Math.random() < 0.6 ? 1 + Math.floor(Math.random() * 3) : 0;   // 60%: 1 a 3 pontos
    if (pts) { pontosBonus += pts; salvar("pontosBonus", pontosBonus); }
    notificar("CAIXA DA DETERMINAÇÃO",
      `7 dias consecutivos de disciplina perfeita!<br><br><strong>Conteúdo:</strong><br>• Item aleatório (Raro ou melhor)` +
      (pts ? `<br>• +${pts} ponto${pts > 1 ? "s" : ""} de atributo` : ""), "level");
    registrarLog(`Caixa da Determinação (${dataBR(d)})${pts ? ` — +${pts} pontos de atributo` : ""}`);
    darItem(sortearItem(rar), `Caixa da Determinação (${dataBR(d)})`);
  });

  // Aviso de penalidade (uma vez por dia, a partir das 18 h)
  const hoje = hojeStr(), msH = missoesDoDia(hoje);
  if (new Date().getHours() >= 18 && carregar("avisoPenal", "") !== hoje &&
      msH.filter(m => m.ok).length < msH.length / 2) {
    salvar("avisoPenal", hoje);
    notificar("AVISO", `Falhar em concluir a missão diária resultará em uma <strong>penalidade</strong> adequada.<br><small>Tempo restante: ${tempoRestante()}</small>`, "alerta");
  }

  // Títulos novos
  const vistos = carregar("titulosVistos", []), primeiraVez = !vistos.length;
  TITULOS.filter(t => t.ok(p) && !vistos.includes(t.nome)).forEach(t => {
    vistos.push(t.nome);
    if (!primeiraVez) notificar("TÍTULO ADQUIRIDO", `Você obteve o título <strong>[${t.nome}]</strong>.`);
  });
  salvar("titulosVistos", vistos);

  renderizarHabilidades(p);
  renderizarDeterminacao(p);
  renderizarPersonagem(p);
  renderizarMissoes(p);
  renderizarInventario(p);
  renderizarMental();
}

// =====================================================
// Render: Personagem
// =====================================================
$("char-nome").value = nomePersonagem;
$("char-nome").addEventListener("change", () => {
  nomePersonagem = $("char-nome").value.trim();
  salvar("nomePersonagem", nomePersonagem);
  verificarSistema();
});

$("char-atributos").addEventListener("click", e => {
  const id = e.target.dataset.attr;
  if (!id || pontosLivres(calcularPersonagem()) <= 0) return;
  pontosStatus[id] = (pontosStatus[id] || 0) + 1;
  salvar("pontosStatus", pontosStatus);
  verificarSistema();
});

$("char-titulo").addEventListener("change", () => {
  tituloSel = $("char-titulo").value;
  salvar("tituloSel", tituloSel);
});

function renderizarPersonagem(p) {
  const livres = pontosLivres(p);
  $("char-rank").textContent = p.rank;
  $("char-nivel").textContent = p.nivel;
  $("char-classe").textContent = p.classe;
  const titulos = TITULOS.filter(t => t.ok(p));
  if (!titulos.some(t => t.nome === tituloSel)) tituloSel = titulos[titulos.length - 1].nome;
  $("char-titulo").innerHTML = titulos.map(t =>
    `<option${t.nome === tituloSel ? " selected" : ""} title="${esc(t.req)}">${esc(t.nome)}</option>`).join("");
  $("char-hp").textContent = `${p.hp} / ${p.hpMax}`;
  $("char-mp").textContent = `${p.mp} / ${p.mpMax}`;
  $("char-hp-barra").style.width = `${pct(p.hp, p.hpMax)}%`;
  $("char-mp-barra").style.width = `${pct(p.mp, p.mpMax)}%`;
  $("char-fadiga").textContent = p.fadiga;
  $("char-fadiga").classList.toggle("alta", p.fadiga >= 50);
  $("char-xp-barra").style.width = `${pct(p.xpNivel, p.xpNecessario)}%`;
  $("char-xp-texto").textContent = `${p.xpNivel} / ${p.xpNecessario} XP · Total: ${p.xpTotal} XP`;
  $("char-pontos").innerHTML = `Pontos de atributo disponíveis: <strong>${livres}</strong>`;

  $("char-atributos").innerHTML = ATRIBUTOS.map(a => `
    <div class="atributo" title="${a.origem}&#10;Base ${p.base[a.id]} · Pontos ${pontosStatus[a.id] || 0} · Equip. ${p.equip[a.id]}">
      <span class="sigla">${a.sigla}:</span>
      <span class="valor">${p.total[a.id]}</span>
      ${p.equip[a.id] ? `<span class="extra">(+${p.equip[a.id]})</span>` : ""}
      <button class="btn-attr" data-attr="${a.id}" ${livres ? "" : "disabled"} title="Distribuir ponto">+</button>
    </div>`).join("");

  const poder = ATRIBUTOS.reduce((s, a) => s + p.total[a.id], 0);
  $("char-poder").textContent = `PODER TOTAL: ${poder}`;

  $("char-regras").innerHTML = p.fontes.map(f => `
    <li><div class="info">${f[0]}<small>${f[1]}</small></div>
    <strong${f[2] < 0 ? ' style="color:var(--erro)"' : ""}>${f[2] >= 0 ? "+" : ""}${Math.floor(f[2])} XP</strong></li>`).join("");

  $("char-log").innerHTML = logSistema.length
    ? logSistema.map(l => `<li>${dataBR(l.data)} — ${esc(l.texto)}</li>`).join("")
    : `<li class="vazio">Nenhum evento ainda. Complete treinos e missões para evoluir.</li>`;
}

// =====================================================
// Render: Missões
// =====================================================
const MISSAO_CFG = ["kmCardio", "leituraMin", "meditacaoMin"];
MISSAO_CFG.forEach(k => $(`cfg-${k}`).addEventListener("change", () => {
  const v = +$(`cfg-${k}`).value;
  if (v > 0) configMissao[k] = v;
  salvar("configMissao", configMissao);
  verificarSistema();
}));

function tempoRestante() {
  const agora = new Date();
  const fim = new Date(agora); fim.setHours(24, 0, 0, 0);
  const min = Math.floor((fim - agora) / 60000);
  return `${Math.floor(min / 60)} h ${min % 60} min`;
}

function renderizarMissoes(p) {
  const ms = missoesDoDia(dataSel);
  const okCount = ms.filter(m => m.ok).length;
  const L = configMissao.limiteTela;

  $("lista-missoes").innerHTML = ms.map(m => {
    const fmt = { km: " km", min: " min", g: " g", kcal: " kcal" }[m.fmt] || "";
    const prog = m.fmt === "check" ? (m.ok ? "1/1" : "0/1") : `${m.atual}/${m.meta}${fmt}`;
    const xp = `+${m.xp} XP`, neg = false;
    return `<li class="${m.ok ? "ok" : ""}">
      <span>${m.icone} ${esc(m.nome)}</span>
      <span class="prog">[${prog}]</span>
      <span class="xp-tag${neg ? " neg" : ""}">${xp}</span>
      <span class="check${m.ok ? " feito" : ""}">${m.ok ? "✔" : ""}</span></li>`;
  }).join("");

  const hoje = hojeStr();
  let aviso = "";
  if (dataSel === hoje) aviso = `⏳ Tempo restante: ${tempoRestante()} · Não completar ao menos metade das missões leva à Zona de Penalidade.`;
  else if (dataSel > hoje) aviso = "Missão futura — ainda não disponível para avaliação.";
  else if (penalizado(dataSel, ms) && temRegistro(dataSel)) aviso = "☠️ Missão falhou — penalidade de −50 XP aplicada.";
  else aviso = "Missão encerrada.";
  $("missoes-tempo").textContent = aviso;

  $("missoes-resumo").innerHTML = okCount === ms.length
    ? `<strong>[ CONCLUÍDO ]</strong><br>Recompensas: Recuperação Total · +${PONTOS_POR_MISSAO} ponto de atributo · +100 XP · Caixa Aleatória`
    : `<strong>${okCount}/${ms.length}</strong> concluídas<br><small>Recompensas ao concluir: Recuperação Total · +${PONTOS_POR_MISSAO} ponto de atributo · +100 XP · Caixa Aleatória</small><br>` +
      `<span class="aviso-penal">AVISO: Falhar na missão diária resultará em uma penalidade adequada.</span>`;

  // Inputs
  MISSAO_CFG.forEach(k => $(`cfg-${k}`).value = configMissao[k]);

  $("lista-penalidades").innerHTML = p.diasPenalizados.length
    ? [...p.diasPenalizados].reverse().slice(0, 10).map(d => `<li>☠️ ${dataBR(d)} — −50 XP</li>`).join("")
    : `<li class="vazio">Nenhuma penalidade. Continue assim!</li>`;
}

// =====================================================
// Visual do personagem (SVG em camadas)
// =====================================================
// (desenho do personagem movido para personagem.js)

// =====================================================
// Render: Inventário
// =====================================================
$("equip-slots").addEventListener("click", e => {
  const el = e.target.closest("[data-desequipar]");
  if (el && el.dataset.desequipar) desequipar(el.dataset.desequipar);
});
$("inv-grid").addEventListener("click", e => {
  const el = e.target.closest("[data-uid]");
  if (!el) return;
  invSel = invSel === el.dataset.uid ? null : el.dataset.uid;
  renderizarInventario(calcularPersonagem());
});
$("inv-detalhe").addEventListener("click", e => {
  const acao = e.target.dataset.acao;
  if (acao === "equipar") equipar(invSel);
  if (acao === "descartar") descartar(invSel);
});
$("inv-pendentes").addEventListener("click", e => {
  if (e.target.dataset.resgatar) resgatar(e.target.dataset.resgatar);
});

const nomeColorido = it => {
  const r = RARIDADES[it.raridade];
  return `<span style="color:${r.cor}">[${r.nome}] ${esc(it.nome)}</span>`;
};

function renderizarInventario(p) {
  const cap = capacidadeInventario(p.nivel);

  // Equipamento
  $("equip-slots").innerHTML = SLOTS.map(s => {
    const inst = equipados[s.id];
    const it = inst && ITENS[inst.itemId];
    const r = it && RARIDADES[it.raridade];
    return `<div class="slot-equip${it ? " cheio" : ""}" data-desequipar="${it ? s.id : ""}"
        style="grid-area:${s.id};${it ? `border-color:${r.cor};box-shadow:0 0 8px ${r.cor}` : ""}"
        title="${it ? `${esc(it.nome)} — clique para desequipar` : s.nome}">
        <div class="slot-icone">${iconeItem(s.id, it ? it.raridade : null)}</div>
        <div class="slot-nome"${it ? ` style="color:${r.cor}"` : ""}>${it ? esc(it.nome) : s.nome}</div>
      </div>`;
  }).join("") + avatarHTML(p);
  const bonusEquip = textoBonus(p.equip);
  $("equip-bonus").innerHTML = bonusEquip ? `Bônus dos equipamentos: <strong>${bonusEquip}</strong>` : `<small>Nenhum item equipado.</small>`;

  // Inventário
  const proxNivel = (Math.floor(p.nivel / 5) + 1) * 5;
  $("inv-info").textContent = `Espaços: ${inventario.length}/${cap} · Próximo desbloqueio: Nv ${proxNivel} (+${ganhoEspacos(proxNivel)})`;

  let html = "";
  for (let i = 0; i < cap; i++) {
    const inst = inventario[i];
    if (!inst) { html += `<div class="inv-slot livre"></div>`; continue; }
    const it = ITENS[inst.itemId], r = RARIDADES[it.raridade];
    html += `<div class="inv-slot${invSel === inst.uid ? " selecionado" : ""}" data-uid="${inst.uid}"
      style="border-color:${r.cor};box-shadow:inset 0 0 10px ${r.cor}55" title="[${r.nome}] ${esc(it.nome)}">${iconeItem(it.slot, it.raridade)}</div>`;
  }
  for (let k = proxNivel; k < proxNivel + 10; k += 5) {
    for (let j = 0; j < ganhoEspacos(k); j++) html += `<div class="inv-slot travado">🔒<small>Nv ${k}</small></div>`;
  }
  $("inv-grid").innerHTML = html;

  // Detalhe do item selecionado
  const sel = inventario.find(x => x.uid === invSel);
  if (sel) {
    const it = ITENS[sel.itemId];
    const atual = equipados[it.slot];
    $("inv-detalhe").innerHTML = `<div class="detalhe-item">
      <strong>${nomeColorido(it)}</strong>
      <small>${slotDe(it.slot).icone} ${slotDe(it.slot).nome} · ${textoBonus(bonusItem(it))}</small>
      ${atual ? `<small>Equipado agora: ${nomeColorido(ITENS[atual.itemId])} (${textoBonus(bonusItem(ITENS[atual.itemId]))})</small>` : ""}
      <button data-acao="equipar">Equipar</button>
      <button data-acao="descartar" class="remover">Descartar</button>
    </div>`;
  } else {
    $("inv-detalhe").innerHTML = inventario.length ? `<p class="dica espaco">Clique em um item para ver detalhes.</p>` : "";
  }

  // Pendentes
  $("inv-pendentes").innerHTML = pendentes.length
    ? pendentes.map(inst => `<li><div class="info">${nomeColorido(ITENS[inst.itemId])}</div>
        <button data-resgatar="${inst.uid}">Resgatar</button></li>`).join("")
    : `<li class="vazio">Nenhum item aguardando.</li>`;

  // Recompensas por nível
  const niveis = [1];
  for (let n = 5; n <= Math.max(60, proxNivel + 10); n += 5) niveis.push(n);
  $("inv-recompensas").innerHTML = niveis.map(n => {
    const r = RARIDADES[raridadeDoNivel(n)];
    const ok = recebidas.includes(`nivel-${n}`);
    return `<li><span>${ok ? "✅" : n <= p.nivel ? "🎁" : "🔒"} Nível ${n}</span>
      <span style="color:${r.cor}">${n === 1 ? "Roupa de Treino" : `Item ${r.nome}`}</span></li>`;
  }).join("");

  // Raridades
  const totalPeso = RARIDADES.reduce((s, r) => s + r.peso, 0);
  $("inv-raridades").innerHTML = RARIDADES.map(r => `
    <li><div class="info"><strong style="color:${r.cor}">${r.nome}</strong>
      <small>Atributo principal +${r.principal}${r.extra ? ` · demais +${r.extra}` : ""}</small></div>
      <small>${((r.peso / totalPeso) * 100).toFixed(0)}% na caixa</small></li>`).join("");
}

// =====================================================
// Render: Mental
// =====================================================
const ICONE_MENTAL = { leitura: "📖", meditacao: "🧘", escrita: "✍️" };

function atualizarCamposMental() {
  const t = $("mental-tipo").value;
  document.querySelectorAll(".campo-leitura").forEach(e => e.style.display = t === "leitura" ? "" : "none");
  document.querySelectorAll(".campo-escrita").forEach(e => e.style.display = t === "escrita" ? "" : "none");
}
$("mental-tipo").addEventListener("change", atualizarCamposMental);
atualizarCamposMental();

$("form-mental").addEventListener("submit", e => {
  e.preventDefault();
  const tipo = $("mental-tipo").value;
  mental.push({
    id: Date.now(),
    data: dataSel,
    tipo,
    minutos: +$("mental-minutos").value || 0,
    livro: tipo === "leitura" ? $("mental-livro").value.trim() : "",
    paginas: tipo === "leitura" ? +$("mental-paginas").value || 0 : 0,
    subtipo: tipo === "escrita" ? $("mental-subtipo").value : "",
    texto: tipo === "escrita" ? $("mental-texto").value.trim() : "",
  });
  salvar("mental", mental);
  ["minutos", "paginas", "texto"].forEach(c => $(`mental-${c}`).value = "");
  renderizarMental();
});

function textoMental(m) {
  if (m.tipo === "leitura") return `Leitura — ${m.livro || "sem título"} · ${m.paginas || 0} pág · ${m.minutos} min`;
  if (m.tipo === "meditacao") return `Meditação — ${m.minutos} min`;
  return `${m.subtipo || "Escrita"} — ${m.minutos} min`;
}

function sequencia(datas, ate) {
  let n = 0, d = ate;
  while (datas.has(d)) { n++; d = somarDias(d, -1); }
  return n;
}

function renderizarMental() {
  // Dia
  const ul = $("lista-mental");
  ul.innerHTML = "";
  const doDia = mental.filter(m => m.data === dataSel);
  if (!doDia.length) ul.innerHTML = `<li class="vazio">Nenhuma atividade neste dia.</li>`;
  doDia.forEach(m => {
    const li = document.createElement("li");
    li.innerHTML = `<div class="info">${ICONE_MENTAL[m.tipo]} ${esc(textoMental(m))}</div>`;
    li.appendChild(botaoRemover(() => {
      mental = mental.filter(x => x.id !== m.id);
      salvar("mental", mental);
      renderizarMental();
    }));
    ul.appendChild(li);
  });

  // Estatísticas
  const leit = mental.filter(m => m.tipo === "leitura");
  const med = mental.filter(m => m.tipo === "meditacao");
  const escr = mental.filter(m => m.tipo === "escrita");
  const datas = new Set(mental.map(m => m.data));
  $("stats-mental").innerHTML = `
    <p>📖 Leitura: <strong>${soma(leit, "minutos")} min</strong> · ${soma(leit, "paginas")} páginas</p>
    <p>🧘 Meditação: <strong>${soma(med, "minutos")} min</strong> em ${med.length} sessões</p>
    <p>✍️ Escrita: <strong>${escr.length} registros</strong> · ${soma(escr, "minutos")} min</p>
    <p>🔥 Sequência atual: <strong>${sequencia(datas, dataSel)} dias</strong> com atividade mental</p>
    <small>🔮 Magia: +1 a cada 60 min de leitura, 30 min de meditação ou 2 escritos.</small>`;

  // Livros
  const livros = {};
  leit.forEach(m => {
    const nome = m.livro || "Sem título";
    livros[nome] = livros[nome] || { paginas: 0, minutos: 0, sessoes: 0, ultima: m.data };
    livros[nome].paginas += m.paginas || 0;
    livros[nome].minutos += m.minutos;
    livros[nome].sessoes++;
    if (m.data > livros[nome].ultima) livros[nome].ultima = m.data;
  });
  const nomes = Object.keys(livros);
  $("livros-lista").innerHTML = nomes.map(n => `<option value="${esc(n)}">`).join("");
  $("lista-livros").innerHTML = nomes.length
    ? nomes.sort((a, b) => livros[b].ultima.localeCompare(livros[a].ultima)).map(n => `
        <li><div class="info">${esc(n)}<small>${livros[n].paginas} pág · ${livros[n].minutos} min · ${livros[n].sessoes} sessões</small></div></li>`).join("")
    : `<li class="vazio">Nenhum livro registrado.</li>`;

  // Escritos
  const ult = [...escr].sort((a, b) => b.data.localeCompare(a.data) || b.id - a.id).slice(0, 10);
  $("lista-diario").innerHTML = ult.length
    ? ult.map(m => `<div class="escrito"><strong>${dataBR(m.data)} — ${esc(m.subtipo)}</strong>
        <small>${m.minutos} min</small>${m.texto ? `<p>${esc(m.texto)}</p>` : ""}</div>`).join("")
    : `<p class="vazio">Nenhum escrito ainda.</p>`;
}

// =====================================================
// Render: Determinação (disciplina diária)
// =====================================================
function renderizarDeterminacao(p) {
  const ms = missoesDoDia(dataSel);
  const ok = ms.filter(m => m.ok).length;
  const nota = Math.round(pct(ok, ms.length));
  // Sequência de dias seguidos com todas as missões (até o dia selecionado)
  const completos = new Set(p.diasCompletosLista);
  let seq = 0;
  const dt = new Date(dataSel + "T12:00:00");
  if (!completos.has(dataSel)) dt.setDate(dt.getDate() - 1);   // hoje ainda em andamento
  while (completos.has(isoLocal(dt))) { seq++; dt.setDate(dt.getDate() - 1); }
  // Média dos últimos 7 dias
  let somaNota = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(dataSel + "T12:00:00"); d.setDate(d.getDate() - i);
    const m = missoesDoDia(isoLocal(d));
    somaNota += pct(m.filter(x => x.ok).length, m.length);
  }
  const media = Math.round(somaNota / 7);
  const nivel = nota === 100 ? ["INQUEBRÁVEL", "#4ade80"] : nota >= 75 ? ["FIRME", "#60a5fa"] :
    nota >= 50 ? ["VACILANTE", "#facc15"] : ["FRACA", "#f87171"];
  const pend = ms.filter(m => !m.ok);

  $("determinacao").innerHTML = `
    <div class="det-topo">
      <div class="det-nota" style="color:${nivel[1]}">${nota}%</div>
      <div><div class="det-nivel" style="color:${nivel[1]}">${nivel[0]}</div>
        <small>${ok}/${ms.length} tarefas do dia cumpridas</small></div>
    </div>
    <div class="barra"><div style="width:${nota}%;background:${nivel[1]}"></div></div>
    <p>🔥 Sequência: <strong>${seq}</strong> dia${seq === 1 ? "" : "s"} seguidos com tudo certo<br>
      📊 Média dos últimos 7 dias: <strong>${media}%</strong></p>
    <div class="rotulo">CAIXA DA DETERMINAÇÃO</div>
    <div class="det-caixa">
      ${Array.from({ length: 7 }, (_, i) => `<span class="${i < seq % 7 || (seq && seq % 7 === 0) ? "on" : ""}"></span>`).join("")}
      <small>${seq && seq % 7 === 0 ? "🎁 Caixa obtida!" : `${7 - (seq % 7)} dia(s) para a próxima caixa`}</small>
    </div>
    <p><small>Recompensas: +1 XP por missão cumprida (+2 em dias perfeitos) · a cada 7 dias seguidos perfeitos, uma caixa com item Raro+ e chance de 1–3 pontos de atributo.</small></p>
    ${pend.length
      ? `<div class="rotulo">AINDA FALTA HOJE</div><ul class="det-pend">${pend.map(m => `<li>${m.icone} ${esc(m.nome)}</li>`).join("")}</ul>`
      : `<p class="det-ok">Disciplina perfeita hoje. Nunca desista.</p>`}`;
}

// =====================================================
// Render: Habilidades
// =====================================================
function renderizarHabilidades(p) {
  const item = h => {
    const ok = p.nivel >= h.nivel;
    return `<li class="habilidade${ok ? "" : " bloqueada"}">
      <div class="hab-nome">${ok ? "◆" : "🔒"} [${esc(h.nome)}] <small>${h.tipo === "ativa" ? "Ativa" : "Passiva"}</small></div>
      <div class="hab-desc">${ok ? esc(h.desc) : `Desbloqueia no nível ${h.nivel}`}</div></li>`;
  };
  $("lista-passivas").innerHTML = HABILIDADES.filter(h => h.tipo === "passiva").map(item).join("");
  $("lista-ativas").innerHTML = HABILIDADES.filter(h => h.tipo === "ativa").map(item).join("");
}

// =====================================================
// Inicialização
// =====================================================
function renderizarTudo() {
  document.querySelectorAll(".data-texto").forEach(el =>
    el.textContent = `${diaSemana(dataSel)}, ${dataBR(dataSel)}`);
  renderizarTreinos();
  renderizarCardio();
  renderizarRefeicoes();
  renderizarProgresso();
  renderizarResumo();
  verificarSistema();
}

atualizarDatalist();
renderizarTudo();
