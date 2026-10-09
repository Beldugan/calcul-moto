// Motorul de calcul al aplicației – port fidel al moto_engine.py (îndrumarul „Proiectarea sistemelor de propulsie
// cu MAS în doi și patru timpi ale vehiculelor cu două roți”). Aceleași relații și aceleași rezultate.
(function (root) {
  "use strict";
  const TAB = (typeof module !== "undefined") ? require("./tabele.js") : root.TABELE;
  const T0TAB = TAB[0][0], PAS = 50.0, R_U = 8.314, G = 9.81, RHO_AIR = 1.18;
  const rad = d => d * Math.PI / 180;
  const clone = o => JSON.parse(JSON.stringify(o));

  function tab(T, c) {
    const k = Math.floor((T - T0TAB) / PAS);
    if (k < 0 || k + 1 >= TAB.length) throw new Error("T = " + T.toFixed(1) + " K în afara tabelelor");
    return TAB[k][c] + (T - TAB[k][0]) * (TAB[k + 1][c] - TAB[k][c]) / PAS;
  }
  const uMix = (T, n) => n[0] * tab(T, 1) + n[1] * tab(T, 2) + n[2] * tab(T, 3) + n[3] * tab(T, 4);
  const iMix = (T, n) => n[0] * tab(T, 5) + n[1] * tab(T, 6) + n[2] * tab(T, 7) + n[3] * tab(T, 8);
  function colMix(n, kind) {
    const off = kind === "u" ? 1 : 5;
    return TAB.map(r => r[off] * n[0] + r[off + 1] * n[1] + r[off + 2] * n[2] + r[off + 3] * n[3]);
  }
  function invers(X, col) {
    let k = -1;
    for (let j = 0; j < col.length; j++) if (col[j] <= X) k = j;
    if (k < 0 || k + 1 >= col.length) throw new Error("valoare în afara tabelelor");
    return TAB[k][0] + PAS * (X - col[k]) / (col[k + 1] - col[k]);
  }
  function regresie(x, y) {
    const n = x.length, mx = x.reduce((a, b) => a + b, 0) / n, my = y.reduce((a, b) => a + b, 0) / n;
    let sxy = 0, sxx = 0;
    for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; }
    const b = sxy / sxx; return [my - b * mx, b];
  }
  const xPiston = (a, lam) => 0.5 * ((1 - Math.cos(rad(a))) + lam / 4 * (1 - Math.cos(2 * rad(a))));
  function baleiajBB(DRc, xd, ys) {
    const L = (1 - ys) * DRc;
    if (L <= xd) return L;
    return 1 - (1 - xd) * Math.exp(-(L - xd) / (1 - xd));
  }

  // ---------------------------------------------------------------- calculul termic
  function calculTermic(D0) {
    const D = clone(D0), doi = D.tau === 2, eps = D.eps, lam = D.lam, r = {};
    let k_t, h_ev, eps_g, Va_Vh, h_tr;
    if (doi) {
      k_t = xPiston(360 - D.th_ev, lam); h_ev = 1 - k_t; eps_g = 1 + (eps - 1) / k_t;
      Va_Vh = k_t + 1 / (eps_g - 1); h_tr = 1 - xPiston(D.th_tr, lam);
    } else { k_t = 1; h_ev = 0; eps_g = eps; h_tr = 0; Va_Vh = eps / (eps - 1); }
    const O_t = D.c_f / 12 + D.h_f / 4 - D.o_f / 32, L_t = O_t / 0.21, L_a = D.alfa * L_t, M_1 = L_a + 1 / D.M_c;
    const g = [D.c_f / 12, D.h_f / 2, 0.21 * (D.alfa - 1) * L_t, 0.79 * L_a], M_2 = g.reduce((a, b) => a + b, 0), mu_0 = M_2 / M_1;
    let DR = null, DR_c = null, SE = null, g_r;
    if (doi) { DR = D.DR; DR_c = DR / Va_Vh; SE = baleiajBB(DR_c, D.x_d, D.y_s); g_r = (1 - SE) / SE; } else g_r = D.g_r;
    const M_r = g_r * M_1, rr = g.map(x => M_r * x / M_2);
    const a = [rr[0], rr[1], rr[2] + 0.21 * M_1, rr[3] + 0.79 * M_1], M_a = M_1 + M_r;
    const T_in = D.T_s + D.dT, T_a = (T_in + g_r * D.T_r) / (1 + g_r);
    const I_a = M_1 * (0.21 * tab(T_in, 7) + 0.79 * tab(T_in, 8)) + iMix(D.T_r, rr);
    const T_a_h = invers(I_a, colMix(a, "i")), dT_a = Math.abs(T_a_h - T_a) / T_a * 100;
    const p_a = D.xi_a * D.p_s;
    const eta_v = Va_Vh * (p_a / D.p_s) * D.T_s / (T_a * (1 + g_r));
    const TE = doi ? eta_v / DR : 1, CE = eta_v;
    // comprimare
    const temp = TAB.map(r_ => r_[0]);
    const ca = colMix(a, "u").map((u, i) => u / (M_a * temp[i]));
    const i300 = temp.indexOf(300), i1000 = temp.indexOf(1000);
    const [a_1, b_1] = regresie(temp.slice(i300, i1000 + 1), ca.slice(i300, i1000 + 1));
    let n1 = 1.37; for (let k = 0; k < 12; k++) n1 = 1 + R_U / (a_1 + b_1 * T_a * (eps ** (n1 - 1) + 1));
    const p_c = p_a * eps ** n1, T_c = T_a * eps ** (n1 - 1), U_c = uMix(T_c, a);
    // ardere izocoră
    const z = [g[0] + rr[0], g[1] + rr[1], g[2] + rr[2], g[3] + rr[3]], M_z = z.reduce((x, y) => x + y, 0), mu_r = M_z / M_a;
    const U_z = U_c + D.xi_v * D.Q_i, T_z = invers(U_z, colMix(z, "u"));
    const p_z = p_c * M_z / M_a * T_z / T_c, lam_p = p_z / p_c, p_max = 0.85 * p_z;
    // destindere
    const cz = colMix(z, "u").map((u, i) => u / (M_z * temp[i]));
    const i900 = temp.indexOf(900), i2800 = temp.indexOf(2800);
    const [a_2, b_2] = regresie(temp.slice(i900, i2800 + 1), cz.slice(i900, i2800 + 1));
    const delta = eps;
    let n2 = 1.26; for (let k = 0; k < 12; k++) n2 = 1 + R_U / (a_2 + b_2 * T_z * (1 + delta ** (1 - n2)));
    const p_b = p_z / delta ** n2, T_b = T_z / delta ** (n2 - 1);
    let T_r_c = null, dT_r = null;
    if (!doi) { T_r_c = T_b / (p_b / D.p_r) ** (1 / 3); dT_r = Math.abs(T_r_c - D.T_r) / D.T_r * 100; }
    // indicați și efectivi
    const p_it = p_c / (eps - 1) * (lam_p / (n2 - 1) * (1 - delta ** (1 - n2)) - 1 / (n1 - 1) * (1 - eps ** (1 - n1)));
    const p_i = doi ? D.phi_r * p_it * k_t : D.phi_r * p_it - (D.p_r - p_a);
    const eta_i = R_U * M_1 * D.T_s * p_i / (D.p_s * eta_v * D.Q_i), c_i = 3.6e6 / (eta_i * D.Q_i);
    const p_e = D.eta_m * p_i, eta_e = D.eta_m * eta_i, c_e = c_i / D.eta_m;
    const k_f = doi ? (D.k_f || 0) : 0;
    const c_e_liv = doi ? c_e / (1 - k_f * (1 - TE)) : c_e, eta_e_liv = 3.6e6 / (c_e_liv * D.Q_i), C_h = c_e_liv * D.P_nom / 1000;
    // dimensiuni
    const M_P = 9549.3 * D.P_nom / D.n_P, V_h = 30 * D.tau * D.P_nom / (p_e * D.n_P * D.i_cil);
    const D_cil = (4 * V_h * 1e6 / (Math.PI * D.psi)) ** (1 / 3), S_cil = D.psi * D_cil, R_man = S_cil / 2, L_b = R_man / lam;
    const W_m = S_cil * D.n_P / 30000, P_l = D.P_nom / (D.i_cil * V_h);
    const D_r = D.D_r || Math.round(D_cil * 2) / 2, S_r = D.S_r || Math.round(S_cil * 2) / 2;
    const V_h_r = Math.PI * D_r ** 2 / 4 * S_r / 1e6, P_e_r = p_e * V_h_r * D.i_cil * D.n_P / (30 * D.tau), dP_e = (P_e_r - D.P_nom) / D.P_nom * 100;
    const A_p = Math.PI * (D_cil / 100) ** 2 / 4, P_A = D.P_nom / (D.i_cil * A_p), K_sol = p_e * W_m;
    const V_c = V_h * 1000 / (eps_g - 1), V_a = Va_Vh * V_h * 1000;
    Object.assign(r, { k_t, h_ev, eps_g, Va_Vh, h_tr, O_t, L_t, L_a, M_1, g, M_2, mu_0, DR, DR_c, SE, g_r, M_r, rr, a, M_a, T_in, T_a, I_a, T_a_h, dT_a,
      p_a, eta_v, TE, CE, a_1, b_1, n1, p_c, T_c, U_c, z, M_z, mu_r, U_z, T_z, p_z, lam_p, p_max, a_2, b_2, delta, n2, p_b, T_b, T_r_c, dT_r,
      p_it, p_i, eta_i, c_i, p_e, eta_e, c_e, k_f, c_e_liv, eta_e_liv, C_h, M_P, V_h, D_cil, S_cil, R_man, L_b, W_m, P_l, D_r, S_r, V_h_r, P_e_r, dP_e,
      A_p, P_A, K_sol, V_c, V_a, date: D });
    return r;
  }

  function diagrama(r, pas) {
    pas = pas || 1.0;
    const D = r.date, lam = D.lam, Vh = r.V_h * 1000, Vc = r.V_c, out = [];
    if (D.tau === 4) {
      for (let k = 0; k <= Math.round(720 / pas); k++) {
        const al = k * pas, V = Vc + Vh * xPiston(al, lam);
        let p;
        if (al <= 180) p = r.p_a; else if (al <= 360) p = r.p_a * (r.V_a / V) ** r.n1; else if (al <= 540) p = r.p_z * (Vc / V) ** r.n2; else p = D.p_r;
        out.push([al, V, p]);
      }
    } else {
      const te = D.th_ev, tt = D.th_tr, pev = D.p_r;
      for (let k = 0; k <= Math.round(360 / pas); k++) {
        const al = k * pas, V = Vc + Vh * xPiston(al, lam);
        let p;
        if (al <= te) p = r.p_z * (Vc / V) ** r.n2;
        else if (al <= 360 - te) p = al <= tt ? r.p_b + (pev - r.p_b) * (al - te) / (tt - te) : pev;
        else p = r.p_a * (r.V_a / V) ** r.n1;
        out.push([al, V, p]);
      }
    }
    return out;
  }

  function trapz(y, x) { let s = 0; for (let i = 1; i < y.length; i++) s += 0.5 * (y[i] + y[i - 1]) * (x[i] - x[i - 1]); return s; }
  function arange(a0, a1, st) { const o = []; const n = Math.floor((a1 + 1e-9 - a0) / st); for (let k = 0; k <= n; k++) o.push(a0 + k * st); return o; }

  function evacuareLibera(r, b_ev, b_tr, p_ev, p_cart, Cd, k, Rg, pas) {
    Cd = Cd || 0.70; k = k || 1.32; Rg = Rg || 290.0; pas = pas || 0.1;
    const D = r.date, lam = D.lam, n = D.n_P, S = r.S_cil / 1000, Dm = r.D_cil / 1000, Ap = Math.PI * Dm * Dm / 4, Vc = r.V_c * 1e-6;
    const te = D.th_ev, tt = D.th_tr, h_ev = (1 - xPiston(te, lam)) * S, h_trm = (1 - xPiston(tt, lam)) * S;
    const V = al => Vc + Ap * S * xPiston(al, lam);
    const A_ev = al => Math.max(xPiston(al, lam) * S - (S - h_ev), 0) * b_ev / 1000;
    const A_tr = al => Math.max(xPiston(al, lam) * S - (S - h_trm), 0) * b_tr / 1000;
    let p = r.p_b * 1e6, T = r.T_b, m = p * V(te) / (Rg * T);
    const pe = p_ev * 1e6, crit = (2 / (k + 1)) ** (k / (k - 1)), dt = pas / (6 * n), hist = [];
    let al = te;
    while (al < tt - 1e-9) {
      const pr = Math.max(pe / p, crit);
      let dm = 0;
      if (p > pe) {
        const psi = Math.sqrt(2 * k / (k - 1) * (pr ** (2 / k) - pr ** ((k + 1) / k)));
        dm = -Cd * A_ev(al) * p / Math.sqrt(Rg * T) * psi * dt;
      }
      const V1 = V(al), V2 = V(al + pas), m2 = m + dm, p2 = p * ((m2 / m) * (V1 / V2)) ** k;
      T = T * (p2 / p) ** ((k - 1) / k); p = p2; m = m2; al += pas;
      hist.push([al, p / 1e6, T]);
    }
    const Vh = Ap * S;
    const at = (fA, a0, a1) => { const aa = arange(a0, a1, 0.25); return trapz(aa.map(fA), aa) / (6 * n) / Vh; };
    return { p_tr: p / 1e6, T_tr: T, hist, AT_bd: at(A_ev, te, tt), AT_ev: at(A_ev, te, 360 - te), AT_tr: at(A_tr, tt, 360 - tt),
      A_ev_max: A_ev(180), A_tr_max: A_tr(180), h_ev: h_ev * 1000, h_tr: h_trm * 1000, ok: p / 1e6 <= p_cart,
      m_frac: m / (r.p_b * 1e6 * V(te) / (Rg * r.T_b)) };
  }
  function pCarter(D, k) {
    k = k || 1.35;
    const Vtdc = D.eps_cc / (D.eps_cc - 1);
    return D.p_s * (Vtdc / (Vtdc - xPiston(D.th_tr, D.lam))) ** k;
  }
  function tobaAcordata(r, T_ev, n_acord, d_ev_eq, o) {
    o = Object.assign({ k: 1.32, Rg: 290.0, r_h: 1.0, r_b: 2.5, r_s: 0.60, u_dif: 12.0, u_baf: 24.0, L_h_rel: 5.0 }, o || {});
    const D = r.date, a = Math.sqrt(o.k * o.Rg * T_ev), th = 360 - 2 * D.th_ev, L_t = a * th / (12 * n_acord);
    const d_h = o.r_h * d_ev_eq, D_b = o.r_b * d_h, d_s = o.r_s * d_h, L_h = o.L_h_rel * d_h / 1000;
    const L_dif = (D_b - d_h) / 2 / Math.tan(rad(o.u_dif / 2)) / 1000, L_baf = (D_b - d_s) / 2 / Math.tan(rad(o.u_baf / 2)) / 1000;
    return { a, th, L_t, d_h, D_b, d_s, L_h, L_dif, L_baf, L_burta: L_t - L_h - L_dif - L_baf / 2, L_s: 12 * d_s / 1000, n_acord, T_ev };
  }

  // ---------------------------------------------------------------- caracteristica exterioară
  function coefLeiderman(xM) { const c = 1 / (2 * (1 - xM)), b = 2 * c * xM; return [1 - b + c, b, c]; }
  function linspace(a, b, n) { const o = []; for (let i = 0; i < n; i++) o.push(a + (b - a) * i / (n - 1)); return o; }
  function caracteristica(r, xM, nmin, nmax, kc) {
    kc = kc || 1.2;
    const D = r.date, [a, b, c] = coefLeiderman(xM), n = linspace(nmin, nmax, 401);
    const Pe = n.map(v => { const x = v / D.n_P; return D.P_nom * (a * x + b * x * x - c * x ** 3); });
    const Me = Pe.map((p, i) => 9549.3 * p / n[i]);
    const ce = n.map(v => { const x = v / D.n_P; return r.c_e_liv * (kc - kc * x + x * x); });
    let j = 0; for (let i = 1; i < Me.length; i++) if (Me[i] > Me[j]) j = i;
    return { n, Pe, Me, ce, a, b, c, M_max: Me[j], n_M: n[j], el: Me[j] / (9549.3 * D.P_nom / D.n_P), ce_min: Math.min(...ce) };
  }
  function interp(x, xs, ys) {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[xs.length - 1]) return ys[ys.length - 1];
    let lo = 0, hi = xs.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (xs[m] <= x) lo = m; else hi = m; }
    return ys[lo] + (ys[hi] - ys[lo]) * (x - xs[lo]) / (xs[hi] - xs[lo]);
  }

  // ---------------------------------------------------------------- dinamica, echilibrarea, volantul
  function cinematicaDinamica(r, pa, m_p, m_b, o) {
    o = Object.assign({ k_gp: 1.25, k_bp: 0.28, p_carter: 0.1, n: null }, o || {});
    const D = r.date, R = r.R_man / 1000, lam = D.lam, om = Math.PI * (o.n || D.n_P) / 30, Ap = Math.PI * (r.D_cil / 1000) ** 2 / 4;
    const m_gp = o.k_gp * m_p, m_bp = o.k_bp * m_b, m_bm = (1 - o.k_bp) * m_b, m_j = m_gp + m_bp;
    const al = pa.map(q => q[0]), x = [], v = [], acc = [], Fg = [], Fj = [], F = [], N = [], S = [], T = [], Z = [], M = [];
    pa.forEach(q => {
      const ar = rad(q[0]);
      const ac = R * om * om * (Math.cos(ar) + lam * Math.cos(2 * ar));
      x.push(R * ((1 - Math.cos(ar)) + lam / 4 * (1 - Math.cos(2 * ar))));
      v.push(R * om * (Math.sin(ar) + lam / 2 * Math.sin(2 * ar))); acc.push(ac);
      const fg = (q[2] - o.p_carter) * 1e6 * Ap, fj = -m_j * ac, f = fg + fj, be = Math.asin(lam * Math.sin(ar));
      Fg.push(fg); Fj.push(fj); F.push(f); N.push(f * Math.tan(be)); S.push(f / Math.cos(be));
      const t = f * Math.sin(ar + be) / Math.cos(be); T.push(t); Z.push(f * Math.cos(ar + be) / Math.cos(be)); M.push(t * R);
    });
    const M_med = M.slice(0, -1).reduce((s, y) => s + y, 0) / (M.length - 1);
    return { alfa: al, x, v, a: acc, Fg, Fj, F, N, S, T, Z, M, M_med, m_j, m_gp, m_bp, m_bm, om, Ap, R, F_cb: -m_bm * R * om * om,
      v_max: Math.max(...v.map(Math.abs)), a_max: Math.max(...acc), N_max: Math.max(...N.map(Math.abs)) };
  }
  function echilibrare(kd, lam, k, arbore) {
    const C = kd.m_j * kd.R * kd.om * kd.om, Fx = [], Fy = [];
    for (let d = 0; d <= 360; d++) {
      const a = rad(d), F1 = C * Math.cos(a), F2 = C * lam * Math.cos(2 * a);
      if (arbore) { Fy.push(F2); Fx.push(0); } else { Fy.push((1 - k) * F1 + F2); Fx.push(-k * C * Math.sin(a)); }
    }
    const Fr = Fx.map((x, i) => Math.hypot(x, Fy[i]));
    return { C, F1: C, F2: C * lam, Fx, Fy, Fr_max: Math.max(...Fr), Fy_max: Math.max(...Fy.map(Math.abs)), Fx_max: Math.max(...Fx.map(Math.abs)) };
  }
  function volant(kd, delta) {
    const al = kd.alfa, dM = kd.M.map(m => m - kd.M_med), E = [0];
    for (let i = 1; i < al.length; i++) E.push(E[i - 1] + 0.5 * (dM[i] + dM[i - 1]) * rad(al[i] - al[i - 1]));
    const dE = Math.max(...E) - Math.min(...E);
    return { dE, J: dE / (delta * kd.om * kd.om), E };
  }

  // ---------------------------------------------------------------- răcirea
  function bilantEnergetic(r, T_g, q_rest) {
    q_rest = q_rest === undefined ? 0.05 : q_rest;
    const D = r.date, q_e = r.eta_e_liv, I_g = iMix(T_g, r.g), I_0 = r.M_1 * (0.21 * tab(D.T_s, 7) + 0.79 * tab(D.T_s, 8));
    const frac = D.tau === 2 ? 1 - (D.k_f || 0) * (1 - r.TE) : 1;
    let q_ev = (I_g - I_0) / D.Q_i * frac;
    const q_nears = 1 - frac;
    if (D.tau === 2) {
      const aer = r.M_1 * (1 / r.TE - 1) * frac;
      q_ev += aer * (0.21 * (tab(T_g, 7) - tab(D.T_s, 7)) + 0.79 * (tab(T_g, 8) - tab(D.T_s, 8))) / D.Q_i * 0.5;
    }
    const q_r = 1 - q_e - q_ev - q_nears - q_rest, P_comb = D.P_nom / q_e;
    return { q_e, q_ev, q_nears, q_rest, q_r, P_comb, Q_r: q_r * P_comb };
  }
  function aripioare(Q_kW, v_aer, o) {
    o = Object.assign({ L_f: 0.040, t_f: 0.0025, k_al: 150.0, L_c: 0.05, T_b: 523.0, T_aer: 308.0 }, o || {});
    const nu = 1.7e-5, kair = 0.028, Pr = 0.71, Re = v_aer * o.L_c / nu, Nu = 0.664 * Re ** 0.5 * Pr ** (1 / 3), h = Nu * kair / o.L_c;
    const m = Math.sqrt(2 * h / (o.k_al * o.t_f)), eta_f = Math.tanh(m * o.L_f) / (m * o.L_f);
    return { h, Re, eta_f, A: Q_kW * 1e3 / (eta_f * h * (o.T_b - o.T_aer)), mL: m * o.L_f };
  }

  // ---------------------------------------------------------------- vehiculul
  const rRoata = (B, H, d, k) => (k || 0.97) * (d * 25.4 / 2 + B * H / 100) / 1000;
  const rapoarte = T => T.i_cv.map(i => T.i_p * i * T.i_f);
  const Prez = (veh, v) => (veh.m * G * veh.f + 0.5 * RHO_AIR * veh.CdA * v * v) * v;
  function tractiune(car, veh, T) {
    return rapoarte(T).map(i => ({ v: car.n.map(n => n * Math.PI / 30 * veh.rw / i), F: car.Me.map(M => M * i * T.eta / veh.rw) }));
  }
  function vMaxima(car, veh, T) {
    let best = 0;
    rapoarte(T).forEach(i => car.n.forEach((n, k) => { const v = n * Math.PI / 30 * veh.rw / i; if (car.Pe[k] * 1e3 * T.eta >= Prez(veh, v)) best = Math.max(best, v); }));
    return best * 3.6;
  }
  function FmaxV(car, veh, T, v, cvt) {
    let best = 0;
    const nl = car.n[car.n.length - 1];
    if (cvt) {
      const imax = rapoarte(T)[0];
      for (let k = 0; k < car.n.length; k++) {
        const n = car.n[k], ireq = n * Math.PI / 30 * veh.rw / Math.max(v, 0.1), i = Math.min(ireq, imax);
        if (ireq > imax && n !== nl) {
          let nn = v / veh.rw * imax * 30 / Math.PI; if (nn < car.n[0]) nn = car.n[0];
          best = Math.max(best, interp(nn, car.n, car.Me) * imax * T.eta / veh.rw); continue;
        }
        best = Math.max(best, car.Me[k] * i * T.eta / veh.rw);
      }
      return best;
    }
    rapoarte(T).forEach(i => {
      let n = v / veh.rw * i * 30 / Math.PI; if (n > nl) return; n = Math.max(n, car.n[0]);
      best = Math.max(best, interp(n, car.n, car.Me) * i * T.eta / veh.rw);
    });
    return best;
  }
  function accelerare(car, veh, T, vfin, o) {
    o = Object.assign({ cvt: false, t_sch: 0, dt: 0.01, mu: 1.0, phi_r: 0.65 }, o || {});
    let v = 0.5, t = 0, x = 0;
    const me = veh.m * veh.delta, Fad = o.mu * o.phi_r * veh.m * G;
    while (v < vfin / 3.6 && t < 60) {
      const F = Math.min(FmaxV(car, veh, T, v, o.cvt), Fad);
      const a = (F - veh.m * G * veh.f - 0.5 * RHO_AIR * veh.CdA * v * v) / me;
      v += a * o.dt; x += v * o.dt; t += o.dt;
    }
    let nsch = 0;
    if (!o.cvt && o.t_sch > 0) {
      rapoarte(T).slice(0, -1).forEach(i => { if (car.n[car.n.length - 1] * Math.PI / 30 * veh.rw / i < vfin / 3.6) nsch++; });
      t += nsch * o.t_sch;
    }
    return { t, x, nsch };
  }
  function consumCiclu(r, car, veh, T, v, n_idle, n_min, o) {
    o = Object.assign({ p_pomp: 0.08, k_eta: 0.85, rho_f: 0.745 }, o || {});
    const D = r.date, eta_i = o.k_eta * r.eta_i, Vt = r.V_h_r * D.i_cil / 1000, kcyc = D.tau === 4 ? 2 : 1;
    const pmf_n = r.p_i - r.p_e, cm_n = r.S_cil / 1000 * D.n_P / 30, A_f = 0.4 * pmf_n, B_f = (pmf_n - A_f) / cm_n ** 2;
    const rs = rapoarte(T), nl = car.n[car.n.length - 1];
    let fuel = 0, dist = 0; const nsel = [];
    for (let k = 0; k < v.length - 1; k++) {
      const vm = 0.5 * (v[k] + v[k + 1]), a = v[k + 1] - v[k];
      const F = veh.m * veh.delta * a + veh.m * G * veh.f + 0.5 * RHO_AIR * veh.CdA * vm * vm, Pw = F * vm;
      dist += vm;
      let n, Pe;
      if (vm < 0.3) { n = n_idle; Pe = 0; }
      else {
        n = null;
        for (let j = rs.length - 1; j >= 0; j--) {
          const nn = vm / veh.rw * rs[j] * 30 / Math.PI;
          if (nn < n_min || nn > nl) continue;
          const Mav = interp(nn, car.n, car.Me);
          if (Pw <= 0 || Pw / T.eta <= 0.9 * Mav * nn * Math.PI / 30) { n = nn; break; }
        }
        if (n === null) n = Math.max(vm / veh.rw * rs[0] * 30 / Math.PI, n_idle);
        Pe = Pw > 0 ? Pw / T.eta : 0;
      }
      nsel.push(n);
      const cm = r.S_cil / 1000 * n / 30, pmf = A_f + B_f * cm * cm, Pfr = pmf * 1e6 * Vt * n / (60 * kcyc);
      const pme = Pe > 0 ? Pe / (Vt * n / (60 * kcyc)) / 1e6 : 0;
      const pmemax = n >= car.n[0] ? interp(n, car.n, car.Me) * 4 * Math.PI * (kcyc / 2) / Vt / 1e6 : 0.3;
      const sarc = Math.min(pme / Math.max(pmemax, 1e-6), 1), Pp = o.p_pomp * (1 - sarc) * 1e6 * Vt * n / (60 * kcyc);
      const Pf = (Pw < 0 && vm > 3) ? 0 : (Pe + Pfr + Pp) / eta_i;
      fuel += Pf / (D.Q_i * 1e3);
    }
    const dkm = dist / 1000;
    return { fuel_kg: fuel, d_km: dkm, g_km: fuel * 1000 / dkm, L100: fuel / o.rho_f / dkm * 100, CO2: fuel * 1000 / dkm * D.c_f * 44 / 12, n: nsel };
  }

  const API = { G, RHO_AIR, tab, iMix, xPiston, baleiajBB, calculTermic, diagrama, evacuareLibera, pCarter, tobaAcordata, coefLeiderman,
    caracteristica, interp, cinematicaDinamica, echilibrare, volant, bilantEnergetic, aripioare, rRoata, rapoarte, Prez, tractiune,
    vMaxima, FmaxV, accelerare, consumCiclu };
  if (typeof module !== "undefined") module.exports = API; else root.MOTO = API;
})(this);
