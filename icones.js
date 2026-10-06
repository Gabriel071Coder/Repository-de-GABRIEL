// =====================================================
// Ícones ilustrados dos itens (usados nos espaços de equipamento e no inventário)
// =====================================================

// Para usar uma imagem sua (PNG/JPG) no lugar do desenho, salve o arquivo
// na pasta do site e descomente/adicione a linha do espaço correspondente:
const IMAGENS_ITENS = {
  botas: "img/itens/botas.png",
  armadura: "img/itens/armadura.png",
  luvas: "img/itens/luvas.png",
  elmo: "img/itens/elmo.png",
  arma: "img/itens/arma.png",
  // brincos: "img/itens/brincos.png",
  // anel: "img/itens/anel.png",
  // capa: "img/itens/capa.png",
};

let _idIcone = 0;

// Brincos: cristal azul lapidado em moldura dourada com filigrana, gancho e gema superior
function svgBrincos() {
  const id = `br${++_idIcone}`;
  const brinco = (dx, rot) => `<g transform="translate(${dx} 0) rotate(${rot} 25 50)">
    <path d="M27 6 Q18 2 17 10 Q16 16 22 14" fill="none" stroke="url(#${id}o)" stroke-width="1.6" stroke-linecap="round"/>
    <circle cx="25.5" cy="17" r="1.8" fill="none" stroke="url(#${id}o)" stroke-width="1.2"/>
    <path d="M25 19 L29 24.5 L25 30 L21 24.5 Z" fill="url(#${id}c)" stroke="#6b4a12" stroke-width=".8"/>
    <path d="M19 26 Q17 30 21 31 M31 26 Q33 30 29 31" fill="none" stroke="url(#${id}o)" stroke-width="1.3"/>
    <circle cx="25" cy="32.5" r="1.6" fill="none" stroke="url(#${id}o)" stroke-width="1.1"/>
    <path d="M25 35 Q35 44 37 56 Q36 70 25 92 Q14 70 13 56 Q15 44 25 35 Z" fill="url(#${id}o)" stroke="#4a320b" stroke-width=".9"/>
    <path d="M25 39 Q32 47 33 57 Q32 68 25 84 Q18 68 17 57 Q18 47 25 39 Z" fill="url(#${id}c)" stroke="#123c55" stroke-width=".7"/>
    <path d="M25 39 L22 55 L25 84 M22 55 L17 57 M22 55 L30 50 L33 57 M30 50 L25 39 M25 70 L30 63" fill="none" stroke="#d6f4ff" stroke-width=".6" opacity=".75"/>
    <path d="M21 46 Q19 52 21 58" stroke="#fff" stroke-width="1.1" fill="none" opacity=".6"/>
    <path d="M16 46 Q10 50 13 56 Q15 52 18 52 M34 46 Q40 50 37 56 Q35 52 32 52 M18 66 Q14 70 18 74 M32 66 Q36 70 32 74"
      fill="none" stroke="url(#${id}o)" stroke-width="1.4" stroke-linecap="round"/>
  </g>`;
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="${id}o" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#f3d27a"/><stop offset=".5" stop-color="#b8862b"/><stop offset="1" stop-color="#6b4a12"/></linearGradient>
      <linearGradient id="${id}c" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#8fd8f0"/><stop offset=".45" stop-color="#2f8fb8"/><stop offset="1" stop-color="#0f4766"/></linearGradient>
    </defs>
    ${brinco(2, -4)}${brinco(48, 4)}
    <path d="M47 12 L50 6 L52 13 L49 17 Z" fill="#8fd8f0" opacity=".7"/>
    <path d="M86 82 L91 74 L92 86 L88 92 Z" fill="#8fd8f0" opacity=".6"/>
  </svg>`;
}

// Anel: aro de metal escuro, garras ósseas vazadas e esfera vermelha polida
function svgAnel() {
  const id = `an${++_idIcone}`;
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="${id}m" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#b9bcc2"/><stop offset=".4" stop-color="#5b5f66"/><stop offset="1" stop-color="#1f2125"/></linearGradient>
      <radialGradient id="${id}g" cx=".35" cy=".3" r=".75">
        <stop offset="0" stop-color="#f08a8a"/><stop offset=".25" stop-color="#b3262b"/><stop offset=".75" stop-color="#5e0d12"/><stop offset="1" stop-color="#2a0507"/></radialGradient>
    </defs>
    <ellipse cx="54" cy="90" rx="30" ry="5" fill="#000" opacity=".35"/>
    <!-- aro (parte de trás) -->
    <path d="M30 56 Q30 88 56 88 Q84 88 84 60 Q84 50 78 46 L72 50 Q76 54 76 61 Q76 80 56 80 Q38 80 38 58 Z" fill="url(#${id}m)" stroke="#111" stroke-width="1"/>
    <path d="M42 70 Q50 82 66 80" stroke="#9ca3af" stroke-width="1" fill="none" opacity=".5"/>
    <!-- gema -->
    <circle cx="50" cy="32" r="19" fill="url(#${id}g)" stroke="#2a0507" stroke-width="1"/>
    <ellipse cx="43" cy="24" rx="6" ry="3.5" fill="#fff" opacity=".55" transform="rotate(-30 43 24)"/>
    <circle cx="56" cy="40" r="2" fill="#ff9a9a" opacity=".35"/>
    <!-- garras ósseas -->
    <path d="M18 60 Q16 48 26 40 Q30 34 36 33 L40 40 Q34 44 33 50 L42 46 L46 50 Q36 56 34 66 Q26 70 18 60 Z" fill="url(#${id}m)" stroke="#111" stroke-width="1"/>
    <path d="M36 33 L30 24 L40 31 Z" fill="url(#${id}m)" stroke="#111" stroke-width=".8"/>
    <ellipse cx="27" cy="52" rx="3.2" ry="4.5" fill="#15171a" transform="rotate(25 27 52)"/>
    <ellipse cx="35" cy="56" rx="2.2" ry="3" fill="#15171a"/>
    <ellipse cx="24" cy="61" rx="1.8" ry="2.4" fill="#15171a"/>
    <path d="M64 33 Q72 34 78 42 L80 50 Q74 52 68 48 Q66 42 62 40 Z" fill="url(#${id}m)" stroke="#111" stroke-width="1"/>
    <ellipse cx="72" cy="44" rx="2.4" ry="3.2" fill="#15171a"/>
    <path d="M47 50 L54 50 L52 56 L49 56 Z" fill="url(#${id}m)" stroke="#111" stroke-width=".8"/>
    <path d="M20 54 Q24 46 32 42 M70 38 Q75 40 77 45" stroke="#d1d5db" stroke-width=".9" fill="none" opacity=".7"/>
    <!-- runas no aro -->
    <path d="M66 52 l2 -3 l1 3 M71 54 l1 -3 l2 2" stroke="#2a2d31" stroke-width=".9" fill="none"/>
  </svg>`;
}

// Colar: corrente de bronze, argola com espinho, moldura com chifres em meia-lua,
// gema vermelha oval com veios e ponta longa terminando em vermelho
function svgColar() {
  const id = `co${++_idIcone}`;
  const elos = (x1, y1, x2, y2, n) => Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1), x = x1 + (x2 - x1) * t, y = y1 + (y2 - y1) * t;
    return `<ellipse cx="${x}" cy="${y}" rx="2.6" ry="1.5" transform="rotate(${i % 2 ? 60 : -20} ${x} ${y})" fill="none" stroke="url(#${id}o)" stroke-width="1.1"/>`;
  }).join("");
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="${id}o" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#c9a65a"/><stop offset=".5" stop-color="#7d5f26"/><stop offset="1" stop-color="#3d2c10"/></linearGradient>
      <radialGradient id="${id}g" cx=".4" cy=".35" r=".7">
        <stop offset="0" stop-color="#ff8a6a"/><stop offset=".35" stop-color="#d0201c"/><stop offset=".8" stop-color="#7a0b0b"/><stop offset="1" stop-color="#3a0404"/></radialGradient>
      <linearGradient id="${id}p" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#7d5f26"/><stop offset=".55" stop-color="#5a3e14"/><stop offset="1" stop-color="#d0201c"/></linearGradient>
    </defs>
    ${elos(14, 4, 44, 22, 8)}${elos(86, 4, 56, 22, 8)}
    <path d="M50 10 L52 18 L50 21 L48 18 Z" fill="url(#${id}o)"/>
    <circle cx="50" cy="24" r="4" fill="none" stroke="url(#${id}o)" stroke-width="1.8"/>
    <path d="M50 28 L54 34 L50 38 L46 34 Z" fill="url(#${id}o)" stroke="#2a1d08" stroke-width=".6"/>
    <ellipse cx="50" cy="33.5" rx="1.2" ry="2" fill="#d0201c"/>
    <!-- chifres em meia-lua -->
    <path d="M38 38 Q30 32 33 26 Q33 33 41 36 Z M62 38 Q70 32 67 26 Q67 33 59 36 Z" fill="url(#${id}o)" stroke="#2a1d08" stroke-width=".6"/>
    <!-- moldura com espinhos -->
    <path d="M50 36 Q64 38 66 52 L71 50 L66 58 Q66 66 60 72 L64 74 L57 76 L52 82 L50 98 L48 82 L43 76 L36 74 L40 72 Q34 66 34 58 L29 50 L34 52 Q36 38 50 36 Z"
      fill="url(#${id}o)" stroke="#2a1d08" stroke-width=".8"/>
    <path d="M50 82 L52.5 80 L50 99 L47.5 80 Z" fill="url(#${id}p)"/>
    <ellipse cx="50" cy="56" rx="11" ry="15" fill="url(#${id}g)" stroke="#3d2c10" stroke-width="1"/>
    <path d="M44 50 Q50 46 52 54 Q55 62 48 66 M47 58 Q53 56 56 60" stroke="#ff9f80" stroke-width=".8" fill="none" opacity=".7"/>
    <ellipse cx="46" cy="49" rx="3" ry="1.6" fill="#fff" opacity=".5" transform="rotate(-30 46 49)"/>
  </svg>`;
}

// Capa: manto preto com gola alta, pelo nas bordas, broche de fecho
// e bordados celtas prateados com pontos de luz
function svgCapa() {
  const id = `ca${++_idIcone}`;
  const brilhos = [[30, 32], [70, 32], [22, 46], [78, 46], [38, 20], [62, 20], [42, 60], [58, 60], [36, 90], [64, 90]]
    .map(([x, y]) => `<path d="M${x} ${y - 3} L${x + .7} ${y} L${x} ${y + 3} L${x - .7} ${y} Z M${x - 3} ${y} L${x} ${y + .7} L${x + 3} ${y} L${x} ${y - .7} Z" fill="#e8f0ff"/>`).join("");
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="${id}t" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#2a2d36"/><stop offset=".5" stop-color="#121318"/><stop offset="1" stop-color="#050506"/></linearGradient>
      <linearGradient id="${id}s" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#9aa3b5"/><stop offset=".5" stop-color="#e5e9f2"/><stop offset="1" stop-color="#9aa3b5"/></linearGradient>
    </defs>
    <!-- interior -->
    <path d="M42 18 L58 18 L60 94 L40 94 Z" fill="#030304"/>
    <!-- manto -->
    <path d="M38 8 Q30 12 26 20 Q14 30 10 60 L6 92 Q20 97 40 95 L44 22 Q42 14 38 8 Z" fill="url(#${id}t)"/>
    <path d="M62 8 Q70 12 74 20 Q86 30 90 60 L94 92 Q80 97 60 95 L56 22 Q58 14 62 8 Z" fill="url(#${id}t)"/>
    <!-- gola alta -->
    <path d="M36 4 Q50 0 64 4 L62 14 Q50 10 38 14 Z" fill="#181a20" stroke="url(#${id}s)" stroke-width=".7"/>
    <!-- bordados nas aberturas e na barra -->
    <path d="M42 16 L40 94 M58 16 L60 94" stroke="url(#${id}s)" stroke-width="2.6" fill="none"/>
    <path d="M42 20 l-2 3 l2 3 l-2 3 l2 3 l-2 3 l2 3 l-2 3 l2 3 l-2 3 l2 3 l-2 3 l2 3 l-2 3 l2 3 l-2 3 l2 3 l-2 3 l2 3 l-2 3 l2 3 l-2 3 l2 3 l-2 3 l2 3
             M58 20 l2 3 l-2 3 l2 3 l-2 3 l2 3 l-2 3 l2 3 l-2 3 l2 3 l-2 3 l2 3 l-2 3 l2 3 l-2 3 l2 3 l-2 3 l2 3 l-2 3 l2 3 l-2 3 l2 3 l-2 3 l2 3 l-2 3 l2 3"
      stroke="#0a0b0e" stroke-width=".6" fill="none"/>
    <path d="M8 89 Q22 93 40 91 M92 89 Q78 93 60 91" stroke="url(#${id}s)" stroke-width="1.6" fill="none"/>
    <!-- teia nos ombros -->
    <path d="M40 16 Q28 24 18 40 M40 22 Q30 32 24 48 M40 30 Q34 40 32 56 M26 22 Q30 34 22 46 M60 16 Q72 24 82 40 M60 22 Q70 32 76 48 M60 30 Q66 40 68 56 M74 22 Q70 34 78 46"
      stroke="#c9d1e3" stroke-width=".7" fill="none" opacity=".75"/>
    <!-- pelo na barra -->
    <path d="M6 92 l2 4 l2 -3 l2 4 l2 -3 l2 4 l2 -3 l2 4 l2 -3 l2 4 l2 -3 l2 4 l2 -3 l2 3 l2 -3 l2 3 l2 -4
             M60 95 l2 3 l2 -3 l2 4 l2 -3 l2 4 l2 -3 l2 4 l2 -3 l2 4 l2 -3 l2 4 l2 -3 l2 4 l2 -3 l2 3 l2 -5"
      stroke="#050506" stroke-width="1.6" fill="none"/>
    <!-- broche -->
    <rect x="44" y="15" width="12" height="2.4" rx="1" fill="url(#${id}s)"/>
    <circle cx="43" cy="16.2" r="3.4" fill="#3a3f4a" stroke="url(#${id}s)" stroke-width="1"/>
    <circle cx="57" cy="16.2" r="3.4" fill="#3a3f4a" stroke="url(#${id}s)" stroke-width="1"/>
    ${brilhos}
  </svg>`;
}

const DESENHOS_ITENS = { brincos: svgBrincos, anel: svgAnel, colar: svgColar, capa: svgCapa };

// Cache: cada desenho vira UMA imagem (data URI) gerada uma única vez.
// Antes o SVG era recriado (com novos ids de gradiente) a cada atualização da tela,
// o que fazia os acessórios piscarem.
const _cacheDesenhos = {};
function urlDesenho(slotId) {
  if (!_cacheDesenhos[slotId]) {
    _cacheDesenhos[slotId] = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(DESENHOS_ITENS[slotId]());
  }
  return _cacheDesenhos[slotId];
}

// Imagens personalizadas que não existem: não tenta carregar de novo
const _imagensFalhas = new Set();
function falhaImagemItem(img, slotId) {
  _imagensFalhas.add(slotId);
  if (DESENHOS_ITENS[slotId]) { img.onerror = null; img.src = urlDesenho(slotId); }
  else img.replaceWith(img.alt);
}

// Retorna o ícone do item: imagem personalizada > desenho > emoji
function iconeItem(slotId, raridade = null) {
  const brilho = raridade !== null && raridade >= 3 ? ` style="filter:drop-shadow(0 0 4px ${RARIDADES[raridade].cor})"` : "";
  const alt = slotDe(slotId).icone;
  if (IMAGENS_ITENS[slotId] && !_imagensFalhas.has(slotId)) {
    return `<img class="icone-item" src="${IMAGENS_ITENS[slotId]}" alt="${alt}"${brilho} onerror="falhaImagemItem(this,'${slotId}')">`;
  }
  if (DESENHOS_ITENS[slotId]) return `<img class="icone-item" src="${urlDesenho(slotId)}" alt="${alt}"${brilho} draggable="false">`;
  return `<span class="icone-emoji">${alt}</span>`;
}
