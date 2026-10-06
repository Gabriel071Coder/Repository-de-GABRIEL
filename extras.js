// =====================================================
// EXTRAS: Masmorras, Chefe do Mês, Reavaliação de Rank, Emergência,
// Exército das Sombras, Loja/Ouro, Fusão, Conjuntos, Recordes,
// Gráficos, Calendário, Medidas, Lembretes e Despertar.
// Este arquivo "envolve" calcularPersonagem e verificarSistema do sistema.js.
// =====================================================

// Leitura/gravação que NÃO dispara recálculo automático (evita loops)
const xLer = (k, padrao) => carregar(k, padrao);
const xGravar = (k, v) => localStorage.setItem(k, JSON.stringify(v));

const RANK_ORDEM = ["E", "D", "C", "B", "A", "S"];
const idxRank = r => RANK_ORDEM.indexOf(r);

function inicioSemana(iso) {
  const dow = (paraData(iso).getDay() + 6) % 7;   // segunda = 0
  return somarDias(iso, -dow);
}
const diasEntre = (ini, n) => Array.from({ length: n }, (_, i) => somarDias(ini, i));
const exerciciosEm = dias => dias.reduce((s, d) => s + (feitos[d] || []).length, 0);
const kmEm = dias => soma(cardios.filter(c => dias.includes(c.data)), "km");

// ---------- Livro de recompensas extras (XP e ouro) ----------
let xRecompensas = xLer("xRecompensas", []);   // [{chave, xp, ouro, data, desc}]
const temRecompensa = chave => xRecompensas.some(r => r.chave === chave);

function recompensar(chave, xp, ouro, titulo, desc, opc = {}) {
  if (temRecompensa(chave)) return false;
  xRecompensas.push({ chave, xp, ouro, data: hojeStr(), desc });
  xGravar("xRecompensas", xRecompensas);
  if (!opc.silencioso) {
    notificar(titulo, `${desc}<br><br><strong>Recompensas:</strong>` +
      (xp ? `<br>• +${xp} XP` : "") + (ouro ? `<br>• +${ouro} 🪙 ouro` : "") +
      (opc.item ? `<br>• Item (${RARIDADES[opc.item.split("-")[1]].nome})` : ""), opc.som || "level");
    registrarLog(`${titulo}: ${desc.replace(/<[^>]+>/g, "")}`);
  }
  if (opc.item) darItem(opc.item, titulo);
  return true;
}

// ---------- Estatísticas por dia ----------
function estatDias() {
  const out = {};
  diasComRegistro().forEach(d => {
    const ms = missoesDoDia(d);
    out[d] = { ms, ok: ms.filter(m => m.ok).length, total: ms.length };
  });
  return out;
}

// =====================================================
// Exército das Sombras
// =====================================================
const SOMBRAS = [
  { id: "igris", nome: "Igris", titulo: "Cavaleiro Rubro", habito: "treino", attr: "for", hab: "Treinos do plano concluídos" },
  { id: "beru", nome: "Beru", titulo: "Rei Formiga", habito: "cardio", attr: "agi", hab: "Meta de cárdio" },
  { id: "tank", nome: "Tank", titulo: "Urso de Gelo", habito: "proteina", attr: "vit", hab: "Meta de proteína" },
  { id: "iron", nome: "Iron", titulo: "Guerreiro de Ferro", habito: "calorias", attr: "vit", hab: "Meta de calorias" },
  { id: "tusk", nome: "Tusk", titulo: "Xamã Orc", habito: "leitura", attr: "mag", hab: "Meta de leitura" },
  { id: "kaisel", nome: "Kaisel", titulo: "Dragão Alado", habito: "meditacao", attr: "per", hab: "Meta de meditação" },
  { id: "bellion", nome: "Bellion", titulo: "Grande Marechal", habito: "escrita", attr: "mag", hab: "Escrita diária" },
];
const DIAS_POR_NIVEL_SOMBRA = 30;

function habitoOk(ms, h) {
  if (h === "treino") {
    const t = ms.filter(m => m.id.startsWith("treino-"));
    return t.length > 0 && t.every(m => m.ok);
  }
  const m = ms.find(x => x.id === h);
  return !!(m && m.ok);
}

function estadoSombras(stats) {
  const extraidas = xLer("sombrasExtraidas", []);
  return SOMBRAS.map(s => {
    const dias = Object.values(stats).filter(st => habitoOk(st.ms, s.habito)).length;
    const nivel = Math.floor(dias / DIAS_POR_NIVEL_SOMBRA);
    const extraida = extraidas.includes(s.id);
    return { ...s, dias, nivel, extraida, pronta: nivel >= 1 && !extraida,
      bonus: extraida ? nivel * 2 : 0, prox: (nivel + 1) * DIAS_POR_NIVEL_SOMBRA };
  });
}

// =====================================================
// Conjuntos (sets) por raridade dos itens equipados
// =====================================================
function estadoConjuntos() {
  const eq = Object.values(equipados).map(i => ITENS[i.itemId]).filter(Boolean);
  const linhas = [1, 2, 3, 4].map(R => {
    const n = eq.filter(it => it.raridade >= R).length;
    const tier = n >= 9 ? 3 : n >= 5 ? 2 : n >= 3 ? 1 : 0;
    return { R, n, tier, bonus: tier * R * 2 };
  });
  const melhor = linhas.reduce((a, b) => (b.bonus > a.bonus ? b : a), { bonus: 0 });
  return { linhas, bonus: melhor.bonus, melhor };
}

// =====================================================
// Recordes pessoais (cargas e distâncias)
// =====================================================
function listarPRs() {
  const prs = [];
  const maxCarga = {};
  [...historicoCargas].sort((a, b) => a.data.localeCompare(b.data)).forEach(h => {
    const k = h.exercicio;
    if (!h.carga) return;
    if (maxCarga[k] !== undefined && h.carga > maxCarga[k])
      prs.push({ chave: `pr-carga-${k}-${h.carga}`, data: h.data, desc: `${k}: ${h.carga} kg (antes ${maxCarga[k]} kg)` });
    maxCarga[k] = Math.max(maxCarga[k] ?? 0, h.carga);
  });
  const maxKm = {};
  [...cardios].sort((a, b) => a.data.localeCompare(b.data)).forEach(c => {
    if (!c.km) return;
    if (maxKm[c.tipo] !== undefined && c.km > maxKm[c.tipo])
      prs.push({ chave: `pr-km-${c.tipo}-${c.km}`, data: c.data, desc: `${c.tipo}: ${c.km} km (antes ${maxKm[c.tipo]} km)` });
    maxKm[c.tipo] = Math.max(maxKm[c.tipo] ?? 0, c.km);
  });
  return { prs, maxCarga, maxKm };
}

// =====================================================
// Medidas corporais
// =====================================================
let medidas = xLer("medidas", []);   // [{data, cintura, peito, braco, coxa}]

// =====================================================
// Ouro
// =====================================================
function saldoOuro(stats) {
  let ganho = 0;
  Object.values(stats).forEach(st => { ganho += st.ok * 5 + (st.ok === st.total ? 50 : 0); });
  ganho += xRecompensas.reduce((s, r) => s + (r.ouro || 0), 0);
  return Math.max(0, ganho - xLer("ouroGasto", 0));
}

// =====================================================
// Envolve o cálculo do personagem
// =====================================================
const _calcularOriginal = calcularPersonagem;
calcularPersonagem = function () {
  const p = _calcularOriginal();
  const stats = estatDias();
  p.xStats = stats;

  // XP extra (masmorras, chefes, emergências, recordes, rank...)
  const xpExtra = xRecompensas.reduce((s, r) => s + (r.xp || 0), 0);
  if (xpExtra) {
    p.fontes.splice(p.fontes.length - 1, 0, ["Masmorras, chefes, emergências e recordes", `${xRecompensas.filter(r => r.xp).length} conquistas`, xpExtra]);
    const nivelAntes = p.nivel;
    p.xpTotal += xpExtra;
    let n = 1, resto = p.xpTotal;
    while (resto >= xpParaProximo(n)) { resto -= xpParaProximo(n); n++; }
    p.nivel = n; p.xpNivel = resto; p.xpNecessario = xpParaProximo(n);
    p.classe = classeDoNivel(n);
    p.pontosTotais += (n - nivelAntes) * PONTOS_POR_NIVEL;
  }

  // Reavaliação de Rank: o rank só sobe após passar no teste
  p.rankNivel = rankDoNivel(p.nivel);
  let aprovado = xLer("rankAprovado", null);
  if (aprovado === null) { aprovado = p.rankNivel; xGravar("rankAprovado", aprovado); }
  p.rankAprovado = aprovado;
  p.rank = idxRank(p.rankNivel) > idxRank(aprovado) ? aprovado : p.rankNivel;

  // Bônus de atributos: sombras, conjuntos e medidas
  p.sombras = estadoSombras(stats);
  p.conjuntos = estadoConjuntos();
  const extra = { for: 0, agi: 0, vit: 0, mag: 0, per: 0 };
  p.sombras.forEach(s => extra[s.attr] += s.bonus);
  ATRIBUTOS.forEach(a => extra[a.id] += p.conjuntos.bonus);
  extra.vit += Math.floor((pesos.length + medidas.length) / 4);
  ATRIBUTOS.forEach(a => { p.equip[a.id] += extra[a.id]; p.total[a.id] += extra[a.id]; });

  // Vitais recalculados (Elixir zera a fadiga do dia)
  if (xLer("elixirDias", []).includes(dataSel)) p.fadiga = 0;
  p.hpMax = 100 + p.total.vit * 10;
  p.mpMax = 50 + p.total.mag * 10;
  p.hp = Math.max(1, Math.round(p.hpMax * (1 - p.fadiga / 200)));
  p.mp = Math.max(0, Math.round(p.mpMax * (1 - p.fadiga / 150)));

  p.ouro = saldoOuro(stats);
  return p;
};

// =====================================================
// Masmorra semanal
// =====================================================
function dadosMasmorra(p) {
  const ini = inicioSemana(hojeStr());
  const dias = diasEntre(ini, 7);
  const r = Math.max(0, idxRank(p.rank));
  const req = [
    { nome: "Exercícios concluídos", atual: exerciciosEm(dias), meta: 3 + r * 2 },
    { nome: "Km de cárdio", atual: r1(kmEm(dias)), meta: 5 + r * 3 },
    { nome: "Dias perfeitos", atual: dias.filter(d => p.xStats[d] && p.xStats[d].ok === p.xStats[d].total).length, meta: 2 + Math.floor(r / 2) },
  ];
  const nomes = ["Caverna dos Goblins", "Covil dos Lobos de Aço", "Templo das Cobras", "Castelo dos Cavaleiros", "Ninho das Formigas", "Castelo do Demônio"];
  return { ini, fim: dias[6], r, req, nome: `${nomes[r]} (Rank ${RANK_ORDEM[r]})`, chave: `masmorra-${ini}`,
    xp: 150 + r * 75, ouro: 100 + r * 50, ok: req.every(x => x.atual >= x.meta) };
}

// =====================================================
// Chefe do mês
// =====================================================
const CHEFES = ["Cerberus, Guardião do Portão", "Vulcan, Rei Demônio", "Baran, Rei dos Demônios", "Igris, o Rubro",
  "Rainha Formiga", "Kargalgan, Xamã Supremo", "Monarca das Feras", "Monarca do Gelo", "Kamish, o Dragão",
  "Monarca das Pragas", "Monarca dos Gigantes", "Antares, Rei Dragão"];

function dadosChefe(p) {
  const mes = hojeStr().slice(0, 7);
  const hpTab = xLer("chefeHP", {});
  if (!hpTab[mes]) { hpTab[mes] = 2000 + p.nivel * 60; xGravar("chefeHP", hpTab); }
  const dias = Object.keys(p.xStats).filter(d => d.startsWith(mes));
  const ex = Object.keys(feitos).filter(d => d.startsWith(mes)).reduce((s, d) => s + feitos[d].length, 0);
  const km = soma(cardios.filter(c => c.data.startsWith(mes)), "km");
  const mOk = dias.reduce((s, d) => s + p.xStats[d].ok, 0);
  const perf = dias.filter(d => p.xStats[d].ok === p.xStats[d].total).length;
  const dano = Math.round(ex * 25 + km * 20 + mOk * 5 + perf * 50);
  const hpMax = hpTab[mes];
  return { mes, nome: CHEFES[+mes.slice(5, 7) - 1], hpMax, dano, hp: Math.max(0, hpMax - dano),
    partes: [["Exercícios", ex, 25], ["Km de cárdio", r1(km), 20], ["Missões concluídas", mOk, 5], ["Dias perfeitos", perf, 50]],
    chave: `chefe-${mes}` };
}

// =====================================================
// Reavaliação de Rank
// =====================================================
function dadosReavaliacao(p) {
  if (idxRank(p.rankNivel) <= idxRank(p.rankAprovado)) return null;
  const alvo = RANK_ORDEM[idxRank(p.rankAprovado) + 1];
  const i = idxRank(alvo);
  const d14 = ultimosDias(hojeStr(), 14);
  const prs = listarPRs().prs.filter(x => d14.includes(x.data)).length;
  const req = [
    { nome: "Recordes pessoais (14 dias)", atual: prs, meta: 1 },
    { nome: "Dias perfeitos (14 dias)", atual: d14.filter(d => p.xStats[d] && p.xStats[d].ok === p.xStats[d].total).length, meta: 3 + i },
    { nome: "Exercícios concluídos (14 dias)", atual: exerciciosEm(d14), meta: 5 + i * 3 },
  ];
  return { alvo, req, ok: req.every(x => x.atual >= x.meta) };
}

function fazerReavaliacao() {
  const p = calcularPersonagem();
  const r = dadosReavaliacao(p);
  if (!r || !r.ok) return;
  xGravar("rankAprovado", r.alvo);
  const i = idxRank(r.alvo);
  recompensar(`rank-${r.alvo}`, 150 * i, 100 * i, "REAVALIAÇÃO CONCLUÍDA",
    `Você foi reavaliado como Caçador <strong>Rank ${r.alvo}</strong>!`);
  verificarSistema();
}

// =====================================================
// Missão de Emergência (2 horas)
// =====================================================
const TIPOS_EMERG = {
  cardio: { nome: "Registre +2 km de cárdio", meta: 2, un: "km", medir: d => r1(soma(cardios.filter(x => x.data === d), "km")) },
  treino: { nome: "Conclua +2 exercícios do plano", meta: 2, un: "ex.", medir: d => (feitos[d] || []).length,
    pode: d => treinos.filter(t => t.dia === diaSemana(d) && !(feitos[d] || []).includes(t.id)).length >= 2 },
  leitura: { nome: "Leia +15 minutos", meta: 15, un: "min", medir: d => soma(mental.filter(m => m.data === d && m.tipo === "leitura"), "minutos") },
  meditacao: { nome: "Medite +10 minutos", meta: 10, un: "min", medir: d => soma(mental.filter(m => m.data === d && m.tipo === "meditacao"), "minutos") },
  escrita: { nome: "Escreva 1 registro no diário", meta: 1, un: "", medir: d => mental.filter(m => m.data === d && m.tipo === "escrita").length },
};

function checarEmergencia() {
  const hoje = hojeStr(), agora = Date.now();
  let e = xLer("emergencia", null);
  let mudou = false;

  // Sorteio: uma tentativa por dia, entre 8 h e 20 h, 40% de chance
  const h = new Date().getHours();
  if ((!e || e.data !== hoje) && xLer("emergSorteio", "") !== hoje && h >= 8 && h < 20) {
    xGravar("emergSorteio", hoje);
    if (Math.random() < 0.4) {
      const opcoes = Object.keys(TIPOS_EMERG).filter(k => !TIPOS_EMERG[k].pode || TIPOS_EMERG[k].pode(hoje));
      const tipo = opcoes[Math.floor(Math.random() * opcoes.length)];
      e = { data: hoje, tipo, base: TIPOS_EMERG[tipo].medir(hoje), inicio: agora, fim: agora + 2 * 3600e3, status: "ativa" };
      xGravar("emergencia", e);
      notificar("MISSÃO DE EMERGÊNCIA", `${TIPOS_EMERG[tipo].nome}<br><small>Prazo: 2 horas</small>`, "alerta");
      notificarCelular("⚠️ Missão de Emergência", `${TIPOS_EMERG[tipo].nome} — prazo de 2 horas!`);
    }
  }
  if (e && e.status === "ativa") {
    const t = TIPOS_EMERG[e.tipo];
    const prog = t.medir(e.data) - e.base;
    if (prog >= t.meta && agora <= e.fim) {
      e.status = "ok"; xGravar("emergencia", e);
      mudou = recompensar(`emerg-${e.data}`, 80, 40, "EMERGÊNCIA CONCLUÍDA", t.nome) || mudou;
    } else if (agora > e.fim) {
      e.status = "falhou"; xGravar("emergencia", e);
      notificar("EMERGÊNCIA FALHOU", "O tempo da missão de emergência acabou.", "alerta");
    }
  }
  return mudou;
}

// =====================================================
// Lembretes (notificações do celular)
// =====================================================
function notificarCelular(titulo, corpo) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const opc = { body: corpo, icon: "icone-192.png", badge: "icone-192.png", tag: titulo };
  if (navigator.serviceWorker && navigator.serviceWorker.controller) {
    navigator.serviceWorker.ready.then(r => r.showNotification(titulo, opc)).catch(() => {});
  } else {
    try { new Notification(titulo, opc); } catch { /* Android exige service worker */ }
  }
}

function checarLembrete() {
  const hora = xLer("lembreteHora", 20);
  const hoje = hojeStr();
  if (new Date().getHours() < hora || xLer("lembreteDia", "") === hoje) return;
  const ms = missoesDoDia(hoje), faltam = ms.filter(m => !m.ok).length;
  if (!faltam) return;
  xGravar("lembreteDia", hoje);
  notificarCelular("📜 Missão diária pendente", `Faltam ${faltam} de ${ms.length} missões. Não deixe a penalidade chegar!`);
}

// =====================================================
// Verificações extras + render
// =====================================================
let _primeiraVerificacao = true;
function verificarExtras() {
  let p = calcularPersonagem();
  let ganhou = false;

  // Recordes: na primeira execução registra os antigos em silêncio
  const silencioso = !xLer("prsIniciados", false);
  listarPRs().prs.forEach(pr => {
    ganhou = recompensar(pr.chave, silencioso ? 0 : 30, silencioso ? 0 : 20, "NOVO RECORDE!", pr.desc, { silencioso }) && !silencioso || ganhou;
  });
  if (silencioso) xGravar("prsIniciados", true);

  const m = dadosMasmorra(p);
  if (m.ok) ganhou = recompensar(m.chave, m.xp, m.ouro, "MASMORRA CONCLUÍDA", `Você limpou a masmorra <strong>${m.nome}</strong>.`,
    { item: sortearItem(Math.min(4, Math.max(sortearRaridade(), Math.floor(m.r / 1.5)))) }) || ganhou;

  const c = dadosChefe(p);
  if (c.hp === 0) ganhou = recompensar(c.chave, 500, 300, "CHEFE DERROTADO", `Você derrotou <strong>${c.nome}</strong>!`,
    { item: sortearItem(3) }) || ganhou;

  if (_primeiraVerificacao) { _primeiraVerificacao = false; ganhou = checarEmergencia() || ganhou; checarLembrete(); }

  if (ganhou) { _verificarOriginal(); p = calcularPersonagem(); }
  renderizarExtras(p);
}

const barraProg = (atual, meta, cor = "") =>
  `<div class="barra"><div style="width:${pct(atual, meta)}%;${cor ? `background:${cor}` : ""}"></div></div>`;
const linhaReq = x => `<div class="req"><span>${x.atual >= x.meta ? "✅" : "⬜"} ${x.nome}</span><strong>${x.atual} / ${x.meta}</strong></div>${barraProg(x.atual, x.meta)}`;

function renderEmergencia() {
  const e = xLer("emergencia", null);
  const el = $("emergencia");
  if (!e || e.data !== hojeStr()) {
    el.innerHTML = `<p class="centro vazio">Nenhuma emergência ativa. O Sistema pode convocar você a qualquer momento entre 8 h e 20 h.</p>`;
    return;
  }
  const t = TIPOS_EMERG[e.tipo];
  const prog = Math.max(0, r1(t.medir(e.data) - e.base));
  const resta = Math.max(0, e.fim - Date.now());
  const hh = Math.floor(resta / 3600e3), mm = Math.floor((resta % 3600e3) / 60e3);
  el.innerHTML = `<p class="centro"><strong>${t.nome}</strong></p>
    <div class="req"><span>Progresso</span><strong>${prog} / ${t.meta} ${t.un}</strong></div>${barraProg(prog, t.meta, "#ef4444")}
    <p class="centro">${e.status === "ativa" ? `⏳ Tempo restante: <strong>${hh}h ${String(mm).padStart(2, "0")}min</strong>`
      : e.status === "ok" ? "✅ Concluída! +80 XP, +40 🪙" : "❌ Falhou"}</p>
    <p class="centro"><small>Recompensa: +80 XP e +40 ouro.</small></p>`;
}

function renderizarExtras(p) {
  document.body.classList.toggle("despertar-roxo", p.nivel >= 25 && p.nivel < 50);
  document.body.classList.toggle("despertar-ouro", p.nivel >= 50);

  // ---- Emergência ----
  renderEmergencia();

  // ---- Masmorra ----
  const m = dadosMasmorra(p);
  $("masmorra").innerHTML = `<p class="centro"><strong>${m.nome}</strong><br><small>${dataBR(m.ini)} a ${dataBR(m.fim)}</small></p>
    ${m.req.map(linhaReq).join("")}
    <p class="centro">${temRecompensa(m.chave) ? "✅ Masmorra limpa nesta semana!" : `Recompensa: +${m.xp} XP · +${m.ouro} 🪙 · item aleatório`}</p>`;

  // ---- Chefe ----
  const c = dadosChefe(p);
  $("chefe").innerHTML = `<p class="centro chefe-nome">👹 <strong>${c.nome}</strong></p>
    <div class="req"><span>HP do chefe</span><strong>${c.hp} / ${c.hpMax}</strong></div>${barraProg(c.hp, c.hpMax, "#dc2626")}
    <ul class="lista-mini">${c.partes.map(([n, q, d]) => `<li>${n}: ${q} × ${d} = <strong>${Math.round(q * d)}</strong> de dano</li>`).join("")}</ul>
    <p class="centro">${c.hp === 0 ? "🏆 Chefe derrotado neste mês!" : "Derrote até o fim do mês: +500 XP · +300 🪙 · item Lendário"}</p>`;

  // ---- Reavaliação ----
  const r = dadosReavaliacao(p);
  $("reavaliacao").innerHTML = r
    ? `<p class="centro">Seu nível já permite o <strong>Rank ${r.alvo}</strong>, mas o Sistema exige uma reavaliação.</p>
       ${r.req.map(linhaReq).join("")}
       <p class="centro"><button id="btn-reavaliar" ${r.ok ? "" : "disabled"}>${r.ok ? `Fazer teste para Rank ${r.alvo}` : "Requisitos pendentes"}</button></p>`
    : `<p class="centro">Rank atual: <strong>${p.rank}</strong>. O próximo teste aparece quando seu nível alcançar o rank seguinte.</p>`;
  const btn = $("btn-reavaliar");
  if (btn) btn.onclick = fazerReavaliacao;

  // ---- Sombras ----
  $("exercito").innerHTML = p.sombras.map(s => `
    <div class="sombra${s.extraida ? " extraida" : ""}">
      <div class="sombra-icone">${s.extraida ? "👤" : "❔"}</div>
      <div class="sombra-nome">${s.extraida || s.pronta ? s.nome : "???"} ${s.extraida ? `<small>Nv ${s.nivel}</small>` : ""}</div>
      <div class="sombra-tit">${s.extraida ? s.titulo : s.hab}</div>
      <div class="req"><span>${s.dias} dias</span><strong>${s.dias}/${s.prox}</strong></div>${barraProg(s.dias - s.nivel * DIAS_POR_NIVEL_SOMBRA, DIAS_POR_NIVEL_SOMBRA, "#7c3aed")}
      <div class="sombra-bonus">${s.extraida ? `${ATRIBUTOS.find(a => a.id === s.attr).sigla} +${s.bonus}` : `Hábito: ${s.hab}`}</div>
      ${s.pronta ? `<button class="btn-arise" data-sombra="${s.id}">ARISE!</button>` : ""}
    </div>`).join("");

  // ---- Despertar ----
  $("despertar-info").innerHTML = `<p class="centro">${p.nivel >= 50 ? "🌟 <strong>Despertar Dourado</strong> ativo" :
    p.nivel >= 25 ? "🟣 <strong>Despertar das Sombras</strong> ativo" : "Ainda não despertado"}</p>
    <p class="centro"><small>Nível 25: interface roxa · Nível 50: interface dourada.</small></p>`;

  // ---- Lembretes ----
  const perm = "Notification" in window ? Notification.permission : "indisponível";
  $("lembretes-info").innerHTML = `<p class="centro">Avisa se houver missões pendentes depois das
    <input id="lembrete-hora" type="number" min="0" max="23" value="${xLer("lembreteHora", 20)}" style="width:4.5rem"> h.</p>
    <p class="centro">${perm === "granted" ? "✅ Notificações ativadas" : perm === "denied" ? "❌ Bloqueadas nas configurações do navegador" :
      perm === "indisponível" ? "Seu navegador não suporta notificações." : `<button id="btn-notif">Ativar notificações</button>`}</p>
    <p class="centro"><small>Os lembretes funcionam quando o app é aberto (ou está aberto em segundo plano).</small></p>`;
  if ($("btn-notif")) $("btn-notif").onclick = () => Notification.requestPermission().then(() => renderizarExtras(calcularPersonagem()));
  $("lembrete-hora").onchange = e => xGravar("lembreteHora", Math.min(23, Math.max(0, +e.target.value || 20)));

  // ---- Loja ----
  $("ouro-saldo").textContent = p.ouro;
  $("loja-itens").innerHTML = LOJA.map(it => `
    <div class="loja-item">
      <div class="loja-icone">${it.icone}</div>
      <div class="loja-nome">${it.nome}</div>
      <div class="loja-desc">${it.desc}</div>
      <button data-comprar="${it.id}" ${p.ouro >= it.preco ? "" : "disabled"}>🪙 ${it.preco}</button>
    </div>`).join("");

  // ---- Fusão ----
  const cont = {};
  inventario.forEach(i => cont[i.itemId] = (cont[i.itemId] || 0) + 1);
  const fusiveis = Object.entries(cont).filter(([id, n]) => n >= 3 && ITENS[id].raridade < 4);
  $("fusao").innerHTML = fusiveis.length
    ? fusiveis.map(([id, n]) => {
        const it = ITENS[id], novo = ITENS[`${it.slot}-${it.raridade + 1}`];
        return `<div class="req"><span>${nomeColorido(it)} ×${n} → ${nomeColorido(novo)}</span>
          <button data-fundir="${id}">Fundir</button></div>`;
      }).join("")
    : `<p class="centro vazio">Nenhum trio de itens iguais no inventário.</p>`;

  // ---- Conjuntos ----
  const cj = p.conjuntos;
  $("conjuntos").innerHTML = `<p class="centro"><small>Equipe várias peças da mesma raridade (ou superior). 3 peças: nível 1 · 5 peças: nível 2 · 9 peças: nível 3.<br>Vale o melhor conjunto.</small></p>` +
    cj.linhas.map(l => `<div class="req"><span style="color:${RARIDADES[l.R].cor}">Conjunto ${RARIDADES[l.R].nome}+ (${l.n}/9)</span>
      <strong>${l.tier ? `Nv ${l.tier}: todos +${l.bonus}` : "—"}</strong></div>`).join("") +
    `<p class="centro">Bônus ativo: <strong>${cj.bonus ? `+${cj.bonus} em todos os atributos` : "nenhum"}</strong></p>`;

  // ---- Progresso: medidas, recordes, gráficos, calendário ----
  renderMedidas();
  renderPRs();
  renderGraficosSemana(p);
  renderCalendario(p);
}

// =====================================================
// Loja
// =====================================================
const LOJA = [
  { id: "elixir", icone: "🧪", nome: "Elixir de Recuperação", preco: 60, desc: "Zera a fadiga do dia selecionado (HP/MP cheios)." },
  { id: "caixa", icone: "🎁", nome: "Caixa Aleatória", preco: 150, desc: "Um item de raridade aleatória." },
  { id: "caixaRara", icone: "💠", nome: "Caixa Rara", preco: 400, desc: "Um item Raro ou melhor." },
  { id: "pergaminho", icone: "📜", nome: "Pergaminho de Perdão", preco: 200, desc: "Devolve os 50 XP do dia penalizado mais recente." },
  { id: "ponto", icone: "⭐", nome: "Ponto de Atributo", preco: 500, desc: "+1 ponto de atributo para distribuir." },
];

function comprar(id) {
  const p = calcularPersonagem();
  const it = LOJA.find(x => x.id === id);
  if (!it || p.ouro < it.preco) { notificar("OURO INSUFICIENTE", "Complete missões para ganhar mais ouro."); return; }
  if (id === "elixir") {
    const l = xLer("elixirDias", []);
    if (l.includes(dataSel)) { notificar("LOJA", "Este dia já está sob efeito do Elixir."); return; }
    if (p.fadiga === 0) { notificar("LOJA", "Sua fadiga já está em 0."); return; }
    l.push(dataSel); xGravar("elixirDias", l);
  } else if (id === "pergaminho") {
    const d = [...p.diasPenalizados].reverse().find(x => !temRecompensa(`perdao-${x}`));
    if (!d) { notificar("LOJA", "Nenhum dia penalizado para perdoar."); return; }
    recompensar(`perdao-${d}`, 50, 0, "PERGAMINHO DE PERDÃO", `Penalidade de ${dataBR(d)} anulada.`);
  } else if (id === "ponto") {
    pontosBonus += 1; xGravar("pontosBonus", pontosBonus);
  }
  xGravar("ouroGasto", xLer("ouroGasto", 0) + it.preco);
  registrarLog(`Comprou ${it.nome} por ${it.preco} ouro`);
  if (id === "caixa") darItem(sortearItem(sortearRaridade()), "Loja do Sistema");
  else if (id === "caixaRara") darItem(sortearItem(Math.max(1, sortearRaridade())), "Loja do Sistema");
  else notificar("COMPRA REALIZADA", `${it.icone} ${it.nome}`);
  verificarSistema();
}

function fundir(itemId) {
  const it = ITENS[itemId];
  const uids = inventario.filter(i => i.itemId === itemId).slice(0, 3).map(i => i.uid);
  if (uids.length < 3 || it.raridade >= 4) return;
  const novo = `${it.slot}-${it.raridade + 1}`;
  inventario = inventario.filter(i => !uids.includes(i.uid));
  inventario.push({ uid: novoUid(), itemId: novo });
  salvar("inventario", inventario);
  const n = ITENS[novo];
  notificar("FUSÃO CONCLUÍDA", `3× ${nomeColorido(it)}<br>→ ${nomeColorido(n)}`, "level");
  registrarLog(`Fusão: 3× ${it.nome} → ${n.nome}`);
  verificarSistema();
}

function extrairSombra(id) {
  const l = xLer("sombrasExtraidas", []);
  if (l.includes(id)) return;
  l.push(id); xGravar("sombrasExtraidas", l);
  const s = SOMBRAS.find(x => x.id === id);
  notificar("ARISE!", `A sombra <strong>${s.nome}</strong> — ${s.titulo} — juntou-se ao seu exército.`, "level");
  registrarLog(`Extraiu a sombra ${s.nome}`);
  verificarSistema();
}

document.addEventListener("click", e => {
  const t = e.target;
  if (t.dataset.comprar) comprar(t.dataset.comprar);
  else if (t.dataset.fundir) fundir(t.dataset.fundir);
  else if (t.dataset.sombra) extrairSombra(t.dataset.sombra);
});

// =====================================================
// Progresso: medidas, recordes, gráficos e calendário
// =====================================================
$("form-medidas").addEventListener("submit", e => {
  e.preventDefault();
  const reg = { data: dataSel };
  ["cintura", "peito", "braco", "coxa"].forEach(k => { const v = +$(`med-${k}`).value; if (v) reg[k] = v; });
  if (Object.keys(reg).length === 1) return;
  medidas = medidas.filter(x => x.data !== dataSel);
  medidas.push(reg);
  medidas.sort((a, b) => a.data.localeCompare(b.data));
  xGravar("medidas", medidas);
  ["cintura", "peito", "braco", "coxa"].forEach(k => $(`med-${k}`).value = "");
  verificarSistema();
});

function renderMedidas() {
  const ul = $("lista-medidas");
  if (!medidas.length) { ul.innerHTML = `<li class="vazio">Nenhuma medida registrada. Cada 4 registros (peso + medidas) = +1 VIT.</li>`; return; }
  const nomes = { cintura: "Cintura", peito: "Peito", braco: "Braço", coxa: "Coxa" };
  ul.innerHTML = [...medidas].reverse().slice(0, 8).map((m, i, arr) => {
    const ant = arr[i + 1];
    return `<li><div class="info">${dataBR(m.data)}<small>${Object.keys(nomes).filter(k => m[k]).map(k => {
      const d = ant && ant[k] ? r1(m[k] - ant[k]) : null;
      return `${nomes[k]} ${m[k]} cm${d ? ` (${d > 0 ? "+" : ""}${d})` : ""}`;
    }).join(" · ")}</small></div>
    <button class="remover" data-rem-medida="${m.data}" title="Remover">✕</button></li>`;
  }).join("");
  ul.querySelectorAll("[data-rem-medida]").forEach(b => b.onclick = () => {
    medidas = medidas.filter(x => x.data !== b.dataset.remMedida);
    xGravar("medidas", medidas);
    verificarSistema();
  });
}

function renderPRs() {
  const { prs, maxCarga, maxKm } = listarPRs();
  const atuais = [...Object.entries(maxCarga).map(([k, v]) => `🏋️ ${esc(k)}: <strong>${v} kg</strong>`),
    ...Object.entries(maxKm).map(([k, v]) => `🏃 ${esc(k)}: <strong>${v} km</strong>`)];
  $("lista-prs").innerHTML = atuais.length
    ? atuais.map(a => `<li>${a}</li>`).join("") +
      (prs.length ? `<li><small>Últimos recordes batidos:</small></li>` +
        prs.slice(-5).reverse().map(x => `<li><small>${dataBR(x.data)} — ${esc(x.desc)}</small></li>`).join("") : "")
    : `<li class="vazio">Marque treinos com carga e registre cárdios para ver seus recordes. Cada recorde novo = +30 XP e +20 🪙.</li>`;
}

function graficoBarras(valores, rotulos, cor, un) {
  const W = 300, H = 120, P = 18, max = Math.max(1, ...valores);
  const bw = (W - 2 * P) / valores.length;
  return `<svg viewBox="0 0 ${W} ${H}" class="barras">` + valores.map((v, i) => {
    const h = (v / max) * (H - 2 * P), x = P + i * bw + 3, y = H - P - h;
    return `<rect x="${x}" y="${y}" width="${bw - 6}" height="${h}" fill="${cor}" rx="2"><title>${rotulos[i]}: ${v} ${un}</title></rect>
      <text x="${x + (bw - 6) / 2}" y="${y - 3}" text-anchor="middle">${v || ""}</text>
      <text x="${x + (bw - 6) / 2}" y="${H - 4}" text-anchor="middle">${rotulos[i]}</text>`;
  }).join("") + `</svg>`;
}

function renderGraficosSemana(p) {
  const ini = inicioSemana(hojeStr());
  const semanas = Array.from({ length: 8 }, (_, i) => somarDias(ini, -7 * (7 - i)));
  const rot = semanas.map(s => s.slice(8, 10) + "/" + s.slice(5, 7));
  const ex = [], km = [], mis = [];
  semanas.forEach(s => {
    const dias = diasEntre(s, 7);
    ex.push(exerciciosEm(dias));
    km.push(r1(kmEm(dias)));
    mis.push(dias.reduce((t, d) => t + (p.xStats[d] ? p.xStats[d].ok : 0), 0));
  });
  $("graficos-semana").innerHTML =
    `<div class="rotulo">EXERCÍCIOS</div>${graficoBarras(ex, rot, "#3b82f6", "exercícios")}
     <div class="rotulo">KM DE CÁRDIO</div>${graficoBarras(km, rot, "#22c55e", "km")}
     <div class="rotulo">MISSÕES CONCLUÍDAS</div>${graficoBarras(mis, rot, "#a855f7", "missões")}`;
}

function renderCalendario(p) {
  const hoje = hojeStr();
  const ini = somarDias(inicioSemana(hoje), -7 * 15);
  let html = `<div class="calor">`;
  for (let w = 0; w < 16; w++) {
    html += `<div class="calor-col">`;
    for (let d = 0; d < 7; d++) {
      const dia = somarDias(ini, w * 7 + d);
      const st = p.xStats[dia];
      const v = st ? st.ok / st.total : 0;
      const nivel = dia > hoje ? "futuro" : !st ? "n0" : v >= 1 ? "n4" : v >= 0.75 ? "n3" : v >= 0.5 ? "n2" : "n1";
      html += `<div class="calor-cel ${nivel}" title="${dataBR(dia)}: ${st ? `${st.ok}/${st.total} missões` : "sem registro"}"></div>`;
    }
    html += `</div>`;
  }
  $("calendario-calor").innerHTML = html + `</div>`;
}

// =====================================================
// Envolve a verificação central e inicia
// =====================================================
const _verificarOriginal = verificarSistema;
verificarSistema = function () {
  _verificarOriginal();
  try { verificarExtras(); } catch (err) { console.error("Extras:", err); }
};

// A cada minuto: emergência (prazo) e lembretes, sem redesenhar a tela toda
setInterval(() => {
  try {
    if (checarEmergencia()) verificarSistema();
    else renderEmergencia();
    checarLembrete();
  } catch (err) { console.error(err); }
}, 60000);

verificarSistema();
