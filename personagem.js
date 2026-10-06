// =====================================================
// PERSONAGEM 3D (Three.js / WebGL)
// Boneco-sombra estilo manequim: corpo preto em uma única malha,
// borda esfumada, fumaça subindo e olhos azuis.
// =====================================================

let avatar3d = null;   // estado do motor 3D (criado uma vez)
let pAvatar = null;
let autoGiro = false;

// ---------- Utilitários ----------
function aleatorio(seed) {
  let s = seed;
  return () => ((s = (s * 9301 + 49297) % 233280) / 233280);
}

function mat(cor, o = {}) {
  // Converte as cores (sRGB) para o espaço linear do renderer — sem isso tudo fica lavado/branco
  const lin = c => new THREE.Color(c).convertSRGBToLinear();
  return new THREE.MeshStandardMaterial({
    color: lin(cor),
    roughness: o.r ?? 0.9,
    metalness: o.m ?? 0,
    emissive: lin(o.e ?? 0x000000),
    emissiveIntensity: o.ei ?? 1,
    side: o.dupla ? THREE.DoubleSide : THREE.FrontSide,
  });
}

function malha(pai, geo, material, pos = [0, 0, 0], rot = [0, 0, 0], esc = [1, 1, 1]) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(...pos);
  m.rotation.set(...rot);
  m.scale.set(...esc);
  m.castShadow = true;
  m.receiveShadow = true;
  pai.add(m);
  return m;
}
// =====================================================
// Cena, luzes, plataforma e aura
// =====================================================
function iniciar3D() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio * 1.25, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1 / 1.4, 0.05, 50);

  scene.add(new THREE.HemisphereLight(0xc8d8ff, 0x1a1410, 0.7));
  const chave = new THREE.DirectionalLight(0xfff0dd, 1.9);
  chave.position.set(2, 3.2, 3);
  chave.castShadow = true;
  chave.shadow.mapSize.set(2048, 2048);
  chave.shadow.bias = -0.0004;
  chave.shadow.normalBias = 0.002;
  Object.assign(chave.shadow.camera, { left: -1.2, right: 1.2, top: 2.2, bottom: -0.3 });
  scene.add(chave);
  const preenchimento = new THREE.DirectionalLight(0x8094c0, 0.55);
  preenchimento.position.set(-3, 1.5, 2);
  scene.add(preenchimento);
  const contorno = new THREE.DirectionalLight(0x6aa8ff, 1.4);
  contorno.position.set(-1.5, 2.5, -3);
  scene.add(contorno);
  const luzAura = new THREE.PointLight(0x3b82f6, 0, 3);
  luzAura.position.set(0, 0.6, 0.7);
  scene.add(luzAura);

  // Plataforma rúnica
  const plataforma = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.78, 0.06, 64),
    mat("#0a0f1c", { r: 0.6, m: 0.3 }));
  plataforma.position.y = -0.03;
  plataforma.receiveShadow = true;
  scene.add(plataforma);
  const anel = new THREE.Mesh(new THREE.RingGeometry(0.6, 0.63, 64),
    new THREE.MeshBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
  anel.rotation.x = -Math.PI / 2;
  anel.position.y = 0.002;
  scene.add(anel);
  const runas = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.47, 6),
    new THREE.MeshBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.5, side: THREE.DoubleSide }));
  runas.rotation.x = -Math.PI / 2;
  runas.position.y = 0.003;
  scene.add(runas);

  // Partículas da aura
  const N = 70;
  const posP = new Float32Array(N * 3);
  const rnd = aleatorio(21);
  for (let i = 0; i < N; i++) {
    const a = rnd() * Math.PI * 2, r = 0.25 + rnd() * 0.45;
    posP.set([Math.cos(a) * r, rnd() * 2.2, Math.sin(a) * r], i * 3);
  }
  const geoP = new THREE.BufferGeometry();
  geoP.setAttribute("position", new THREE.BufferAttribute(posP, 3));
  const particulas = new THREE.Points(geoP, new THREE.PointsMaterial({
    color: 0x3b82f6, size: 0.025, transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  scene.add(particulas);

  const raiz = new THREE.Group();
  scene.add(raiz);

  avatar3d = {
    renderer, scene, camera, raiz, luzAura, anel, runas, particulas, contorno,
    modelo: null, chave: "", rot: 0, rotAlvo: 0, elev: 0.08, dist: 3.0,
    arrasto: null, ultimo: 0, obs: null,
  };

  // Arrastar para girar (horizontal) e inclinar a câmera (vertical)
  const cv = renderer.domElement;
  cv.addEventListener("pointerdown", e => {
    e.preventDefault();
    pararGiroAuto();
    avatar3d.arrasto = { x: e.clientX, y: e.clientY, rot: avatar3d.rotAlvo, elev: avatar3d.elev };
    cv.setPointerCapture(e.pointerId);
    cv.classList.add("arrastando");
  });
  cv.addEventListener("pointermove", e => {
    const a = avatar3d.arrasto;
    if (!a) return;
    avatar3d.rotAlvo = a.rot + (e.clientX - a.x) * 0.012;
    avatar3d.elev = Math.max(-0.15, Math.min(0.75, a.elev + (e.clientY - a.y) * 0.004));
  });
  const soltar = () => { avatar3d.arrasto = null; cv.classList.remove("arrastando"); };
  cv.addEventListener("pointerup", soltar);
  cv.addEventListener("pointercancel", soltar);
  cv.addEventListener("wheel", e => {
    e.preventDefault();
    avatar3d.dist = Math.max(0.9, Math.min(4.5, avatar3d.dist + e.deltaY * 0.002));
  }, { passive: false });

  avatar3d.obs = new ResizeObserver(redimensionar3D);
  requestAnimationFrame(loop3D);
}

function redimensionar3D() {
  const host = document.getElementById("avatar-palco");
  if (!avatar3d || !host) return;
  const w = host.clientWidth, h = host.clientHeight;
  if (!w || !h) return;
  avatar3d.renderer.setSize(w, h);
  avatar3d.camera.aspect = w / h;
  avatar3d.camera.updateProjectionMatrix();
}

function descartarModelo(obj) {
  obj.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) o.material.dispose();
  });
}

// =====================================================
// Silhueta humana 3D (sem detalhes): formas lisas unidas, cor única escura
// =====================================================
function construirSilhueta() {
  const uTempo = { value: 0 };
  // Núcleo: preto opaco (partes sobrepostas se fundem numa forma só, sem emendas)
  const mCorpo = new THREE.MeshBasicMaterial({ color: 0x000000 });
  // Borda borrada: casca um pouco maior que esmaece até sumir nas extremidades
  const mBorrao = (infla, forca) => new THREE.ShaderMaterial({
    uniforms: { infla: { value: infla }, forca: { value: forca } },
    transparent: true, depthWrite: false,
    vertexShader: `uniform float infla; varying float vF;
      void main(){
        vec3 p = position + normal * infla;
        vec4 mv = modelViewMatrix * vec4(p,1.0);
        vec3 n = normalize(normalMatrix * normal);
        vF = abs(dot(n, normalize(-mv.xyz)));
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `uniform float forca; varying float vF;
      void main(){ gl_FragColor = vec4(0.0,0.0,0.0, pow(vF, 1.6) * forca); }`,
  });
  // Fumaça: cascas com ruído animado que "desfiam" a borda do corpo em fiapos escuros subindo
  const mFumaca = (infla, forca) => new THREE.ShaderMaterial({
    uniforms: { infla: { value: infla }, forca: { value: forca }, tempo: uTempo },
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: `uniform float infla; uniform float tempo; varying float vF; varying vec3 vP;
      void main(){
        vec3 p = position;
        float w = sin(p.y*18.0 - tempo*2.0 + p.x*9.0)*0.5 + sin(p.y*31.0 - tempo*3.1 + p.z*12.0)*0.5;
        p += normal * infla * (0.7 + 0.6*w);
        vec4 mv = modelViewMatrix * vec4(p,1.0);
        vec3 n = normalize(normalMatrix * normal);
        vF = 1.0 - abs(dot(n, normalize(-mv.xyz)));
        vP = position;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `uniform float forca; uniform float tempo; varying float vF; varying vec3 vP;
      float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719)))*43758.5453); }
      float n3(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),
                   mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z); }
      float fbm(vec3 p){ float s=0.0,a=0.5; for(int i=0;i<5;i++){ s+=a*n3(p); p*=2.03; a*=0.5; } return s; }
      void main(){
        vec3 q = vP*9.0; q.y -= tempo*0.9;
        float f = fbm(q + fbm(q*0.7 + tempo*0.2)*1.6);
        float fios = smoothstep(0.42, 0.75, f) * smoothstep(0.08, 0.22, abs(f-0.6));
        float a = fios * pow(vF, 1.2) * forca;
        vec3 c = mix(vec3(0.0), vec3(0.14,0.14,0.16), f);           // preto com fiapos cinza um pouco mais claros
        gl_FragColor = vec4(c, a);
      }`,
  });
  const camadas = [
    [mCorpo, false],
    [mBorrao(0.01, 0.6), false], [mBorrao(0.022, 0.3), false],
    [mFumaca(0.025, 0.6), true], [mFumaca(0.05, 0.3), true],
  ];
  const g = new THREE.Group();
  g.userData.uTempo = uTempo;
  const add = (geo, pos, rot = [0, 0, 0], esc = [1, 1, 1]) => {
    camadas.forEach(([mt, aura], i) => {
      const o = malha(g, geo, mt, pos, rot, esc);
      o.castShadow = o.receiveShadow = false;
      o.renderOrder = aura ? 3 : i === 0 ? 0 : 1;
    });
  };

  // ===== MANEQUIM: um corpo só, uma única malha fechada =====
  // O corpo é descrito por um campo de distância (SDF) com uniões suaves entre as formas,
  // e a superfície é extraída de uma vez (Surface Nets) → sem tubos, sem emendas, como um manequim.
  const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
  const elip = (x, y, z, c, r) => {
    const px = (x - c[0]) / r[0], py = (y - c[1]) / r[1], pz = (z - c[2]) / r[2];
    return (Math.sqrt(px * px + py * py + pz * pz) - 1) * Math.min(r[0], r[1], r[2]);
  };
  const cone = (x, y, z, a, b, r1, r2) => {
    const pax = x - a[0], pay = y - a[1], paz = z - a[2];
    const bax = b[0] - a[0], bay = b[1] - a[1], baz = b[2] - a[2];
    const h = Math.min(1, Math.max(0, (pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz)));
    const dx = pax - bax * h, dy = pay - bay * h, dz = paz - baz * h;
    return Math.sqrt(dx * dx + dy * dy + dz * dz) - (r1 + (r2 - r1) * h);
  };
  const sdf = (x, y, z) => {
    const ax = Math.abs(x);
    // ---- Tronco de manequim: ombros retos e largos, cintura, bacia larga e arredondada ----
    let d = elip(x, y, z, [0, 1.33, 0.0], [0.17, 0.15, 0.1]);                            // peito
    d = smin(d, elip(x, y, z, [0, 1.42, -0.005], [0.215, 0.05, 0.085]), 0.06);          // linha reta dos ombros
    d = smin(d, elip(x, y, z, [0, 1.15, 0.0], [0.135, 0.15, 0.088]), 0.08);             // cintura
    d = smin(d, elip(x, y, z, [0, 0.96, -0.005], [0.175, 0.11, 0.105]), 0.07);          // bacia larga
    d = smin(d, elip(x, y, z, [0, 0.9, -0.01], [0.15, 0.06, 0.09]), 0.05);              // base arredondada da bacia
    // ---- Pescoço e cabeça ----
    d = smin(d, cone(x, y, z, [0, 1.46, -0.005], [0, 1.62, 0.005], 0.055, 0.048), 0.04);
    d = smin(d, elip(x, y, z, [0, 1.69, 0.005], [0.088, 0.112, 0.1]), 0.03);
    // ---- Braços (encaixe de manequim: esfera do ombro bem marcada) ----
    let m = elip(ax, y, z, [0.225, 1.395, 0], [0.058, 0.058, 0.058]);                    // articulação do ombro
    m = smin(m, cone(ax, y, z, [0.235, 1.37, 0], [0.272, 1.09, 0.01], 0.047, 0.037), 0.02);
    m = smin(m, cone(ax, y, z, [0.272, 1.09, 0.01], [0.302, 0.8, 0.035], 0.037, 0.027), 0.015);
    m = smin(m, elip(ax, y, z, [0.31, 0.725, 0.04], [0.03, 0.058, 0.02]), 0.015);        // mão
    d = smin(d, m, 0.018);
    // ---- Pernas (encaixe na bacia marcado) ----
    let p = cone(ax, y, z, [0.095, 0.9, 0], [0.1, 0.57, 0.01], 0.085, 0.054);
    p = smin(p, cone(ax, y, z, [0.1, 0.57, 0.01], [0.1, 0.09, 0], 0.052, 0.034), 0.025);
    p = smin(p, elip(ax, y, z, [0.1, 0.42, -0.02], [0.046, 0.09, 0.046]), 0.04);          // panturrilha suave
    p = smin(p, elip(ax, y, z, [0.1, 0.045, 0.04], [0.045, 0.035, 0.095]), 0.03);         // pé
    return smin(d, p, 0.02);
  };
  const geoManequim = (() => {
    const S = 0.0095, x0 = -0.42, y0 = -0.02, z0 = -0.2;
    const nx = Math.ceil(0.84 / S) + 1, ny = Math.ceil(1.86 / S) + 1, nz = Math.ceil(0.42 / S) + 1;
    const F = new Float32Array(nx * ny * nz);
    const id = (i, j, k) => i + nx * (j + ny * k);
    for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++)
      F[id(i, j, k)] = sdf(x0 + i * S, y0 + j * S, z0 + k * S);
    const cid = (i, j, k) => i + (nx - 1) * (j + (ny - 1) * k);
    const vIdx = new Int32Array((nx - 1) * (ny - 1) * (nz - 1)).fill(-1);
    const pos = [], nor = [], idx = [];
    const arestas = [];
    for (let a = 0; a < 8; a++) for (const b of [1, 2, 4]) if (!(a & b)) arestas.push([a, a | b]);
    const val = new Float32Array(8);
    for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
      let mask = 0;
      for (let c = 0; c < 8; c++) {
        val[c] = F[id(i + (c & 1), j + ((c >> 1) & 1), k + ((c >> 2) & 1))];
        if (val[c] < 0) mask |= 1 << c;
      }
      if (mask === 0 || mask === 255) continue;
      let sx = 0, sy = 0, sz = 0, n = 0;
      for (const [a, b] of arestas) {
        if ((val[a] < 0) === (val[b] < 0)) continue;
        const t = val[a] / (val[a] - val[b]);
        sx += (a & 1) + (((b & 1) - (a & 1)) * t);
        sy += ((a >> 1) & 1) + ((((b >> 1) & 1) - ((a >> 1) & 1)) * t);
        sz += ((a >> 2) & 1) + ((((b >> 2) & 1) - ((a >> 2) & 1)) * t);
        n++;
      }
      const X = x0 + (i + sx / n) * S, Y = y0 + (j + sy / n) * S, Z = z0 + (k + sz / n) * S;
      vIdx[cid(i, j, k)] = pos.length / 3;
      pos.push(X, Y, Z);
      // normal suave pelo gradiente do campo
      const e = 0.003;
      const gx = sdf(X + e, Y, Z) - sdf(X - e, Y, Z), gy = sdf(X, Y + e, Z) - sdf(X, Y - e, Z), gz = sdf(X, Y, Z + e) - sdf(X, Y, Z - e);
      const gl = Math.hypot(gx, gy, gz) || 1;
      nor.push(gx / gl, gy / gl, gz / gl);
    }
    const quad = (a, b, c, d, ox, oy, oz) => {
      if (a < 0 || b < 0 || c < 0 || d < 0) return;
      // garante que a face aponte para fora (necessário para a aura BackSide)
      const ux = pos[b * 3] - pos[a * 3], uy = pos[b * 3 + 1] - pos[a * 3 + 1], uz = pos[b * 3 + 2] - pos[a * 3 + 2];
      const vx = pos[c * 3] - pos[a * 3], vy = pos[c * 3 + 1] - pos[a * 3 + 1], vz = pos[c * 3 + 2] - pos[a * 3 + 2];
      const dot = (uy * vz - uz * vy) * ox + (uz * vx - ux * vz) * oy + (ux * vy - uy * vx) * oz;
      if (dot >= 0) idx.push(a, b, c, a, c, d); else idx.push(a, c, b, a, d, c);
    };
    for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const f0 = F[id(i, j, k)], dentro = f0 < 0;
      if (i < nx - 1 && j > 0 && k > 0 && j < ny - 1 && k < nz - 1 && dentro !== (F[id(i + 1, j, k)] < 0)) {
        const o = dentro ? 1 : -1;
        quad(vIdx[cid(i, j - 1, k - 1)], vIdx[cid(i, j, k - 1)], vIdx[cid(i, j, k)], vIdx[cid(i, j - 1, k)], o, 0, 0);
      }
      if (j < ny - 1 && i > 0 && k > 0 && i < nx - 1 && k < nz - 1 && dentro !== (F[id(i, j + 1, k)] < 0)) {
        const o = dentro ? 1 : -1;
        quad(vIdx[cid(i - 1, j, k - 1)], vIdx[cid(i, j, k - 1)], vIdx[cid(i, j, k)], vIdx[cid(i - 1, j, k)], 0, o, 0);
      }
      if (k < nz - 1 && i > 0 && j > 0 && i < nx - 1 && j < ny - 1 && dentro !== (F[id(i, j, k + 1)] < 0)) {
        const o = dentro ? 1 : -1;
        quad(vIdx[cid(i - 1, j - 1, k)], vIdx[cid(i, j - 1, k)], vIdx[cid(i, j, k)], vIdx[cid(i - 1, j, k)], 0, 0, o);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
    geo.setIndex(idx);
    return geo;
  })();
  add(geoManequim, [0, 0, 0]);

  // Mancha de sombra no chão, escura no centro e sumindo nas bordas
  const cv = document.createElement("canvas");
  cv.width = cv.height = 128;
  const c = cv.getContext("2d"), gr = c.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(0,0,0,0.75)"); gr.addColorStop(1, "rgba(0,0,0,0)");
  c.fillStyle = gr; c.fillRect(0, 0, 128, 128);
  const chao = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false }));
  chao.rotation.x = -Math.PI / 2;
  chao.position.y = 0.005;
  g.add(chao);

  // Olhos: só uma fenda azul brilhante no rosto liso (sem pupila, pálpebra ou sobrancelha)
  const texOlho = (() => {
    const c2 = document.createElement("canvas"); c2.width = c2.height = 128;
    const x = c2.getContext("2d");
    const ir = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    ir.addColorStop(0, "#3b5bd6"); ir.addColorStop(0.5, "#1a3399"); ir.addColorStop(1, "#0c1d55");
    x.fillStyle = ir; x.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c2);
  })();
  const brilho = (() => {
    const c2 = document.createElement("canvas"); c2.width = c2.height = 64;
    const x = c2.getContext("2d"), r = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, "rgba(30,60,170,0.85)"); r.addColorStop(1, "rgba(10,25,90,0)");
    x.fillStyle = r; x.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c2);
  })();
  [-1, 1].forEach(s => {
    const olho = new THREE.Group();
    olho.position.set(s * 0.032, 1.7, 0.1);        // na superfície do rosto
    // canto interno mais baixo que o externo → expressão de raiva
    olho.rotation.set(0, s * 0.25, s * 0.38);
    // globo com íris texturizada (mapa centralizado na frente)
    const geoGlobo = new THREE.SphereGeometry(0.012, 32, 16);
    geoGlobo.rotateY(-Math.PI / 2);
    const globo = new THREE.Mesh(geoGlobo, new THREE.MeshBasicMaterial({ map: texOlho }));
    globo.scale.set(1.6, 0.45, 0.6);
    olho.add(globo);
    olho.traverse(o => { o.renderOrder = 5; });
    g.add(olho);
    // brilho só dentro do rosto: disco colado à face, recortado pela cabeça (sem vazar para fora)
    const halo = new THREE.Mesh(new THREE.CircleGeometry(0.02, 32), new THREE.MeshBasicMaterial({ map: brilho,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.45 }));
    halo.position.set(0, 0, 0.004);
    halo.scale.set(1.3, 0.7, 1);
    halo.renderOrder = 6;
    olho.add(halo);
  });

  // Fiapos de fumaça preta subindo e se enrolando em volta do corpo
  const texFumaca = (() => {
    const c3 = document.createElement("canvas"); c3.width = c3.height = 128;
    const x = c3.getContext("2d");
    for (let i = 0; i < 40; i++) {
      const px = 64 + (Math.random() - 0.5) * 50, py = 64 + (Math.random() - 0.5) * 50, rr = 8 + Math.random() * 22;
      const r = x.createRadialGradient(px, py, 0, px, py, rr);
      r.addColorStop(0, "rgba(0,0,0,0.25)"); r.addColorStop(1, "rgba(0,0,0,0)");
      x.fillStyle = r; x.fillRect(0, 0, 128, 128);
    }
    return new THREE.CanvasTexture(c3);
  })();
  const fiapos = [];
  for (let i = 0; i < 30; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: texFumaca, transparent: true, depthWrite: false, color: 0x1c1d22 }));
    sp.userData = { ang: Math.random() * Math.PI * 2, raio: 0.12 + Math.random() * 0.22, fase: Math.random(),
      vel: 0.12 + Math.random() * 0.15, giro: (Math.random() - 0.5) * 1.5, tam: 0.12 + Math.random() * 0.2 };
    sp.renderOrder = 4;
    g.add(sp); fiapos.push(sp);
  }
  // Animação dos fiapos a cada quadro (usa o tempo da aura)
  chao.onBeforeRender = () => {
    const t = uTempo.value;
    fiapos.forEach(sp => {
      const d = sp.userData, f = (d.fase + t * d.vel) % 1;          // 0 → 1 subindo
      const ang = d.ang + t * d.giro + f * 2.5;
      const r = d.raio * (0.6 + f * 0.8);
      sp.position.set(Math.cos(ang) * r, 0.05 + f * 1.85, Math.sin(ang) * r * 0.6);
      const e = d.tam * (0.6 + f * 1.4);
      sp.scale.set(e, e * 1.6, 1);
      sp.material.rotation = ang;
      sp.material.opacity = Math.sin(f * Math.PI) * 0.55;
    });
  };
  return g;
}

function atualizarCena3D(p) {
  const a = avatar3d;
  a.ultimoP = p;
  const chave = JSON.stringify([p.rank]);
  if (chave !== a.chave) {
    a.chave = chave;
    if (a.modelo) { a.raiz.remove(a.modelo); descartarModelo(a.modelo); }
    try {
      a.modelo = construirSilhueta();
    } catch (e) {
      console.error("Erro ao montar o personagem 3D:", e);
      a.modelo = new THREE.Group();
    }
    a.raiz.add(a.modelo);
  }
  const cor = new THREE.Color("#0c1d55");      // azul bem escuro
  a.anel.material.color.copy(cor);
  a.anel.visible = false;
  a.runas.material.color.copy(cor);
  a.runas.visible = false;
  a.particulas.material.color.copy(new THREE.Color("#0c1d55"));
  a.particulas.visible = true;
  a.luzAura.color.copy(cor);
  a.luzAura.intensity = 0.9;
  a.contorno.color.copy(new THREE.Color("#0c1d55"));
}

// =====================================================
// Loop de animação
// =====================================================
function loop3D(t) {
  requestAnimationFrame(loop3D);
  const a = avatar3d;
  const cv = a.renderer.domElement;
  if (!cv.isConnected || !cv.offsetParent) { a.ultimo = t; return; }
  const dt = Math.min(0.05, (t - (a.ultimo || t)) / 1000);
  a.ultimo = t;
  const seg = t / 1000;

  if (autoGiro) a.rotAlvo += dt * 0.8;
  a.rot += (a.rotAlvo - a.rot) * Math.min(1, dt * 10);
  a.raiz.rotation.y = a.rot;

  // Respiração
  if (a.modelo) {
    a.modelo.position.y = Math.sin(seg * 1.6) * 0.004;
    if (a.modelo.userData.uTempo) a.modelo.userData.uTempo.value = seg;   // anima a fumaça
  }

  // Aura
  a.runas.rotation.z = seg * 0.4;
  if (a.particulas.visible) {
    const pp = a.particulas.geometry.attributes.position;
    for (let i = 0; i < pp.count; i++) {
      let y = pp.getY(i) + dt * (0.25 + (i % 5) * 0.06);
      if (y > 2.2) y = 0;
      pp.setY(i, y);
    }
    pp.needsUpdate = true;
  }

  // Câmera orbitando na altura escolhida
  // Ao aproximar, a câmera sobe em direção ao rosto/peito
  const zoom = Math.max(0, Math.min(1, (3.0 - a.dist) / 2.1));
  const alvoY = 0.93 + zoom * 0.62;
  a.camera.position.set(0, alvoY + Math.sin(a.elev) * a.dist, Math.cos(a.elev) * a.dist);
  a.camera.lookAt(0, alvoY, 0);

  // Rótulo do ângulo
  const graus = ((Math.round(-a.rot * 180 / Math.PI) % 360) + 360) % 360;
  const rot = document.querySelector(".avatar-angulo");
  if (rot) rot.textContent = `${["Frente", "Perfil", "Costas", "Perfil"][Math.round(graus / 90) % 4]} · ${graus}°`;

  a.renderer.render(a.scene, a.camera);
}

// =====================================================
// Integração com a tela de equipamento
// =====================================================
function avatarHTML(p) {
  pAvatar = p;
  queueMicrotask(montarAvatar);
  return `<div class="avatar">
    <div class="avatar-palco" id="avatar-palco" title="Arraste para girar · role para zoom"></div>
    <div class="avatar-nome">${esc(nomePersonagem || "JOGADOR")} · RANK ${p.rank}</div>
    <div class="avatar-angulo"></div>
    <div class="avatar-ctrl">
      <button type="button" data-giro="esq" title="Girar 90° para a esquerda">⟲</button>
      <button type="button" data-giro="0">Frente</button>
      <button type="button" data-giro="90">Perfil</button>
      <button type="button" data-giro="180">Costas</button>
      <button type="button" data-giro="auto" class="${autoGiro ? "ativo" : ""}">${autoGiro ? "⏸ Parar" : "▶ Girar"}</button>
      <button type="button" data-giro="dir" title="Girar 90° para a direita">⟳</button>
    </div>
  </div>`;
}

function montarAvatar() {
  const host = document.getElementById("avatar-palco");
  if (!host) return;
  if (typeof THREE === "undefined") {
    host.innerHTML = `<p class="vazio">Não foi possível carregar o motor 3D (Three.js). Verifique a conexão com a internet e recarregue a página.</p>`;
    return;
  }
  if (!avatar3d) iniciar3D();
  host.appendChild(avatar3d.renderer.domElement);
  avatar3d.obs.disconnect();
  avatar3d.obs.observe(host);
  redimensionar3D();
  atualizarCena3D(pAvatar);
}

function atualizarBotaoAuto() {
  const b = document.querySelector('[data-giro="auto"]');
  if (!b) return;
  b.textContent = autoGiro ? "⏸ Parar" : "▶ Girar";
  b.classList.toggle("ativo", autoGiro);
}

function pararGiroAuto() {
  autoGiro = false;
  atualizarBotaoAuto();
}

document.addEventListener("click", e => {
  const b = e.target.closest("[data-giro]");
  if (!b || !avatar3d) return;
  const v = b.dataset.giro;
  if (v === "auto") { autoGiro = !autoGiro; atualizarBotaoAuto(); return; }
  pararGiroAuto();
  const a = avatar3d, q = Math.PI / 2;
  if (v === "esq") a.rotAlvo = Math.round(a.rotAlvo / q) * q + q;
  else if (v === "dir") a.rotAlvo = Math.round(a.rotAlvo / q) * q - q;
  else {
    const alvo = -(+v) * Math.PI / 180;
    const voltas = Math.round((a.rotAlvo - alvo) / (Math.PI * 2));
    a.rotAlvo = alvo + voltas * Math.PI * 2;
  }
});
