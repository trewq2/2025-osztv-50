# OSZTV 2025 – 50 kérdéses interaktív tudáspróba

**Forrás:** a felhasználó által feltöltött `OSZTV - 2025 - M.pdf` (megoldással ellátott területi előválogató).

## Feladatsor

| Témakör (a 2025-ös PDF eredeti elnevezése) | Kérdés | Pont |
|---|---:|---:|
| Alapismeretek | 12 | 24 |
| Hálózatok | 18 | 36 |
| Hálózati operációs rendszerek | 12 | 24 |
| Felhőszolgáltatások | 8 | 16 |
| **Összesen** | **50** | **100** |

Az eredeti 2025-ös OSZTV-feladatlap 300 pontos és 180 perces. Az oldal az arányos, **100 pontos, 60 perces** rövidített gyakorlóteszt. Minden kiválasztott kérdés 2 pontos, és az eredeti PDF-ben félkövérrel jelölt, egyetlen helyes választ használja. A forrásban található többhelyes vagy képet igénylő, bizonytalan megoldású feladatok ebből a válogatásból kimaradtak.

## Funkciók

- Keverve érkeznek a kérdések, és a válaszlehetőségek is újra keverednek minden próbálkozáskor.
- A véglegesített válaszok nem módosíthatók, nincs visszalépés.
- Az első körben egy kérdés átugorható, és csak az összes többi kérdés után jön vissza. Másodszor már nem ugorható át.
- 60 perces időkorlát, újratöltéskor sem nullázódik az idő.
- A harmadik észlelt oldalelhagyási/fókuszvesztési eseménynél a teszt automatikusan lezárul. Ez az észlelés téves is lehet, nem bizonyít csalást.
- **Teszt végleges befejezése** gomb minden kérdés alatt; megerősítés után azonnali lezárás és a hiányzó válaszokra 0 pont.
- Eredmény: pontszám, százalék, négy témakör bontása, hibák és helyes válaszok 5 percig.
- **Eredménylap mentése PDF-ként:** a böngésző nyomtatási párbeszédablakában a Mentés PDF-ként opciót kell választani. A PDF-ben név, osztály, pontszám, témakörök, kezdés/befejezés, lezárás oka és oldalelhagyási jelzések szerepelnek. A PDF nem tartalmaz megoldókulcsot.
- Újrapróbálkozás és nullázás.
- Kezdőképernyőn a központi körábrában és az alatta található kártyákon is **mind a 4 témakör megjelenik**.

## GitHub Pages telepítés

**Egyfájlos változat:** töltsd fel a mellékelt `index.html`-t a repository **gyökerébe**. (A külön letölthető HTML fájlt feltöltés előtt szükség esetén nevezd át `index.html`-re.)

**Többfájlos változat:** töltsd fel a csomagban levő `index.html`, `style.css`, `app.js`, `questions.js` fájlokat egymás mellé a repository gyökerébe. **Ne csak magát a ZIP-et töltsd fel.**

GitHub: `Settings → Pages → Deploy from a branch → main → /(root) → Save`.

Ha az új verzió nem látszik, használj `Ctrl+F5` frissítést. A 2025-ös és a 2026-os teszt külön tárolási kulcsot használ, így a böngészőben tárolt próbálkozások nem keverednek.

## PDF eredmény elküldése

A tanuló befejezés után a **Mentés PDF-ként** lehetőséggel készíti el az eredménylapot; azt külön csatolja e-mailben vagy Google Classroom feladatként. **Automatikus továbbítás nincs.**

## Csalásvédelmi korlátok

A GitHub Pages statikus webtárhely, ezért a kérdésbank és a helyes válaszok kliensoldalon láthatók, a böngészős események megkerülhetők. A weboldal nem tudja megakadályozni más programok megnyitását, és a PDF nem hitelesített vizsgajegyzőkönyv. Nagy tétű vizsgához intézményileg kezelt, zárolt vizsgaböngészőt, szerveroldali kérdéskiosztást és hitelesített eredménytárolást használj.

## Tanári ellenőrzés

A `kerdesjegyzek.json` a kiválasztott kérdések 2025-ös eredeti sorszámát, PDF-oldalát és megoldását mutatja. **Ezt külön tartsd meg, ne töltsd fel a GitHub Pages weboldalra.**
