// Interfața aplicației „Calculul motoarelor de motocicletă (MAS 2T și 4T)”.
(function () {
  "use strict";
  const M = window.MOTO;
  const $ = s => document.querySelector(s);
  const clone = o => JSON.parse(JSON.stringify(o));
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  function fmt(x, d) {
    if (x === null || x === undefined || !isFinite(x)) return "–";
    let s = Number(x).toFixed(d === undefined ? 2 : d); const neg = s[0] === "-"; if (neg) s = s.slice(1);
    let [a, b] = s.split("."); if (a.length > 4) a = a.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return (neg && Number(s) !== 0 ? "−" : "") + a + (b ? "," + b : "");
  }
  const parseNum = s => parseFloat(String(s).replace(/\s/g, "").replace(",", "."));
  const getP = (o, p) => p.split(".").reduce((a, k) => (a === undefined || a === null ? undefined : a[k]), o);
  function setP(o, p, v) { const ks = p.split("."); let a = o; for (let i = 0; i < ks.length - 1; i++) a = a[ks[i]]; a[ks[ks.length - 1]] = v; }
  function decimals(x) { for (let d = 0; d <= 4; d++) if (Math.abs(x * 10 ** d - Math.round(x * 10 ** d)) < 1e-6) return d; return 4; }
  const NUME = { EX2T: "2T 300 cm³ enduro (exemplul 1)", EX4T: "4T 690 cm³ enduro de drum (exemplul 2)" };
  const MAP = { EX2T: ["c300", "v300", "t300", "m300"], EX4T: ["c690", "v690", "t690", "m690"] };

  // [cale, etichetă, simbol, unitate, doar pentru 2T / 4T]
  const GRUPE = [
    { leg: "Tema", f: [["$d.P_nom", "Puterea efectivă", "P<sub>e</sub>", "kW"], ["$d.n_P", "Turația puterii maxime", "n<sub>P</sub>", "rot/min"],
      ["$d.D_r", "Alezajul rotunjit", "D<sub>r</sub>", "mm"], ["$d.S_r", "Cursa rotunjită", "S<sub>r</sub>", "mm"]] },
    { leg: "Parametrii inițiali", f: [["$d.xi_a", "Raportul p<sub>a</sub>/p<sub>s</sub>", "ξ<sub>a</sub>", "–"], ["$d.dT", "Încălzirea încărcăturii", "ΔT", "K"],
      ["$d.T_r", "Temperatura gazelor reziduale", "T<sub>r</sub>", "K"], ["$d.p_r", "Presiunea în evacuare", "p<sub>r</sub>", "MPa"],
      ["$d.g_r", "Coeficientul gazelor reziduale", "γ<sub>r</sub>", "–", 4], ["$d.alfa", "Coeficientul de exces de aer", "α", "–"],
      ["$d.eps", "Raportul de comprimare (2T: efectiv)", "ε", "–"], ["$d.xi_v", "Coeficientul de utilizare a căldurii", "ξ", "–"],
      ["$d.phi_r", "Coeficientul de rotunjire", "φ<sub>r</sub>", "–"], ["$d.eta_m", "Randamentul mecanic", "η<sub>m</sub>", "–"],
      ["$d.lam", "Raportul R/L<sub>b</sub>", "λ", "–"], ["$d.psi", "Raportul S/D", "ψ", "–"]] },
    { leg: "Distribuția și baleiajul (2T)", doi: true, f: [["$d.th_ev", "Deschiderea evacuării după PMI", "θ<sub>DE</sub>", "°RAC"],
      ["$d.th_tr", "Deschiderea baleiajului după PMI", "θ<sub>DB</sub>", "°RAC"], ["$d.DR", "Raportul de livrare", "Λ", "–"],
      ["$d.x_d", "Fracțiunea baleiată prin dislocuire", "x<sub>d</sub>", "–"], ["$d.y_s", "Fracțiunea scurtcircuitată", "y<sub>s</sub>", "–"],
      ["$d.k_f", "Combustibil premixat (1 = carter, 0 = inj. directă)", "k<sub>f</sub>", "–"], ["$d.eps_cc", "Raportul de comprimare al carterului", "ε<sub>cart</sub>", "–"],
      ["$d.b_ev_rel", "Lățimea ferestrei de evacuare / D", "b<sub>ev</sub>/D", "–"], ["$d.b_tr_rel", "Lățimea ferestrelor de baleiaj / D", "b<sub>tr</sub>/D", "–"],
      ["$d.T_ev", "Temperatura gazelor în tobă", "T<sub>ev</sub>", "K"]] },
    { leg: "Caracteristica exterioară", f: [["$c.x_M", "Turația cuplului maxim / n<sub>P</sub>", "x<sub>M</sub>", "–"], ["$c.n_min", "Turația minimă", "n<sub>min</sub>", "rot/min"],
      ["$c.n_max", "Turația maximă", "n<sub>max</sub>", "rot/min"], ["$c.n_idle", "Turația de ralanti", "n<sub>0</sub>", "rot/min"]] },
    { leg: "Mecanismul", f: [["$m.m_p", "Pistonul cu bolț și segmenți", "m<sub>p</sub>", "kg"], ["$m.m_b", "Biela", "m<sub>b</sub>", "kg"],
      ["$x.k_ech", "Contragreutate pentru masele în translație", "k", "–"], ["$x.delta", "Gradul de neuniformitate", "δ", "–"], ["$x.n_vol", "Turația de verificare a volantului", "n", "rot/min"]] },
    { leg: "Răcirea", f: [["$x.T_g", "Temperatura gazelor la ieșirea din cilindru", "T<sub>g</sub>", "K"], ["$x.f_ar", "Fracțiunea prin aripioare", "–", "–"],
      ["$x.v_ar", "Viteza de calcul a vehiculului", "v", "km/h"]] },
    { leg: "Vehiculul", f: [["$v.m_gol", "Masa în ordine de mers", "m<sub>0</sub>", "kg"], ["$v.m_pilot", "Pilotul echipat", "m<sub>p</sub>", "kg"],
      ["$v.CdA", "Aria aerodinamică cu pilot", "C<sub>x</sub>A", "m²"], ["$v.f", "Coeficientul de rezistență la rulare", "f", "–"],
      ["$v.delta", "Coeficientul maselor în rotație", "δ<sub>m</sub>", "–"], ["$v.phi_r", "Greutatea pe roata spate", "φ<sub>s</sub>", "–"],
      ["$v.anvelopa.0", "Anvelopa spate: lățimea", "B", "mm"], ["$v.anvelopa.1", "Anvelopa spate: profilul", "H/B", "%"], ["$v.anvelopa.2", "Diametrul jantei", "d", "in"]] },
    { leg: "Transmisia", f: [["$t.i_p", "Transmisia primară", "i<sub>p</sub>", "–"], ["$t.i_cv", "Rapoartele cutiei (separate prin ;)", "i<sub>cv</sub>", "–", "lista"],
      ["$t.i_f", "Transmisia finală", "i<sub>f</sub>", "–"], ["$t.eta", "Randamentul transmisiei", "η<sub>tr</sub>", "–"]] },
    { leg: "Consumul pe WMTC (4T)", patru: true, f: [["$w.p_pomp", "Pierderile de pompaj la sarcină nulă", "p<sub>p0</sub>", "MPa"], ["$w.k_eta", "Coeficientul randamentului la sarcini parțiale", "k<sub>η</sub>", "–"],
      ["$c.n_min_drv", "Turația minimă de mers", "n<sub>min</sub>", "rot/min"], ["$w.CO2_ref", "CO₂ omologat (validare)", "–", "g/km"]] }
  ];

  let S = null;
  function initState(key) {
    const E = EXTRA, [cn, vn, tn, mn] = MAP[key];
    const c = clone(E.CAR[cn]); if (c.n_min_drv === undefined) c.n_min_drv = 2600;
    S = { key, d: clone(PRESETS[key]), c, v: clone(E.VEH[vn]), t: clone(E.TR[tn]), m: clone(E.MASE[mn]),
      x: { k_ech: 0.5, delta: 0.10, n_vol: 3000, T_g: key === "EX2T" ? 900 : 1000, f_ar: 0.6, v_ar: 100 },
      w: { p_pomp: 0.10, k_eta: 0.75, CO2_ref: key === "EX4T" ? E.REF.ktm690.CO2 : 0 }, tab: S ? S.tab : "termic" };
  }
  function objFor(path) { const ks = path.slice(1).split("."); return [S[ks[0]], ks.slice(1).join(".")]; }
  function renderForm() {
    const doi = S.d.tau === 2;
    let h = `<fieldset><legend>Configurația</legend><div class="camp"><label for="sel-preset">Exemplul de pornire</label><span class="simbol"></span>
      <select id="sel-preset">${Object.keys(NUME).map(k => `<option value="${k}"${k === S.key ? " selected" : ""}>${NUME[k]}</option>`).join("")}</select><span class="um"></span></div></fieldset>`;
    for (const g of GRUPE) {
      if ((g.doi && !doi) || (g.patru && doi)) continue;
      let rows = "";
      for (const [path, et, sim, um, extra] of g.f) {
        const [o, p] = objFor(path); const val = getP(o, p); if (val === undefined || val === null) continue;
        if (path === "$d.g_r" && doi) continue;
        let txt;
        if (extra === "lista") txt = val.map(x => fmt(x, 3)).join("; ");
        else txt = fmt(val, decimals(val));
        rows += `<div class="camp"><label for="f-${path}">${et}</label><span class="simbol">${sim}</span><input id="f-${path}" data-path="${path}" data-lista="${extra === "lista" ? 1 : 0}" value="${esc(txt)}" inputmode="decimal"><span class="um">${um}</span></div>`;
      }
      if (rows) h += `<fieldset><legend>${g.leg}</legend>${rows}</fieldset>`;
    }
    $("#formular").innerHTML = h;
    $("#sel-preset").addEventListener("change", e => { initState(e.target.value); renderForm(); schedule(); });
  }
  $("#formular").addEventListener("input", e => {
    const inp = e.target; if (!inp.dataset || !inp.dataset.path) return;
    const [o, p] = objFor(inp.dataset.path);
    if (inp.dataset.lista === "1") {
      const arr = inp.value.split(";").map(parseNum); if (!arr.length || arr.some(x => !isFinite(x) || x <= 0)) return;
      setP(o, p, arr);
    } else { const x = parseNum(inp.value); if (!isFinite(x)) return; setP(o, p, x); }
    schedule();
  });
  document.querySelectorAll("[data-preset]").forEach(b => b.addEventListener("click", () => { initState(b.dataset.preset); renderForm(); schedule(); }));

  // ---------------------------------------------------------------- calcul
  let R = null, timer = null;
  function schedule() { clearTimeout(timer); $("#sumar").classList.add("lucru"); timer = setTimeout(compute, 250); }
  function compute() {
    try {
      const d = S.d, doi = d.tau === 2, o = {};
      o.r = M.calculTermic(d);
      o.pa = M.diagrama(o.r);
      o.car = M.caracteristica(o.r, S.c.x_M, S.c.n_min, S.c.n_max);
      if (doi) {
        o.pcart = M.pCarter(d);
        o.ev = M.evacuareLibera(o.r, d.b_ev_rel * o.r.D_cil, d.b_tr_rel * o.r.D_cil, d.p_r, o.pcart, 0.75);
        o.deq = Math.sqrt(4 * o.ev.A_ev_max / Math.PI) * 1000;
        o.tb = M.tobaAcordata(o.r, d.T_ev, d.n_P, o.deq);
      }
      o.kd = M.cinematicaDinamica(o.r, o.pa, S.m.m_p, S.m.m_b);
      o.kdv = M.cinematicaDinamica(o.r, o.pa, S.m.m_p, S.m.m_b, { n: S.x.n_vol });
      o.vol = M.volant(o.kdv, S.x.delta);
      o.eq = { e0: M.echilibrare(o.kd, d.lam, 0), ek: M.echilibrare(o.kd, d.lam, S.x.k_ech), arb: M.echilibrare(o.kd, d.lam, 0, true) };
      o.be = M.bilantEnergetic(o.r, S.x.T_g);
      o.Qf = S.x.f_ar * o.be.Q_r;
      o.ar = M.aripioare(o.Qf, S.x.v_ar / 3.6 * 0.5);
      const V = S.v; o.veh = { m: V.m_gol + V.m_pilot, CdA: V.CdA, f: V.f, delta: V.delta, rw: M.rRoata(V.anvelopa[0], V.anvelopa[1], V.anvelopa[2]) };
      o.rs = M.rapoarte(S.t);
      o.vmax = M.vMaxima(o.car, o.veh, S.t);
      o.acc = M.accelerare(o.car, o.veh, S.t, 100, { t_sch: 0.15, phi_r: V.phi_r });
      o.accC = M.accelerare(o.car, o.veh, S.t, 100, { cvt: true, phi_r: V.phi_r });
      o.Rcvt = o.rs[0] / (d.n_P * Math.PI / 30 * o.veh.rw / (o.vmax / 3.6));
      if (!doi) {
        o.wm = [1, 2, 3].map(p => M.consumCiclu(o.r, o.car, o.veh, S.t, WMTC["p" + p].map(x => x / 3.6), S.c.n_idle, S.c.n_min_drv, { p_pomp: S.w.p_pomp, k_eta: S.w.k_eta }));
        o.CO2 = 0.25 * o.wm[0].CO2 + 0.5 * o.wm[1].CO2 + 0.25 * o.wm[2].CO2;
        o.L = 0.25 * o.wm[0].L100 + 0.5 * o.wm[1].L100 + 0.25 * o.wm[2].L100;
      }
      R = o; $("#sumar").classList.remove("lucru"); render();
    } catch (err) { $("#sumar").classList.remove("lucru"); $("#sumar").innerHTML = `<div class="alerta">Calculul nu s-a putut face: ${esc(err.message)}</div>`; console.error(err); }
  }

  function checks() {
    const r = R.r, d = S.d, ok = x => x ? "ok" : "atentie", o = [];
    o.push(["Temperatura la sfârșitul umplerii (bilanțul entalpiilor)", `ΔT<sub>a</sub> = ${fmt(r.dT_a, 2)} % ≤ 2 %`, ok(r.dT_a <= 2)]);
    if (d.tau === 4) o.push(["Temperatura gazelor reziduale", `T<sub>r</sub>' = ${fmt(r.T_r_c, 0)} K; ΔT<sub>r</sub> = ${fmt(r.dT_r, 2)} % ≤ 5 %`, ok(r.dT_r <= 5)]);
    o.push(["Puterea după rotunjirea dimensiunilor", `${fmt(r.P_e_r, 1)} kW; ΔP<sub>e</sub> = ${fmt(r.dP_e, 1)} %`, ok(Math.abs(r.dP_e) <= 5)]);
    o.push(["Viteza medie a pistonului", `${fmt(r.W_m, 2)} m/s ≤ 22 m/s`, ok(r.W_m <= 22)]);
    if (d.tau === 2) {
      o.push(["Randamentul de reținere", `η<sub>ret</sub> = ${fmt(r.TE, 3)}; c<sub>e,liv</sub> = ${fmt(r.c_e_liv, 0)} g/kWh`, ok(r.TE <= 1 && r.TE > 0.4)]);
      o.push(["Presiunea la deschiderea baleiajului / presiunea din carter", `${fmt(R.ev.p_tr, 3)} / ${fmt(R.pcart, 3)} MPa (×${fmt(R.ev.p_tr / R.pcart, 1)})`, ok(R.ev.p_tr <= R.pcart)]);
    }
    o.push(["Aria de aripioare (răcire cu aer)", `${fmt(R.ar.A, 2)} m² la ${fmt(S.x.v_ar, 0)} km/h`, ok(R.ar.A <= 0.6)]);
    if (d.tau === 4 && S.w.CO2_ref > 0) o.push(["CO₂ pe WMTC față de valoarea omologată", `${fmt(R.CO2, 1)} față de ${fmt(S.w.CO2_ref, 0)} g/km (${fmt((R.CO2 / S.w.CO2_ref - 1) * 100, 1)} %)`, ok(Math.abs(R.CO2 / S.w.CO2_ref - 1) <= 0.10)]);
    return o;
  }

  // ---------------------------------------------------------------- grafice și tabele
  function grafic({ titlu, xEt, yEt, serii, xMin, xMax, yMin, yMax, W, Hh, egal }) {
    W = W || 640; Hh = Hh || 250;
    const m = { l: 56, r: 14, t: 10, b: 40 }, w = W - m.l - m.r, h = Hh - m.t - m.b, ys = [], xs = [];
    serii.forEach(s => { s.y.forEach(v => isFinite(v) && ys.push(v)); (s.x || []).forEach(v => isFinite(v) && xs.push(v)); });
    let x0 = xMin !== undefined ? xMin : Math.min(...xs), x1 = xMax !== undefined ? xMax : Math.max(...xs);
    let y0 = yMin !== undefined ? yMin : Math.min(...ys), y1 = yMax !== undefined ? yMax : Math.max(...ys); if (y1 === y0) { y1 += 1; y0 -= 1; }
    if (egal) { const sx = (x1 - x0) / w, sy = (y1 - y0) / h; if (sx > sy) { const c = (y0 + y1) / 2; y0 = c - sx * h / 2; y1 = c + sx * h / 2; } else { const c = (x0 + x1) / 2; x0 = c - sy * w / 2; x1 = c + sy * w / 2; } }
    const tick = (a, b, n) => { const raw = (b - a) / n, p = Math.pow(10, Math.floor(Math.log10(raw))), st = [1, 2, 2.5, 5, 10].map(k => k * p).find(k => raw <= k); const r = []; for (let v = Math.ceil(a / st) * st; v <= b + 1e-9; v += st) r.push(+v.toFixed(10)); return r; };
    const X = v => m.l + (v - x0) / (x1 - x0) * w, Y = v => m.t + h - (v - y0) / (y1 - y0) * h;
    const dg = v => Math.abs(v) < 10 && v % 1 ? 1 : 0;
    let g = "";
    tick(y0, y1, 5).forEach(v => g += `<line class="grila" x1="${m.l}" x2="${m.l + w}" y1="${Y(v)}" y2="${Y(v)}"/><text class="ax" x="${m.l - 6}" y="${Y(v) + 4}" text-anchor="end">${fmt(v, dg(v))}</text>`);
    tick(x0, x1, 6).forEach(v => g += `<text class="ax" x="${X(v)}" y="${m.t + h + 16}" text-anchor="middle">${fmt(v, dg(v))}</text>`);
    g += `<line class="axa" x1="${m.l}" x2="${m.l + w}" y1="${m.t + h}" y2="${m.t + h}"/><line class="axa" x1="${m.l}" x2="${m.l}" y1="${m.t}" y2="${m.t + h}"/>`;
    g += `<text class="ax-titlu" x="${m.l + w / 2}" y="${Hh - 4}" text-anchor="middle">${xEt}</text><text class="ax-titlu" transform="translate(13 ${m.t + h / 2}) rotate(-90)" text-anchor="middle">${yEt}</text>`;
    serii.forEach((s, i) => { g += `<polyline class="serie serie-${s.cls !== undefined ? s.cls : i}${s.sub ? " subtire" : ""}" points="${s.y.map((v, k) => X(s.x ? s.x[k] : k).toFixed(1) + "," + Y(Math.min(Math.max(v, y0), y1)).toFixed(1)).join(" ")}"/>`; });
    const leg = serii.filter(s => s.nume).map((s, i) => `<span><i class="serie-${s.cls !== undefined ? s.cls : i}"></i>${s.nume}</span>`).join("");
    return `<figure class="grafic"><figcaption>${titlu}</figcaption><svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="${esc(titlu)}">${g}</svg>${leg ? `<div class="legenda">${leg}</div>` : ""}</figure>`;
  }
  function bare(titlu, et, vals, um, d) {
    const mx = Math.max(...vals);
    return `<figure class="grafic"><figcaption>${titlu}</figcaption><div class="bare">${vals.map((v, i) => `<div class="bara"><span class="bara-et">${et[i]}</span><span class="bara-f"><i style="width:${(Math.max(v, 0) / mx * 100).toFixed(1)}%" class="b${i % 5}"></i></span><span class="bara-v">${fmt(v, d === undefined ? 1 : d)} ${um}</span></div>`).join("")}</div></figure>`;
  }
  const tabel = (cap, rows) => `<div class="tabel-container"><table class="tabel"><thead><tr>${cap.map((c, i) => `<th${i ? ' class="num"' : ""}>${c}</th>`).join("")}</tr></thead><tbody>${rows.map(r => r.sectiune ? `<tr class="sectiune"><td colspan="${cap.length}">${r.sectiune}</td></tr>` : `<tr>${r.map((c, i) => `<td${i ? ' class="num"' : ""}>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  const ins = s => `<span class="insigna ${s}">${s === "ok" ? "îndeplinită" : "de analizat"}</span>`;
  const rar = (a, step) => a.filter((_, i) => i % step === 0);

  const TAB = [["termic", "Calcul termic (cap. 3–4)"], ["gaze", "Schimbul de gaze (cap. 2)"], ["caract", "Diagrama și caracteristica (cap. 5)"],
    ["dinam", "Dinamica, volantul, echilibrarea (cap. 6–7)"], ["racire", "Răcirea (cap. 8)"], ["trans", "Transmisia și performanțele (cap. 9)"], ["ver", "Verificări (§12.2)"]];
  function render() {
    const r = R.r, ch = checks(), n = ch.filter(c => c[2] === "ok").length;
    const k = [["Alezaj × cursă", fmt(r.D_cil, 1) + " × " + fmt(r.S_cil, 1), "mm"], ["Presiunea medie efectivă", fmt(r.p_e, 3), "MPa"],
      ["Consum specific (livrat)", fmt(r.c_e_liv, 0), "g/kWh"], ["Cuplul maxim", fmt(R.car.M_max, 1), "N·m"], ["Viteza maximă", fmt(R.vmax, 0), "km/h"],
      S.d.tau === 4 ? ["CO₂ pe WMTC", fmt(R.CO2, 1), "g/km"] : ["Randamentul de reținere", fmt(r.TE, 3), "–"]];
    $("#sumar").innerHTML = `<div class="kpiuri">${k.map(x => `<div class="kpi"><span class="kpi-et">${x[0]}</span><span class="kpi-v">${x[1]}</span><span class="kpi-um">${x[2]}</span></div>`).join("")}</div>
      <div class="stare ${n === ch.length ? "stare-ok" : "stare-atentie"}">${NUME[S.key]}: ${n} din ${ch.length} verificări îndeplinite${n === ch.length ? "." : " – vezi fila Verificări."}</div>`;
    $("#taburi").innerHTML = TAB.map(([k_, t]) => `<button type="button" role="tab" data-tab="${k_}" aria-selected="${k_ === S.tab}">${t}</button>`).join("");
    $("#taburi").querySelectorAll("button").forEach(b => b.addEventListener("click", () => { S.tab = b.dataset.tab; render(); }));
    const F = { termic: tTermic, gaze: tGaze, caract: tCaract, dinam: tDinam, racire: tRacire, trans: tTrans, ver: () => tabel(["Verificare", "Valoare", "Stare"], checks().map(c => [c[0], c[1], ins(c[2])])) };
    $("#continut").innerHTML = F[S.tab]();
    $("#continut").insertAdjacentHTML("beforeend", `<div class="doar-tipar">${TAB.filter(t => t[0] !== S.tab).map(([k_, t]) => `<section class="foaie-tipar"><h2>${t}</h2>${F[k_]()}</section>`).join("")}</div>`);
  }
  function tTermic() {
    const r = R.r, d = S.d, doi = d.tau === 2;
    return tabel(["Mărime", "Valoare"], [{ sectiune: "Umplerea" },
      ["Aer teoretic L<sub>t</sub>; încărcătura M<sub>1</sub>; produse M<sub>2</sub> [kmol/kg]", `${fmt(r.L_t, 4)}; ${fmt(r.M_1, 4)}; ${fmt(r.M_2, 4)}`],
      ["Coeficientul gazelor reziduale γ<sub>r</sub>", fmt(r.g_r, 4)],
      ["T<sub>a</sub>; T<sub>a</sub>' (entalpii); abaterea", `${fmt(r.T_a, 1)} K; ${fmt(r.T_a_h, 1)} K; ${fmt(r.dT_a, 2)} %`],
      ["p<sub>a</sub>; " + (doi ? "η<sub>înc</sub>" : "η<sub>v</sub>"), `${fmt(r.p_a, 4)} MPa; ${fmt(r.eta_v, 3)}`],
      { sectiune: "Comprimarea, arderea, destinderea" },
      ["a<sub>1</sub>; b<sub>1</sub>; n<sub>1</sub>", `${fmt(r.a_1, 3)}; ${fmt(r.b_1, 6)}; ${fmt(r.n1, 4)}`],
      ["p<sub>c</sub>; T<sub>c</sub>", `${fmt(r.p_c, 3)} MPa; ${fmt(r.T_c, 1)} K`],
      ["T<sub>z</sub>; p<sub>z</sub>; λ<sub>p</sub>", `${fmt(r.T_z, 1)} K; ${fmt(r.p_z, 3)} MPa; ${fmt(r.lam_p, 3)}`],
      ["n<sub>2</sub>; p<sub>b</sub>; T<sub>b</sub>" + (doi ? " (la DE)" : ""), `${fmt(r.n2, 4)}; ${fmt(r.p_b, 4)} MPa; ${fmt(r.T_b, 1)} K`],
      doi ? ["Verificarea lui T<sub>r</sub>", "nu se aplică la 2T"] : ["T<sub>r</sub>'; abaterea", `${fmt(r.T_r_c, 1)} K; ${fmt(r.dT_r, 2)} %`],
      { sectiune: "Parametrii indicați și efectivi" },
      ["p<sub>i</sub>'; p<sub>i</sub>", `${fmt(r.p_it, 4)}; ${fmt(r.p_i, 4)} MPa`], ["η<sub>i</sub>; c<sub>i</sub>", `${fmt(r.eta_i, 3)}; ${fmt(r.c_i, 1)} g/kWh`],
      ["p<sub>e</sub>; η<sub>e</sub>; c<sub>e</sub>", `${fmt(r.p_e, 4)} MPa; ${fmt(r.eta_e, 3)}; ${fmt(r.c_e, 1)} g/kWh`],
      doi ? ["c<sub>e,liv</sub>; η<sub>e,liv</sub> (combustibil livrat)", `${fmt(r.c_e_liv, 1)} g/kWh; ${fmt(r.eta_e_liv, 3)}`] : null,
      ["Consumul orar", `${fmt(r.C_h, 2)} kg/h`],
      { sectiune: "Dimensiunile" },
      ["V<sub>h</sub>", `${fmt(r.V_h, 4)} dm³`], ["D; S; L<sub>b</sub>", `${fmt(r.D_cil, 1)}; ${fmt(r.S_cil, 1)}; ${fmt(r.L_b, 0)} mm`],
      ["W<sub>m</sub>; P<sub>l</sub>; K<sub>sol</sub>", `${fmt(r.W_m, 2)} m/s; ${fmt(r.P_l, 1)} kW/dm³; ${fmt(r.K_sol, 1)} MPa·m/s`],
      [`P<sub>e</sub> cu ${fmt(r.D_r, 1)} × ${fmt(r.S_r, 1)} mm`, `${fmt(r.P_e_r, 1)} kW (${fmt(r.dP_e, 1)} %)`],
      ["V<sub>c</sub>; V<sub>a</sub>" + (doi ? "; ε<sub>g</sub>" : ""), `${fmt(r.V_c, 1)}; ${fmt(r.V_a, 1)} cm³` + (doi ? `; ${fmt(r.eps_g, 1)}` : "")]].filter(x => x));
  }
  function tGaze() {
    const r = R.r, d = S.d;
    if (d.tau === 4) return `<p class="nota">La motorul în patru timpi umplerea este caracterizată de ξ<sub>a</sub>, γ<sub>r</sub> și coeficientul de umplere (§2.1).</p>` +
      tabel(["Umplerea", "Valoare"], [["p<sub>a</sub>/p<sub>s</sub>", fmt(d.xi_a, 3)], ["γ<sub>r</sub>", fmt(r.g_r, 4)], ["T<sub>a</sub>", fmt(r.T_a, 1) + " K"], ["η<sub>v</sub>", fmt(r.eta_v, 3)]]);
    const ev = R.ev, tb = R.tb, h = ev.hist;
    let x = tabel(["Distribuția și baleiajul (§2.2–2.3)", "Valoare"], [
      ["Evacuarea / baleiajul (durate)", `${fmt(360 - 2 * d.th_ev, 0)}° / ${fmt(360 - 2 * d.th_tr, 0)}°`],
      ["Cursa utilă k<sub>t</sub>; ε efectiv / geometric", `${fmt(r.k_t * 100, 1)} %; ${fmt(d.eps, 2)} / ${fmt(r.eps_g, 1)}`],
      ["Înălțimea ferestrei de evacuare / de baleiaj", `${fmt(ev.h_ev, 1)} / ${fmt(ev.h_tr, 1)} mm`],
      ["Λ<sub>c</sub>; η<sub>bal</sub>; γ<sub>r</sub>", `${fmt(r.DR_c, 3)}; ${fmt(r.SE, 3)}; ${fmt(r.g_r, 4)}`],
      ["η<sub>înc</sub>; η<sub>ret</sub>; pierdut prin evacuare", `${fmt(r.CE, 3)}; ${fmt(r.TE, 3)}; ${fmt((1 - r.TE) * 100, 1)} %`],
      { sectiune: "Destinderea liberă și aria–timp (§2.4)" },
      ["Ariile maxime: evacuare / baleiaj", `${fmt(ev.A_ev_max * 1e6, 0)} / ${fmt(ev.A_tr_max * 1e6, 0)} mm²`],
      ["Presiunea în carter la DB", fmt(R.pcart, 3) + " MPa"], ["Presiunea în cilindru la DB", `${fmt(ev.p_tr, 3)} MPa (×${fmt(ev.p_tr / R.pcart, 1)})`],
      ["Masa evacuată în destinderea liberă", fmt((1 - ev.m_frac) * 100, 0) + " %"],
      ["Aria–timp: destindere liberă / evacuare / baleiaj", `${fmt(ev.AT_bd * 1e4, 2)} / ${fmt(ev.AT_ev * 1e4, 1)} / ${fmt(ev.AT_tr * 1e4, 1)} ·10⁻⁴ s/m`],
      { sectiune: "Camera de expansiune (§2.5)" },
      ["Viteza sunetului; lungimea acordată L<sub>t</sub>", `${fmt(tb.a, 0)} m/s; ${fmt(tb.L_t * 1000, 0)} mm la ${fmt(d.n_P, 0)} rot/min`],
      ["Colector d<sub>h</sub> × L<sub>h</sub>", `${fmt(tb.d_h, 1)} mm × ${fmt(tb.L_h * 1000, 0)} mm`],
      ["Difuzor (12°); burtă D<sub>b</sub> × L", `${fmt(tb.L_dif * 1000, 0)} mm; ${fmt(tb.D_b, 1)} × ${fmt(tb.L_burta * 1000, 0)} mm`],
      ["Con invers (24°); coadă d<sub>s</sub> × L", `${fmt(tb.L_baf * 1000, 0)} mm; ${fmt(tb.d_s, 1)} × ${fmt(tb.L_s * 1000, 0)} mm`]]);
    const dr = []; for (let i = 0; i <= 100; i++) dr.push(i * 0.02);
    x += `<div class="grafice">${grafic({ titlu: "Destinderea liberă: presiunea în cilindru", xEt: "α [°RAC după PMI]", yEt: "p [MPa]", serii: [{ x: h.map(q => q[0]), y: h.map(q => q[1]), nume: "cilindru" }, { x: [d.th_ev, d.th_tr], y: [R.pcart, R.pcart], nume: "carter", cls: 1 }], yMin: 0 })}
      ${grafic({ titlu: "Eficiența baleiajului (Benson–Brandham)", xEt: "Λ<tspan>c</tspan>", yEt: "η bal", serii: [{ x: dr, y: dr.map(q => M.baleiajBB(q, d.x_d, d.y_s)), nume: "model" }, { x: dr, y: dr.map(q => 1 - Math.exp(-q)), nume: "amestecare perfectă", cls: 1, sub: true }, { x: [r.DR_c, r.DR_c], y: [0, r.SE], nume: "exemplul", cls: 2 }], xMin: 0, yMin: 0, yMax: 1 })}</div>`;
    return x;
  }
  function tCaract() {
    const r = R.r, c = R.car, pa = R.pa, d = S.d, rows = [];
    for (let n = Math.ceil(S.c.n_min / 500) * 500; n <= S.c.n_max; n += 500) { const i = c.n.findIndex(v => v >= n); rows.push([fmt(n, 0), fmt(M.interp(n, c.n, c.Pe), 1), fmt(M.interp(n, c.n, c.Me), 1), fmt(M.interp(n, c.n, c.ce), 0)]); }
    let x = `<p class="nota">Coeficienții Leiderman: a = ${fmt(c.a, 3)}, b = ${fmt(c.b, 3)}, c = ${fmt(c.c, 3)}. Cuplul maxim ${fmt(c.M_max, 1)} N·m la ${fmt(c.n_M, 0)} rot/min; elasticitatea ${fmt(c.el, 3)}.</p>`;
    x += `<div class="grafice">${grafic({ titlu: "Diagrama indicată p–V", xEt: "V [cm³]", yEt: "p [MPa]", serii: [{ x: pa.map(q => q[1]), y: pa.map(q => q[2]) }], yMin: 0 })}
      ${grafic({ titlu: "Diagrama indicată p–α", xEt: "α [°RAC]", yEt: "p [MPa]", serii: [{ x: pa.map(q => q[0]), y: pa.map(q => q[2]), cls: 1 }], yMin: 0, xMin: 0 })}
      ${grafic({ titlu: "Caracteristica exterioară", xEt: "n [rot/min]", yEt: "P [kW], M [N·m]", serii: [{ x: rar(c.n, 4), y: rar(c.Pe, 4), nume: "P<sub>e</sub>" }, { x: rar(c.n, 4), y: rar(c.Me, 4), nume: "M<sub>e</sub>", cls: 1 }], yMin: 0 })}
      ${grafic({ titlu: "Consumul specific (livrat)", xEt: "n [rot/min]", yEt: "c<tspan>e</tspan> [g/kWh]", serii: [{ x: rar(c.n, 4), y: rar(c.ce, 4), cls: 2 }] })}</div>`;
    return x + tabel(["n [rot/min]", "P<sub>e</sub> [kW]", "M<sub>e</sub> [N·m]", "c<sub>e</sub> [g/kWh]"], rows);
  }
  function tDinam() {
    const kd = R.kd, e = R.eq, d = S.d, v = R.vol, st = d.tau === 2 ? 2 : 4;
    let x = tabel(["Mărime", "Valoare"], [["m<sub>j</sub>; m<sub>bm</sub>", `${fmt(kd.m_j, 3)}; ${fmt(kd.m_bm, 3)} kg`],
      ["Viteza / accelerația maximă a pistonului", `${fmt(kd.v_max, 1)} m/s; ${fmt(kd.a_max, 0)} m/s²`],
      ["F<sub>g,max</sub>; |F<sub>j</sub>|<sub>max</sub>; |N|<sub>max</sub>", `${fmt(Math.max(...kd.Fg) / 1000, 1)}; ${fmt(Math.max(...kd.Fj.map(Math.abs)) / 1000, 2)}; ${fmt(kd.N_max / 1000, 2)} kN`],
      ["Momentul: minim; maxim; mediu", `${fmt(Math.min(...kd.M), 0)}; ${fmt(Math.max(...kd.M), 0)}; ${fmt(kd.M_med, 1)} N·m`],
      { sectiune: `Volantul la ${fmt(S.x.n_vol, 0)} rot/min, δ = ${fmt(S.x.delta, 2)}` },
      ["ΔE; J necesar", `${fmt(v.dE, 0)} J; ${fmt(v.J * 1000, 1)}·10⁻³ kg·m²`],
      { sectiune: "Echilibrarea" },
      ["Forța de ordinul I / II", `${fmt(e.e0.F1 / 1000, 2)} / ${fmt(e.e0.F2 / 1000, 2)} kN`],
      ["Forța maximă pe cadru: fără contragreutate", fmt(e.e0.Fr_max / 1000, 2) + " kN"],
      [`Contragreutate ${fmt(S.x.k_ech * 100, 0)} % (F<sub>y</sub> / F<sub>x</sub>)`, `${fmt(e.ek.Fr_max / 1000, 2)} kN (${fmt(e.ek.Fy_max / 1000, 2)} / ${fmt(e.ek.Fx_max / 1000, 2)})`],
      ["Cu arbore de echilibrare", fmt(e.arb.Fr_max / 1000, 2) + " kN"]]);
    x += `<div class="grafice">${grafic({ titlu: "Forțele în axa cilindrului", xEt: "α [°RAC]", yEt: "F [kN]", serii: [{ x: rar(kd.alfa, st), y: rar(kd.Fg, st).map(q => q / 1000), nume: "F<sub>g</sub>", cls: 1 }, { x: rar(kd.alfa, st), y: rar(kd.Fj, st).map(q => q / 1000), nume: "F<sub>j</sub>", cls: 0 }, { x: rar(kd.alfa, st), y: rar(kd.F, st).map(q => q / 1000), nume: "F", cls: 3 }] })}
      ${grafic({ titlu: "Momentul unui cilindru", xEt: "α [°RAC]", yEt: "M [N·m]", serii: [{ x: rar(kd.alfa, st), y: rar(kd.M, st), cls: 2 }] })}
      ${grafic({ titlu: "Forța neechilibrată pe cadru (diagramă polară)", xEt: "F<tspan>x</tspan> [kN]", yEt: "F<tspan>y</tspan> [kN]", egal: true, serii: [{ x: e.e0.Fx.map(q => q / 1000), y: e.e0.Fy.map(q => q / 1000), nume: "fără", cls: 3, sub: true }, { x: e.ek.Fx.map(q => q / 1000), y: e.ek.Fy.map(q => q / 1000), nume: `${fmt(S.x.k_ech * 100, 0)} %` }, { x: e.arb.Fx.map(q => q / 1000), y: e.arb.Fy.map(q => q / 1000), nume: "arbore", cls: 1 }] })}</div>`;
    return x;
  }
  function tRacire() {
    const b = R.be, a = R.ar;
    const et = ["lucru util", "gaze de evacuare", "combustibil scurtcircuitat", "răcire", "alte pierderi"], vs = [b.q_e, b.q_ev, b.q_nears, b.q_r, b.q_rest].map(q => q * 100);
    return tabel(["Bilanțul energetic la putere maximă", "Valoare"], [["Puterea combustibilului livrat", fmt(b.P_comb, 1) + " kW"],
      ...et.map((t, i) => [t, fmt(vs[i], 1) + " %"]), ["Căldura cedată răcirii Q<sub>r</sub>", fmt(b.Q_r, 1) + " kW"],
      { sectiune: `Răcirea cu aer: ${fmt(S.x.f_ar * 100, 0)} % din Q<sub>r</sub> prin aripioare, la ${fmt(S.x.v_ar, 0)} km/h` },
      ["Căldura prin aripioare", fmt(R.Qf, 1) + " kW"], ["Re; h", `${fmt(a.Re, 0)}; ${fmt(a.h, 1)} W/(m²·K)`],
      ["mL; randamentul aripioarei", `${fmt(a.mL, 3)}; ${fmt(a.eta_f, 3)}`], ["Aria necesară", fmt(a.A, 2) + " m²"]]) +
      `<div class="grafice">${bare("Bilanțul energetic", et, vs, "%")}</div>`;
  }
  function tTrans() {
    const d = S.d, veh = R.veh, T = S.t, c = R.car;
    const rows = R.rs.map((it, j) => [j + 1, fmt(T.i_cv[j], 3), fmt(it, 2), fmt(d.n_P * Math.PI / 30 * veh.rw / it * 3.6, 0), fmt(c.M_max * it * T.eta / veh.rw / 1000, 2)]);
    let x = tabel(["Treapta", "i<sub>cv</sub>", "i<sub>k</sub>", "v la n<sub>P</sub> [km/h]", "F<sub>r</sub> la M<sub>max</sub> [kN]"], rows);
    x += "<br>" + tabel(["Performanțele", "Valoare"], [["Masa în calcul; raza roții", `${fmt(veh.m, 0)} kg; ${fmt(veh.rw * 1000, 0)} mm`], ["Viteza maximă", fmt(R.vmax, 0) + " km/h"],
      ["0–100 km/h: cutie (schimbări) / CVT ideal", `${fmt(R.acc.t, 1)} s (${R.acc.nsch}) / ${fmt(R.accC.t, 1)} s`],
      ["Domeniul de rapoarte: CVT necesar / cutie", `${fmt(R.Rcvt, 2)} / ${fmt(R.rs[0] / R.rs[R.rs.length - 1], 2)}`]]);
    const tr = M.tractiune(c, veh, T), vv = []; for (let v = 5; v <= 200; v += 2.5) vv.push(v / 3.6);
    const serii = tr.map(q => ({ x: rar(q.v, 8).map(v => v * 3.6), y: rar(q.F, 8).map(F => F / 1000), cls: 0 }));
    serii.push({ x: vv.map(v => v * 3.6), y: vv.map(v => M.FmaxV(c, veh, T, v, true) / 1000), nume: "CVT ideal", cls: 1, sub: true });
    serii.push({ x: vv.map(v => v * 3.6), y: vv.map(v => (veh.m * M.G * veh.f + 0.5 * M.RHO_AIR * veh.CdA * v * v) / 1000), nume: "rezistențe", cls: 3 });
    x += `<div class="grafice">${grafic({ titlu: "Diagrama de tracțiune", xEt: "v [km/h]", yEt: "F<tspan>r</tspan> [kN]", serii, xMin: 0, xMax: 200, yMin: 0 })}</div>`;
    if (d.tau === 4) {
      x += tabel(["WMTC (clasa 3-2)", "Partea 1", "Partea 2", "Partea 3", "Ponderat"], [["Distanța [km]", ...R.wm.map(q => fmt(q.d_km, 3)), ""],
        ["Consumul [L/100 km]", ...R.wm.map(q => fmt(q.L100, 2)), fmt(R.L, 2)], ["CO₂ [g/km]", ...R.wm.map(q => fmt(q.CO2, 1)), fmt(R.CO2, 1)]]);
      const vw = [].concat(WMTC.p1, WMTC.p2, WMTC.p3), nw = [].concat(R.wm[0].n, [S.c.n_idle], R.wm[1].n, [S.c.n_idle], R.wm[2].n, [S.c.n_idle]);
      x += `<div class="grafice">${grafic({ titlu: "Ciclul WMTC", xEt: "t [s]", yEt: "v [km/h]", serii: [{ y: rar(vw, 2), x: rar(vw.map((_, i) => i), 2), sub: true }], yMin: 0 })}
        ${grafic({ titlu: "Turația motorului pe WMTC", xEt: "t [s]", yEt: "n [rot/min]", serii: [{ y: rar(nw, 2), x: rar(nw.map((_, i) => i), 2), cls: 1, sub: true }] })}</div>`;
    }
    return x;
  }

  function download(name, text) { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿" + text], { type: "text/csv;charset=utf-8" })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
  $("#btn-csv").addEventListener("click", () => { if (!R) return; download("diagrama_" + S.key + ".csv", "alfa [°RAC];V [cm³];p [MPa];M [N·m]\n" + R.pa.map((q, i) => [q[0], q[1], q[2], R.kd.M[i]].map(v => String(+Number(v).toFixed(5)).replace(".", ",")).join(";")).join("\n")); });
  $("#btn-print").addEventListener("click", () => window.print());
  initState("EX2T"); renderForm(); compute();
})();
