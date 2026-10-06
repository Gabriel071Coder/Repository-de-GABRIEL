// =====================================================
// Utilitários
// =====================================================
const $ = id => document.getElementById(id);
const carregar = (chave, padrao) => JSON.parse(localStorage.getItem(chave)) ?? padrao;
// Chaves internas do Sistema (não disparam recálculo de XP)
const CHAVES_SISTEMA = ["nivelSalvo", "logSistema", "inventario", "equipados", "pendentes",
  "recompensasRecebidas", "nomePersonagem", "pontosStatus", "titulosVistos", "avisoPenal", "tituloSel"];
const salvar = (chave, valor) => {
  localStorage.setItem(chave, JSON.stringify(valor));
  if (!CHAVES_SISTEMA.includes(chave) && typeof agendarSistema === "function") agendarSistema();
};
const esc = s => String(s ?? "").replace(/[&<>"']/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const ORDEM_SEMANA = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

const isoLocal = d => d.toLocaleDateString("sv-SE"); // AAAA-MM-DD
const paraData = iso => new Date(iso + "T12:00:00");
const diaSemana = iso => DIAS[paraData(iso).getDay()];
const dataBR = iso => paraData(iso).toLocaleDateString("pt-BR");
const somarDias = (iso, n) => { const d = paraData(iso); d.setDate(d.getDate() + n); return isoLocal(d); };
const ultimosDias = (iso, n) => Array.from({ length: n }, (_, i) => somarDias(iso, -(n - 1 - i)));
const soma = (lista, campo) => lista.reduce((s, x) => s + (+x[campo] || 0), 0);
const r1 = n => Math.round(n * 10) / 10;

function pct(valor, meta) { return meta ? Math.min(100, (valor / meta) * 100) : 0; }

function barraHTML(rotulo, valor, meta, unidade) {
  const p = pct(valor, meta);
  const classe = meta && valor > meta * 1.1 ? "excesso" : p >= 90 ? "ok" : "";
  return `<div>${rotulo}: <strong>${r1(valor)}</strong> / ${meta || "—"} ${unidade}</div>
          <div class="barra"><div class="${classe}" style="width:${p}%"></div></div>`;
}

function botaoRemover(onClick) {
  const b = document.createElement("button");
  b.className = "remover";
  b.textContent = "✕";
  b.title = "Remover";
  b.addEventListener("click", onClick);
  return b;
}

// Gráfico de linha simples em SVG
function graficoLinha(pontos, unidade) {
  if (pontos.length < 2) return `<p class="vazio">Registre ao menos 2 valores para ver o gráfico.</p>`;
  const W = 300, H = 160, P = 25;
  const vals = pontos.map(p => p.valor);
  let min = Math.min(...vals), max = Math.max(...vals);
  if (min === max) { min -= 1; max += 1; }
  const x = i => P + (i * (W - 2 * P)) / (pontos.length - 1);
  const y = v => H - P - ((v - min) * (H - 2 * P)) / (max - min);
  const linha = pontos.map((p, i) => `${x(i)},${y(p.valor)}`).join(" ");
  const circulos = pontos.map((p, i) =>
    `<circle cx="${x(i)}" cy="${y(p.valor)}" r="3" fill="#60a5fa"><title>${dataBR(p.data)}: ${p.valor} ${unidade}</title></circle>`).join("");
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
    <text x="2" y="${y(max) + 4}">${r1(max)}</text>
    <text x="2" y="${y(min) + 4}">${r1(min)}</text>
    <polyline points="${linha}" fill="none" stroke="#3b82f6" stroke-width="2"/>
    ${circulos}
    <text x="${P}" y="${H - 5}">${dataBR(pontos[0].data)}</text>
    <text x="${W - P - 50}" y="${H - 5}">${dataBR(pontos.at(-1).data)}</text>
  </svg>`;
}

// =====================================================
// Estado
// =====================================================
let dataSel = isoLocal(new Date());

let treinos = carregar("treinos", []);              // plano semanal
let feitos = carregar("feitos", {});                // { data: [idTreino] }
let historicoCargas = carregar("historicoCargas", []); // [{data, exercicio, carga, series, reps}]
let cardios = carregar("cardios", []).filter(c => c.data); // [{id, data, ...}]
let refeicoes = carregar("refeicoes", {});          // { data: [...] }
let metas = carregar("metas", { kcal: 2000, prot: 120, carb: 250, gord: 60 });
let perfil = carregar("perfil", null);
let pesos = carregar("pesos", []);                  // [{data, peso}]
let agua = carregar("agua", {});                    // { data: ml }
let sono = carregar("sono", {});                    // { data: horas }
let bancoUsuario = carregar("bancoAlimentos", {});  // { nome: {kcal, prot, carb, gord} por 100g }

// Valores por 100 g (aproximados, tabela TACO/USDA)
const BANCO_PADRAO = {
  "Arroz branco cozido": { kcal: 128, prot: 2.5, carb: 28.1, gord: 0.2 },
  "Arroz integral cozido": { kcal: 124, prot: 2.6, carb: 25.8, gord: 1.0 },
  "Feijão carioca cozido": { kcal: 76, prot: 4.8, carb: 13.6, gord: 0.5 },
  "Feijão preto cozido": { kcal: 77, prot: 4.5, carb: 14.0, gord: 0.5 },
  "Peito de frango grelhado": { kcal: 159, prot: 32.0, carb: 0, gord: 2.5 },
  "Carne moída (patinho) cozida": { kcal: 219, prot: 35.9, carb: 0, gord: 7.3 },
  "Alcatra grelhada": { kcal: 241, prot: 31.9, carb: 0, gord: 11.6 },
  "Tilápia grelhada": { kcal: 128, prot: 26.0, carb: 0, gord: 2.7 },
  "Atum em água": { kcal: 116, prot: 26.0, carb: 0, gord: 1.0 },
  "Ovo inteiro cozido": { kcal: 146, prot: 13.3, carb: 0.6, gord: 9.5 },
  "Clara de ovo": { kcal: 52, prot: 10.9, carb: 0.7, gord: 0.2 },
  "Batata-doce cozida": { kcal: 77, prot: 0.6, carb: 18.4, gord: 0.1 },
  "Batata inglesa cozida": { kcal: 52, prot: 1.2, carb: 11.9, gord: 0 },
  "Mandioca cozida": { kcal: 125, prot: 0.6, carb: 30.1, gord: 0.3 },
  "Macarrão cozido": { kcal: 158, prot: 5.8, carb: 30.9, gord: 0.9 },
  "Pão francês": { kcal: 300, prot: 8.0, carb: 58.6, gord: 3.1 },
  "Pão integral": { kcal: 253, prot: 9.4, carb: 49.9, gord: 3.7 },
  "Aveia em flocos": { kcal: 394, prot: 13.9, carb: 66.6, gord: 8.5 },
  "Tapioca (goma)": { kcal: 240, prot: 0, carb: 60.0, gord: 0 },
  "Banana prata": { kcal: 98, prot: 1.3, carb: 26.0, gord: 0.1 },
  "Maçã": { kcal: 56, prot: 0.3, carb: 15.2, gord: 0 },
  "Mamão papaia": { kcal: 40, prot: 0.5, carb: 10.4, gord: 0.1 },
  "Morango": { kcal: 30, prot: 0.9, carb: 6.8, gord: 0.3 },
  "Abacate": { kcal: 96, prot: 1.2, carb: 6.0, gord: 8.4 },
  "Brócolis cozido": { kcal: 25, prot: 2.1, carb: 4.4, gord: 0.5 },
  "Alface": { kcal: 11, prot: 1.3, carb: 1.7, gord: 0.2 },
  "Tomate": { kcal: 15, prot: 1.1, carb: 3.1, gord: 0.2 },
  "Leite integral": { kcal: 61, prot: 3.2, carb: 4.7, gord: 3.3 },
  "Leite desnatado": { kcal: 35, prot: 3.4, carb: 5.0, gord: 0.1 },
  "Iogurte natural": { kcal: 51, prot: 4.1, carb: 1.9, gord: 3.0 },
  "Queijo minas frescal": { kcal: 264, prot: 17.4, carb: 3.2, gord: 20.2 },
  "Requeijão light": { kcal: 180, prot: 11.0, carb: 4.0, gord: 13.0 },
  "Whey protein": { kcal: 400, prot: 80.0, carb: 8.0, gord: 6.0 },
  "Pasta de amendoim": { kcal: 588, prot: 25.0, carb: 20.0, gord: 50.0 },
  "Castanha-do-pará": { kcal: 643, prot: 14.5, carb: 15.1, gord: 63.5 },
  "Azeite de oliva": { kcal: 884, prot: 0, carb: 0, gord: 100.0 },
  "Granola": { kcal: 421, prot: 10.0, carb: 64.0, gord: 14.0 },
  "Cuscuz de milho cozido": { kcal: 113, prot: 2.2, carb: 25.3, gord: 0.7 },
};
const banco = () => ({ ...BANCO_PADRAO, ...bancoUsuario });
const pesoAtual = () => pesos.length ? pesos.at(-1).peso : perfil?.peso || 70;

// =====================================================
// Data global e abas
// =====================================================
const inputData = $("data-sel");
inputData.value = dataSel;
inputData.addEventListener("change", () => { dataSel = inputData.value || isoLocal(new Date()); renderizarTudo(); });
$("btn-hoje").addEventListener("click", () => { dataSel = inputData.value = isoLocal(new Date()); renderizarTudo(); });

document.querySelectorAll(".tab").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab, .painel").forEach(el => el.classList.remove("ativo"));
    btn.classList.add("ativo");
    $(btn.dataset.tab).classList.add("ativo");
    renderizarTudo();
  });
});

// =====================================================
// TREINOS
// =====================================================
$("form-treino").addEventListener("submit", e => {
  e.preventDefault();
  treinos.push({
    id: Date.now(),
    dia: $("treino-dia").value,
    exercicio: $("treino-exercicio").value.trim(),
    grupo: $("treino-grupo").value,
    series: +$("treino-series").value,
    reps: +$("treino-reps").value,
    carga: +$("treino-carga").value || 0,
    descanso: +$("treino-descanso").value || 0,
    obs: $("treino-obs").value.trim(),
  });
  salvar("treinos", treinos);
  ["exercicio", "series", "reps", "carga", "descanso", "obs"].forEach(c => $(`treino-${c}`).value = "");
  renderizarTreinos();
});

function textoTreino(t) {
  return `${t.exercicio} — ${t.series}x${t.reps}${t.carga ? ` @ ${t.carga}kg` : ""}`;
}

function alternarFeito(t, marcado) {
  const lista = new Set(feitos[dataSel] || []);
  historicoCargas = historicoCargas.filter(h => !(h.data === dataSel && h.idTreino === t.id));
  if (marcado) {
    lista.add(t.id);
    historicoCargas.push({ data: dataSel, idTreino: t.id, exercicio: t.exercicio, carga: t.carga, series: t.series, reps: t.reps });
    historicoCargas.sort((a, b) => a.data.localeCompare(b.data));
  } else {
    lista.delete(t.id);
  }
  feitos[dataSel] = [...lista];
  salvar("feitos", feitos);
  salvar("historicoCargas", historicoCargas);
  renderizarTreinos();
}

function renderizarTreinos() {
  const container = $("lista-treinos");
  container.innerHTML = "";
  const diaAtual = diaSemana(dataSel);
  const feitosDia = feitos[dataSel] || [];

  ORDEM_SEMANA.forEach(dia => {
    const doDia = treinos.filter(t => t.dia === dia);
    const div = document.createElement("div");
    div.className = "dia" + (dia === diaAtual ? " selecionado" : "");
    const concluidos = doDia.filter(t => feitosDia.includes(t.id)).length;
    div.innerHTML = `<h3>${dia}${dia === diaAtual && doDia.length ? ` <span class="badge">${concluidos}/${doDia.length} feitos</span>` : ""}</h3>`;
    const ul = document.createElement("ul");
    if (!doDia.length) ul.innerHTML = "<li>Descanso</li>";

    doDia.forEach(t => {
      const li = document.createElement("li");
      const feito = dia === diaAtual && feitosDia.includes(t.id);
      if (feito) li.classList.add("feito");

      if (dia === diaAtual) {
        const chk = document.createElement("input");
        chk.type = "checkbox";
        chk.checked = feito;
        chk.style.flex = "none";
        chk.title = "Marcar como feito";
        chk.addEventListener("change", () => alternarFeito(t, chk.checked));
        li.appendChild(chk);
      }

      const info = document.createElement("div");
      info.className = "info";
      info.innerHTML = `${esc(textoTreino(t))}<span class="badge">${esc(t.grupo || "—")}</span>
        <small>${t.descanso ? `Descanso: ${t.descanso}s` : ""}${t.obs ? ` · ${esc(t.obs)}` : ""}</small>`;
      li.appendChild(info);

      li.appendChild(botaoRemover(() => {
        treinos = treinos.filter(x => x.id !== t.id);
        salvar("treinos", treinos);
        renderizarTreinos();
      }));
      ul.appendChild(li);
    });
    div.appendChild(ul);
    container.appendChild(div);
  });

  // Equilíbrio de grupos musculares
  const porGrupo = {};
  treinos.forEach(t => porGrupo[t.grupo || "Sem grupo"] = (porGrupo[t.grupo || "Sem grupo"] || 0) + t.series);
  const maximo = Math.max(1, ...Object.values(porGrupo));
  $("equilibrio-grupos").innerHTML = Object.keys(porGrupo).length
    ? Object.entries(porGrupo).sort((a, b) => b[1] - a[1]).map(([g, s]) =>
        `<div class="grupo-linha"><span>${esc(g)}</span>
          <div class="barra"><div style="width:${(s / maximo) * 100}%"></div></div>
          <span>${s} séries</span></div>`).join("") +
      `<small>Referência comum: 10 a 20 séries por grupo grande por semana.</small>`
    : `<p class="vazio">Adicione exercícios para ver o equilíbrio.</p>`;
}

// =====================================================
// CÁRDIO
// =====================================================
const MET_BASE = { Corrida: 9.8, Caminhada: 3.8, Bicicleta: 7.5, Esteira: 8.5, "Elíptico": 5.0, "Natação": 7.0 };
const FATOR_INTENSIDADE = { leve: 0.75, moderado: 1, intenso: 1.25, intervalado: 1.35 };

function calcularPace(minutos, km) {
  if (!minutos || !km) return "";
  const totalSeg = Math.round((minutos * 60) / km);
  return `${Math.floor(totalSeg / 60)}:${String(totalSeg % 60).padStart(2, "0")}`;
}
const paceEmSeg = pace => { if (!pace) return Infinity; const [m, s] = pace.split(":").map(Number); return m * 60 + s; };

function calcularKcalCardio(tipo, intensidade, minutos) {
  const met = (MET_BASE[tipo] || 6) * (FATOR_INTENSIDADE[intensidade] || 1);
  return Math.round(met * pesoAtual() * (minutos / 60));
}

function atualizarPreviaCardio() {
  const min = +$("cardio-minutos").value, km = +$("cardio-km").value;
  const p = calcularPace(min, km);
  $("cardio-pace").value = p ? `${p} min/km` : "";
  $("cardio-kcal").value = min ? `${calcularKcalCardio($("cardio-tipo").value, $("cardio-intensidade").value, min)} kcal` : "";
}
["cardio-minutos", "cardio-km", "cardio-tipo", "cardio-intensidade"].forEach(id =>
  $(id).addEventListener("input", atualizarPreviaCardio));

$("form-cardio").addEventListener("submit", e => {
  e.preventDefault();
  const minutos = +$("cardio-minutos").value;
  const km = +$("cardio-km").value;
  const tipo = $("cardio-tipo").value;
  const intensidade = $("cardio-intensidade").value;
  cardios.push({
    id: Date.now(),
    data: dataSel,
    tipo, intensidade, minutos, km,
    fc: +$("cardio-fc").value || null,
    pace: calcularPace(minutos, km),
    kcal: calcularKcalCardio(tipo, intensidade, minutos),
  });
  cardios.sort((a, b) => a.data.localeCompare(b.data));
  salvar("cardios", cardios);
  ["minutos", "km", "fc", "pace", "kcal"].forEach(c => $(`cardio-${c}`).value = "");
  renderizarCardio();
});

function textoCardio(c) {
  return `${c.tipo} (${c.intensidade}) — ${c.minutos} min · ${c.km} km${c.pace ? ` · pace ${c.pace}/km` : ""} · ${c.kcal} kcal${c.fc ? ` · ${c.fc} bpm` : ""}`;
}

function renderizarCardio() {
  const ul = $("lista-cardio");
  ul.innerHTML = "";
  const doDia = cardios.filter(c => c.data === dataSel);
  if (!doDia.length) ul.innerHTML = `<li class="vazio">Nenhuma sessão neste dia.</li>`;
  doDia.forEach(c => {
    const li = document.createElement("li");
    li.innerHTML = `<div class="info">${esc(textoCardio(c))}</div>`;
    li.appendChild(botaoRemover(() => {
      cardios = cardios.filter(x => x.id !== c.id);
      salvar("cardios", cardios);
      renderizarCardio();
    }));
    ul.appendChild(li);
  });

  // Estatísticas
  const semana = ultimosDias(dataSel, 7);
  const daSemana = cardios.filter(c => semana.includes(c.data));
  const doMes = cardios.filter(c => c.data.slice(0, 7) === dataSel.slice(0, 7));
  const corridas = cardios.filter(c => c.km > 0 && ["Corrida", "Esteira"].includes(c.tipo));
  const melhor = corridas.sort((a, b) => paceEmSeg(a.pace) - paceEmSeg(b.pace))[0];
  const maisLonga = [...cardios].sort((a, b) => b.km - a.km)[0];
  $("stats-cardio").innerHTML = `
    <p><strong>Últimos 7 dias:</strong> ${r1(soma(daSemana, "km"))} km · ${r1(soma(daSemana, "minutos"))} min · ${soma(daSemana, "kcal")} kcal (${daSemana.length} sessões)</p>
    <p><strong>No mês:</strong> ${r1(soma(doMes, "km"))} km · ${r1(soma(doMes, "minutos"))} min (${doMes.length} sessões)</p>
    <p><strong>Melhor pace (corrida):</strong> ${melhor ? `${melhor.pace}/km em ${dataBR(melhor.data)}` : "—"}</p>
    <p><strong>Maior distância:</strong> ${maisLonga && maisLonga.km ? `${maisLonga.km} km (${maisLonga.tipo}) em ${dataBR(maisLonga.data)}` : "—"}</p>
    <small>Calorias estimadas por MET × peso (${pesoAtual()} kg) × tempo.</small>`;

  // Histórico
  const ult = [...cardios].reverse().slice(0, 15);
  $("historico-cardio").innerHTML = ult.length
    ? `<tr><th>Data</th><th>Tipo</th><th>Intens.</th><th>Min</th><th>Km</th><th>Pace</th><th>Kcal</th><th>FC</th></tr>` +
      ult.map(c => `<tr><td>${dataBR(c.data)}</td><td>${esc(c.tipo)}</td><td>${esc(c.intensidade)}</td><td>${c.minutos}</td>
        <td>${c.km}</td><td>${c.pace || "—"}</td><td>${c.kcal}</td><td>${c.fc || "—"}</td></tr>`).join("")
    : `<tr><td class="vazio">Sem histórico ainda.</td></tr>`;
}

// =====================================================
// ALIMENTAÇÃO
// =====================================================
const campoPerfil = id => $(`perfil-${id}`);

function calcularMetas(p) {
  // Mifflin-St Jeor
  const tmb = 10 * p.peso + 6.25 * p.altura - 5 * p.idade + (p.sexo === "M" ? 5 : -161);
  const gasto = tmb * p.atividade;
  const ajuste = { perder: -500, manter: 0, ganhar: 300 }[p.objetivo];
  const gPorKg = { perder: 2.0, manter: 1.6, ganhar: 2.0 }[p.objetivo];
  const kcal = Math.round(gasto + ajuste);
  const prot = Math.round(p.peso * gPorKg);
  const gord = Math.round((kcal * 0.25) / 9);                 // 25% das kcal em gordura
  const carb = Math.max(0, Math.round((kcal - prot * 4 - gord * 9) / 4)); // restante em carbo
  return {
    tmb: Math.round(tmb), gasto: Math.round(gasto),
    kcal, prot, carb, gord, gPorKg,
    imc: (p.peso / (p.altura / 100) ** 2).toFixed(1),
    aguaMl: Math.round(p.peso * 35),
  };
}

function classificarIMC(imc) {
  if (imc < 18.5) return "abaixo do peso";
  if (imc < 25) return "peso normal";
  if (imc < 30) return "sobrepeso";
  return "obesidade";
}

function mostrarResultadoPerfil() {
  if (!perfil) return;
  const r = calcularMetas(perfil);
  $("resultado-perfil").innerHTML = `
    <strong>IMC:</strong> ${r.imc} <small>(${classificarIMC(+r.imc)})</small><br>
    <strong>Metabolismo basal:</strong> ${r.tmb} kcal/dia <small>(gasto em repouso)</small><br>
    <strong>Gasto diário total:</strong> ${r.gasto} kcal/dia <small>(com atividade)</small><br>
    <strong>Metas:</strong> ${r.kcal} kcal · ${r.prot} g proteína (${r.gPorKg} g/kg) · ${r.carb} g carbo · ${r.gord} g gordura<br>
    <strong>Água:</strong> ${(r.aguaMl / 1000).toFixed(1)} L/dia <small>(35 ml por kg)</small><br>
    <small>Estimativas pela fórmula Mifflin-St Jeor. Consulte um nutricionista para um plano individual.</small>`;
}

if (perfil) {
  ["peso", "altura", "idade", "sexo", "atividade", "objetivo"].forEach(c => campoPerfil(c).value = perfil[c]);
  mostrarResultadoPerfil();
}

function registrarPeso(data, peso) {
  pesos = pesos.filter(p => p.data !== data);
  pesos.push({ data, peso });
  pesos.sort((a, b) => a.data.localeCompare(b.data));
  salvar("pesos", pesos);
}

$("form-perfil").addEventListener("submit", e => {
  e.preventDefault();
  perfil = {
    peso: +campoPerfil("peso").value,
    altura: +campoPerfil("altura").value,
    idade: +campoPerfil("idade").value,
    sexo: campoPerfil("sexo").value,
    atividade: +campoPerfil("atividade").value,
    objetivo: campoPerfil("objetivo").value,
  };
  salvar("perfil", perfil);
  registrarPeso(dataSel, perfil.peso);
  const r = calcularMetas(perfil);
  metas = { kcal: r.kcal, prot: r.prot, carb: r.carb, gord: r.gord };
  salvar("metas", metas);
  preencherMetas();
  mostrarResultadoPerfil();
  renderizarTudo();
});

// Metas editáveis
const CAMPOS_META = ["kcal", "prot", "carb", "gord"];
function preencherMetas() { CAMPOS_META.forEach(c => $(`meta-${c}`).value = metas[c] ?? ""); }
preencherMetas();
CAMPOS_META.forEach(c => $(`meta-${c}`).addEventListener("change", () => {
  metas[c] = +$(`meta-${c}`).value || 0;
  salvar("metas", metas);
  renderizarResumo();
}));

// Banco de alimentos
function atualizarDatalist() {
  $("banco-alimentos").innerHTML = Object.keys(banco()).sort()
    .map(n => `<option value="${esc(n)}">`).join("");
}

function autoPreencherAlimento() {
  const item = banco()[$("refeicao-alimento").value.trim()];
  const g = +$("refeicao-gramas").value;
  if (!item) return;
  if (!g) $("refeicao-gramas").value = 100;
  const fator = (+$("refeicao-gramas").value) / 100;
  $("refeicao-kcal").value = Math.round(item.kcal * fator);
  $("refeicao-prot").value = r1(item.prot * fator);
  $("refeicao-carb").value = r1(item.carb * fator);
  $("refeicao-gord").value = r1(item.gord * fator);
}
$("refeicao-alimento").addEventListener("change", autoPreencherAlimento);
$("refeicao-gramas").addEventListener("input", autoPreencherAlimento);

$("form-refeicao").addEventListener("submit", e => {
  e.preventDefault();
  const nome = $("refeicao-alimento").value.trim();
  const r = {
    id: Date.now(),
    tipo: $("refeicao-tipo").value,
    alimento: nome,
    gramas: +$("refeicao-gramas").value || 0,
    kcal: +$("refeicao-kcal").value || 0,
    prot: +$("refeicao-prot").value || 0,
    carb: +$("refeicao-carb").value || 0,
    gord: +$("refeicao-gord").value || 0,
  };
  // Novo alimento com gramas: salva no banco (valores por 100 g)
  if (!banco()[nome] && r.gramas > 0) {
    const f = 100 / r.gramas;
    bancoUsuario[nome] = { kcal: Math.round(r.kcal * f), prot: r1(r.prot * f), carb: r1(r.carb * f), gord: r1(r.gord * f) };
    salvar("bancoAlimentos", bancoUsuario);
    atualizarDatalist();
  }
  refeicoes[dataSel] = refeicoes[dataSel] || [];
  refeicoes[dataSel].push(r);
  salvar("refeicoes", refeicoes);
  ["alimento", "gramas", "kcal", "prot", "carb", "gord"].forEach(c => $(`refeicao-${c}`).value = "");
  renderizarRefeicoes();
});

const totaisDoDia = data => {
  const l = refeicoes[data] || [];
  return { kcal: soma(l, "kcal"), prot: soma(l, "prot"), carb: soma(l, "carb"), gord: soma(l, "gord") };
};

function renderizarRefeicoes() {
  const container = $("lista-refeicoes");
  container.innerHTML = "";
  const doDia = refeicoes[dataSel] || [];
  const t = totaisDoDia(dataSel);
  $("totais-dia").innerHTML = doDia.length
    ? `<strong>Total do dia:</strong> ${Math.round(t.kcal)} / ${metas.kcal} kcal ·
       P ${r1(t.prot)}/${metas.prot} g · C ${r1(t.carb)}/${metas.carb} g · G ${r1(t.gord)}/${metas.gord} g`
    : "";

  const tipos = [...new Set(doDia.map(r => r.tipo))];
  if (!tipos.length) container.innerHTML = `<p class="vazio">Nenhuma refeição registrada neste dia.</p>`;
  tipos.forEach(tipo => {
    const itens = doDia.filter(r => r.tipo === tipo);
    const div = document.createElement("div");
    div.className = "refeicao";
    div.innerHTML = `<h3>${esc(tipo)} <span class="badge">${Math.round(soma(itens, "kcal"))} kcal</span></h3>`;
    const ul = document.createElement("ul");
    itens.forEach(r => {
      const li = document.createElement("li");
      li.innerHTML = `<div class="info">${esc(r.alimento)}${r.gramas ? ` (${r.gramas} g)` : ""} — ${r.kcal} kcal
        <small>P ${r.prot} g · C ${r.carb} g · G ${r.gord} g</small></div>`;
      li.appendChild(botaoRemover(() => {
        refeicoes[dataSel] = (refeicoes[dataSel] || []).filter(x => x.id !== r.id);
        salvar("refeicoes", refeicoes);
        renderizarRefeicoes();
      }));
      ul.appendChild(li);
    });
    div.appendChild(ul);
    container.appendChild(div);
  });
}

// =====================================================
// PROGRESSO
// =====================================================
$("form-peso").addEventListener("submit", e => {
  e.preventDefault();
  const peso = +$("peso-valor").value;
  registrarPeso(dataSel, peso);
  if (perfil) {
    perfil.peso = peso;
    salvar("perfil", perfil);
    campoPerfil("peso").value = peso;
    mostrarResultadoPerfil();
  }
  $("peso-valor").value = "";
  renderizarProgresso();
});

$("select-exercicio").addEventListener("change", renderizarCargas);

function renderizarProgresso() {
  // Peso
  $("grafico-peso").innerHTML = graficoLinha(pesos.map(p => ({ data: p.data, valor: p.peso })), "kg");
  const ul = $("lista-pesos");
  ul.innerHTML = "";
  if (!pesos.length) ul.innerHTML = `<li class="vazio">Nenhum peso registrado.</li>`;
  [...pesos].reverse().slice(0, 10).forEach((p, i, arr) => {
    const anterior = arr[i + 1];
    const dif = anterior ? r1(p.peso - anterior.peso) : null;
    const li = document.createElement("li");
    li.innerHTML = `<div class="info">${dataBR(p.data)} — <strong>${p.peso} kg</strong>
      ${dif !== null ? `<small>${dif > 0 ? "+" : ""}${dif} kg desde o registro anterior</small>` : ""}</div>`;
    li.appendChild(botaoRemover(() => {
      pesos = pesos.filter(x => x.data !== p.data);
      salvar("pesos", pesos);
      renderizarProgresso();
    }));
    ul.appendChild(li);
  });

  // Exercícios disponíveis
  const sel = $("select-exercicio");
  const atual = sel.value;
  const nomes = [...new Set(historicoCargas.map(h => h.exercicio))].sort();
  sel.style.display = nomes.length ? "" : "none";
  sel.innerHTML = nomes.map(n => `<option ${n === atual ? "selected" : ""}>${esc(n)}</option>`).join("");
  renderizarCargas();
}

function renderizarCargas() {
  const nome = $("select-exercicio").value;
  if (!nome) {
    $("grafico-carga").innerHTML = `<p class="vazio">Nenhuma carga registrada ainda.<br>
      Na aba <strong>Treinos</strong>, selecione o dia no topo e marque ✔ os exercícios concluídos.</p>`;
    $("lista-cargas").innerHTML = "";
    return;
  }
  const hist = historicoCargas.filter(h => h.exercicio === nome);
  $("grafico-carga").innerHTML = nome ? graficoLinha(hist.map(h => ({ data: h.data, valor: h.carga })), "kg") : "";
  const recorde = hist.reduce((m, h) => Math.max(m, h.carga), 0);
  $("lista-cargas").innerHTML = hist.length
    ? `<li><strong>Recorde: ${recorde} kg</strong></li>` +
      [...hist].reverse().slice(0, 10).map(h =>
        `<li>${dataBR(h.data)} — ${h.series}x${h.reps} @ ${h.carga} kg</li>`).join("")
    : "";
}

// =====================================================
// RESUMO
// =====================================================
const metaAgua = () => Math.round(pesoAtual() * 35);

document.querySelectorAll("[data-agua]").forEach(b => b.addEventListener("click", () => {
  agua[dataSel] = (agua[dataSel] || 0) + +b.dataset.agua;
  salvar("agua", agua);
  renderizarResumo();
}));
$("reset-agua").addEventListener("click", () => {
  agua[dataSel] = 0;
  salvar("agua", agua);
  renderizarResumo();
});

$("sono-horas").addEventListener("change", () => {
  sono[dataSel] = +$("sono-horas").value || 0;
  salvar("sono", sono);
  renderizarResumo();
});

function statusTreino(data) {
  const plano = treinos.filter(t => t.dia === diaSemana(data));
  if (!plano.length) return { texto: "Descanso", ok: true };
  const feitosDia = (feitos[data] || []).filter(id => plano.some(t => t.id === id)).length;
  return { texto: `${feitosDia}/${plano.length}`, ok: feitosDia === plano.length };
}

function renderizarResumo() {
  // Treino
  const plano = treinos.filter(t => t.dia === diaSemana(dataSel));
  const feitosDia = feitos[dataSel] || [];
  $("resumo-treino").innerHTML = plano.length
    ? plano.map(t => `<li>${feitosDia.includes(t.id) ? "✅" : "⬜"} ${esc(textoTreino(t))}</li>`).join("")
    : "<li>Dia de descanso 😴</li>";

  // Cárdio
  const cardioDia = cardios.filter(c => c.data === dataSel);
  $("resumo-cardio").innerHTML = cardioDia.length
    ? cardioDia.map(c => `<li>${esc(textoCardio(c))}</li>`).join("")
    : "<li>Sem cárdio neste dia</li>";

  // Macros
  const t = totaisDoDia(dataSel);
  $("resumo-macros").innerHTML =
    barraHTML("Calorias", t.kcal, metas.kcal, "kcal") +
    barraHTML("Proteína", t.prot, metas.prot, "g") +
    barraHTML("Carboidrato", t.carb, metas.carb, "g") +
    barraHTML("Gordura", t.gord, metas.gord, "g");

  // Saldo
  const gastoCardio = soma(cardioDia, "kcal");
  const gastoBase = perfil ? calcularMetas(perfil).gasto : null;
  const saldo = gastoBase !== null ? Math.round(t.kcal - gastoBase - gastoCardio) : null;
  $("resumo-saldo").innerHTML = `
    <p>Consumido: <strong>${Math.round(t.kcal)} kcal</strong></p>
    <p>Gasto no cárdio: <strong>${gastoCardio} kcal</strong></p>
    <p>Líquido (consumido − cárdio): <strong>${Math.round(t.kcal - gastoCardio)} kcal</strong></p>
    ${saldo !== null
      ? `<p>Saldo vs. gasto diário (${gastoBase} kcal): <strong style="color:${saldo < 0 ? "var(--ok)" : "var(--alerta)"}">${saldo > 0 ? "+" : ""}${saldo} kcal</strong></p>
         <small>Negativo = déficit (perda de peso) · Positivo = superávit (ganho)</small>`
      : `<small>Preencha o perfil na aba Alimentação para ver o saldo.</small>`}`;

  // Água
  const ml = agua[dataSel] || 0;
  $("resumo-agua").innerHTML = `<strong>${(ml / 1000).toFixed(2)} L</strong> / ${(metaAgua() / 1000).toFixed(1)} L <small>(meta: 35 ml × ${pesoAtual()} kg)</small>`;
  $("barra-agua").style.width = `${pct(ml, metaAgua())}%`;
  $("barra-agua").className = ml >= metaAgua() ? "ok" : "";

  // Sono
  const h = sono[dataSel];
  $("sono-horas").value = h ?? "";
  $("resumo-sono").innerHTML = h === undefined ? "<small>Recomendado: 7 a 9 horas por noite.</small>"
    : h >= 7 ? `✅ ${h} h — boa recuperação.` : `⚠️ ${h} h — abaixo do recomendado (7-9 h).`;

  // Semana
  const ok = v => v ? "✅" : "❌";
  const linhas = ultimosDias(dataSel, 7).map(d => {
    const tot = totaisDoDia(d);
    const tr = statusTreino(d);
    const cd = cardios.filter(c => c.data === d);
    const kcalOk = metas.kcal && tot.kcal >= metas.kcal * 0.9 && tot.kcal <= metas.kcal * 1.1;
    const protOk = metas.prot && tot.prot >= metas.prot * 0.9;
    const aguaOk = (agua[d] || 0) >= metaAgua();
    const sonoOk = (sono[d] || 0) >= 7;
    return { d, tot, tr, cd, kcalOk, protOk, aguaOk, sonoOk };
  });
  const cont = campo => linhas.filter(l => campo(l)).length;
  $("tabela-semana").innerHTML =
    `<tr><th>Dia</th><th>Treino</th><th>Cárdio</th><th>Calorias</th><th>Proteína</th><th>Água</th><th>Sono</th></tr>` +
    linhas.map(l => `<tr${l.d === dataSel ? ' style="background:var(--borda)"' : ""}>
      <td>${diaSemana(l.d).slice(0, 3)} ${dataBR(l.d).slice(0, 5)}</td>
      <td>${ok(l.tr.ok)} ${l.tr.texto}</td>
      <td>${l.cd.length ? `${r1(soma(l.cd, "km"))} km` : "—"}</td>
      <td>${ok(l.kcalOk)} ${Math.round(l.tot.kcal)}</td>
      <td>${ok(l.protOk)} ${r1(l.tot.prot)} g</td>
      <td>${ok(l.aguaOk)} ${((agua[l.d] || 0) / 1000).toFixed(1)} L</td>
      <td>${sono[l.d] !== undefined ? `${ok(l.sonoOk)} ${sono[l.d]} h` : "—"}</td></tr>`).join("") +
    `<tr><th>Metas batidas</th><th>${cont(l => l.tr.ok)}/7</th><th>${r1(soma(linhas.flatMap(l => l.cd), "km"))} km</th>
      <th>${cont(l => l.kcalOk)}/7</th><th>${cont(l => l.protOk)}/7</th><th>${cont(l => l.aguaOk)}/7</th><th>${cont(l => l.sonoOk)}/7</th></tr>`;
}

