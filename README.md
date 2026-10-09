# Calculul motoarelor de motocicletă (MAS 2T și 4T)

Aplicația îndrumarului „Proiectarea sistemelor de propulsie cu MAS în doi și patru timpi ale vehiculelor cu două roți” (C. Tudor, A.-M. Beldugan, Universitatea „Ovidius” din Constanța, 2026). Rulează integral în browser, fără server și fără instalare.

- **Calcul termic (cap. 3–4):** umplerea, comprimarea, arderea, destinderea, parametrii indicați și efectivi, dimensiunile (metoda din îndrumarul PCMAI, ed. a II-a); la 2T cursa utilă, raportul de comprimare efectiv și geometric, consumul cu combustibilul scurtcircuitat.
- **Schimbul de gaze (cap. 2):** distribuția prin ferestre, baleiajul (modelul Benson–Brandham), presiunea din carter, destinderea liberă integrată numeric, aria–timp, camera de expansiune.
- **Diagrama indicată și caracteristica exterioară (cap. 5)**, cu coeficienții Leiderman din turația cuplului maxim.
- **Dinamica, volantul și echilibrarea monocilindrului (cap. 6–7).**
- **Răcirea (cap. 8):** bilanțul energetic și aria de aripioare la răcirea cu aer.
- **Transmisia și performanțele (cap. 9):** rapoartele, diagrama de tracțiune, viteza maximă, 0–100 km/h cu cutie și cu CVT ideal, consumul și CO₂ pe ciclul WMTC (4T).

Exemplele 1 (2T 300 cm³, după KTM 300 EXC) și 2 (4T 690 cm³, după KTM 690 Enduro R) dau exact valorile din îndrumar.

## Publicare pe GitHub Pages

1. Creați depozitul public `calcul-moto` în contul `beldugan` și încărcați în rădăcina lui fișierele `index.html`, `style.css`, `app.js`, `moto.js`, `presets.js`, `tabele.js`, `wmtc.js` (și, opțional, acest README).
2. Settings → Pages → Source: *Deploy from a branch*, ramura `main`, dosarul `/ (root)`.
3. Aplicația devine disponibilă la `https://beldugan.github.io/calcul-moto/` (adresa din codul QR al îndrumarului).
