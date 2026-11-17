/* OSZTV 2025 – önálló, GitHub Pages-re telepíthető kliensoldali felmérő. */
(() => {
  'use strict';
  const DATA = window.OSZTV_EXAM;
  if (!DATA?.sections) {
    document.getElementById('app').textContent = 'Hiba: a kérdésállomány nem töltődött be.';
    return;
  }
  const questions = DATA.sections.flatMap(s => s.questions);
  const lookup = new Map(questions.map(q => [q.id, q]));
  const STORAGE = 'osztv_2025_50_felmero_v3';
  const TOTAL = questions.length;
  const LIMIT = (DATA.allowedDepartures || 2) + 1;
  const $ = id => document.getElementById(id);
  let state = null;
  let lastGuardAt = 0;
  let guardGraceUntil = Date.now() + 1200;
  let pendingWarning = false;
  let toastTimeout = null;
  const sectionName = id => DATA.sections.find(s => s.id === id)?.title || '';

  function escapeHTML(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function randomIndex(limit) {
    if (window.crypto?.getRandomValues) {
      const v = new Uint32Array(1);
      const bucket = Math.floor(0x100000000 / limit) * limit;
      do { crypto.getRandomValues(v); } while (v[0] >= bucket);
      return v[0] % limit;
    }
    return Math.floor(Math.random() * limit);
  }
  function shuffle(list) {
    const a = [...list];
    for (let i = a.length - 1; i > 0; i--) {
      const j = randomIndex(i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function formatClock(ms) {
    const t = Math.max(0, Math.ceil(ms / 1000));
    return `${String(Math.floor(t / 60)).padStart(2,'0')}:${String(t % 60).padStart(2,'0')}`;
  }
  function dateTime(t) {
    return new Date(t).toLocaleString('hu-HU', {year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'});
  }
  function save() {
    if (!state) return;
    try { localStorage.setItem(STORAGE, JSON.stringify(state)); }
    catch (e) { console.warn('A böngésző nem engedte a helyi állapot mentését.', e); }
  }
  function load() {
    try {
      const x = JSON.parse(localStorage.getItem(STORAGE));
      if (!x || !['exam','finished'].includes(x.stage) || !Array.isArray(x.queue) ||
          x.queue.length < TOTAL || !x.answers || !x.optionOrders || x.version !== 3 ||
          !x.queue.every(id => lookup.has(id))) return null;
      return x;
    } catch { return null; }
  }
  function notice(message) {
    const el = $('toast');
    if (!el) return;
    clearTimeout(toastTimeout);
    el.textContent = message;
    el.classList.add('show');
    toastTimeout = setTimeout(() => el.classList.remove('show'), 3600);
  }
  function header(status='ONLINE FELMÉRŐ') {
    return `<header class="topbar"><div class="brand"><div class="brand-logo">50</div><div><div class="brand-name">OSZTV <span style="color:var(--cyan)">2025</span></div><div class="brand-tagline">Informatikai tudáspróba</div></div></div><div class="top-pill"><span class="dot"></span>${escapeHTML(status)}</div></header>`;
  }
  function footer() {
    return `<footer class="footer"><span><strong>OSZTV 2025 • Gyakorló felmérő</strong><br>A kérdések a 2025-ös megoldásos versenyfeladatsorból származnak.</span><span>Az eredmény a tanuló eszközén keletkezik. A PDF-et külön kell elküldeni a tanárnak.</span></footer>`;
  }
  function homepage() {
    document.body.classList.remove('exam-mode');
    $('app').innerHTML = `${header('2025 • KOMPETENCIAMÉRÉS')}
      <main>
      <section class="hero"><div><div class="eyebrow">● Országos szakmai tanulmányi verseny</div>
        <h1>Mutasd meg,<br><em>mit tudsz.</em></h1>
        <p class="hero-desc">50 válogatott kérdés a 2025-ös OSZTV feladatsorából. Négy szakmai terület, véletlenszerű kérdés- és válaszsorrend, azonnali kiértékelés.</p>
        <p class="hero-caption">INFORMATIKAI RENDSZER- ÉS ALKALMAZÁS-ÜZEMELTETŐ TECHNIKUS</p></div>
        <div class="radar" aria-hidden="true"><div class="orbit orbit-1"></div><div class="orbit orbit-2"></div><div class="orbit orbit-3"></div><div class="orbit-cross"></div><div class="orbit-cross vertical"></div><div class="radar-core">50Q</div><span class="radar-label top">ALAPISMERETEK</span><span class="radar-label right">HÁLÓZATOK</span><span class="radar-label bottom">HÁLÓZATI OS</span><span class="radar-label left">FELHŐ</span></div></section>
      <section class="stats-grid" aria-label="A felmérő jellemzői">
        ${[['50','kérdés'],['60','perc'],['100','elérhető pont'],['4','témakör']].map(([num,label])=>`<div class="stat"><div class="stat-number">${num}</div><div class="stat-label">${label}</div></div>`).join('')}
      </section>
      <div class="section-head"><h2>A felmérő témakörei</h2><span>Valódi 2025-ös versenykérdések</span></div>
      <section class="topic-grid">${DATA.sections.map((s,i)=>`<article class="topic"><div class="topic-icon">${['⌘','⬡','▤','☁'][i]}</div><h3>${escapeHTML(s.title)}</h3><p><strong>${s.questions.length}</strong> kérdés · ${s.questions.length*2} pont</p></article>`).join('')}</section>
      <section class="setup-grid" id="inditas"><div class="panel"><h2>Készen állsz?</h2><p class="panel-p">Add meg az adataidat. Az eredménylapon pontosan ezek szerepelnek majd.</p>
        <form id="startForm" autocomplete="off"><div class="form-row"><label for="studentName">Teljes név *</label><input id="studentName" maxlength="80" minlength="3" required placeholder="Vezetéknév Keresztnév" autocapitalize="words"></div>
        <div class="form-row"><label for="studentClass">Osztály / csoport *</label><input id="studentClass" maxlength="40" minlength="1" required placeholder="Pl. 13.A"></div>
        <label class="check-row"><input id="honorRules" type="checkbox" required><span>Elolvastam a szabályokat. Tudomásul veszem, hogy az oldal elhagyása naplózható, és a harmadik észlelt eset a teszt automatikus lezárását okozza.</span></label>
        <button class="btn btn-wide" type="submit">Dolgozat indítása <span aria-hidden="true">↗</span></button>
        <p class="minor">A teljes képernyős megjelenítést a böngésző engedélyétől függően kérjük. Az időmérő nem áll le frissítéskor sem.</p></form></div>
        <div class="panel"><h3>A dolgozat szabályai</h3><p class="panel-p">A sorrendet minden indításkor újrakeverjük.</p><div class="rule-list">
        ${[
          ['↳','Nincs visszalépés','A véglegesített választ utólag nem lehet módosítani.'],
          ['↷','Egyszer átugorható','A kihagyott kérdések csak az első kör végén térnek vissza.'],
          ['⏱','60 perc áll rendelkezésre','Az idő lejártakor az oldal a meglévő válaszokat automatikusan kiértékeli.'],
          ['■','Idő előtti végleges beadás','Bármikor beadható a dolgozat; a hiányzó válaszok 0 pontot érnek. Külön megerősítés szükséges.'],
          ['⤢','Figyelt oldalelhagyás','Másik lapra vagy alkalmazásra váltást jelezhet a böngésző. A 3. észlelés lezárja a tesztet.'],
          ['✓','Eredmény és PDF','Pontszám azonnal, hibák 5 percig; a PDF-et a tanuló külön továbbítja.']
        ].map(([ico,t,p])=>`<div class="rule"><div class="rule-icon">${ico}</div><div><strong>${t}</strong><p>${p}</p></div></div>`).join('')}
        </div><div class="warning-inline"><strong>Fontos:</strong> egy böngésző nem képes más programok megnyitását megakadályozni. A figyelés és a teljes képernyő nem helyettesít felügyelt vizsgakörnyezetet.</div></div></section>
      </main>${footer()}`;
    $('startForm').addEventListener('submit', e => {
      e.preventDefault();
      const name = $('studentName').value.trim().replace(/\s+/g,' ');
      const group = $('studentClass').value.trim();
      if (name.length < 3 || !group || !$('honorRules').checked) { notice('Kérjük, töltsd ki az adatokat és fogadd el a szabályokat.'); return; }
      launch(name, group, 1);
    });
  }
  async function launch(name, group, attempt) {
    const queue = shuffle(questions.map(q => q.id));
    const optionOrders = {};
    questions.forEach(q => optionOrders[q.id] = shuffle(q.options.map(o => o.id)));
    const startedAt = Date.now();
    state = {version:3,stage:'exam',name,group,attempt,startedAt,
      deadline:startedAt+DATA.durationMinutes*60000,
      queue,optionOrders,cursor:0,answers:{},skipped:[],
      departures:0,events:[],sessionId:Math.random().toString(36).slice(2,8).toUpperCase()+Date.now().toString(36).toUpperCase(),
      fullscreenAvailable: !!document.documentElement.requestFullscreen};
    save();
    guardGraceUntil = Date.now() + 4000;
    if (document.documentElement.requestFullscreen) {
      try { await document.documentElement.requestFullscreen({navigationUI:'hide'}); }
      catch { notice('A teljes képernyő nem indult el. A dolgozat így is figyeli az oldalváltást.'); }
    } else { notice('Ez a böngésző nem támogatja a kötelező teljes képernyős nézetet.'); }
    history.pushState({osztvExam:true},'',location.pathname+location.search+location.hash);
    examPage();
  }
  function currentQuestion() { return state ? lookup.get(state.queue[state.cursor]) : null; }
  function answeredCount() { return Object.keys(state.answers).length; }
  function examPage() {
    if (!state || state.stage !== 'exam') return;
    if (Date.now() >= state.deadline) { finalize('Lejárt az idő'); return; }
    if (state.cursor >= state.queue.length) { finalize('A dolgozat befejezve'); return; }
    document.body.classList.add('exam-mode');
    const q = currentQuestion();
    const options = state.optionOrders[q.id].map(id => q.options.find(o => o.id === id)).filter(Boolean);
    const reviewPass = state.cursor >= TOTAL;
    const currentSelected = null;
    const count = answeredCount();
    $('app').innerHTML = `<header class="exam-header">
      <div class="brand"><div class="brand-logo">50</div><div><div class="brand-name">OSZTV 2025</div><div class="brand-tagline">ÉLES TUDÁSPRÓBA</div></div></div>
      <div class="exam-user"><strong>${escapeHTML(state.name)}</strong>${escapeHTML(state.group)} · ${escapeHTML(state.sessionId.slice(0,6))}</div>
      <div class="exam-clock"><div class="clock-label">Hátralévő idő</div><div class="clock-time" id="clock">${formatClock(state.deadline-Date.now())}</div></div>
    </header><main class="exam-layout">
      ${state.departures > 0 ? `<div class="warning-band">⚠ Oldalelhagyási jelzések: <strong>${state.departures} / ${LIMIT}</strong> — a ${LIMIT}. észlelt eseménynél a dolgozat lezárul.</div>` : ''}
      ${reviewPass ? `<div class="stage-box">↷ <strong>Második kör:</strong> a korábban átugrott kérdéseket látod. Most már nincs további átugrási lehetőség.</div>` : ''}
      <div class="exam-meta"><div class="exam-meta-left">${reviewPass ? 'Második kör – kihagyottak' : 'Első kör – feladatsor'} · ${escapeHTML(sectionName(q.section))}</div><div class="exam-meta-right"><strong>${count} / ${TOTAL}</strong> megválaszolva</div></div>
      <div class="progress-track" role="progressbar" aria-label="Megválaszolt kérdések aránya" aria-valuenow="${count}" aria-valuemin="0" aria-valuemax="${TOTAL}"><div class="progress-fill" style="width:${(count/TOTAL)*100}%"></div></div>
      <section class="question-card" aria-label="Aktuális kérdés"><div class="question-top"><span class="small-tag">${reviewPass ? 'Visszahozott kérdés' : `${state.cursor+1}. megjelenített feladat`}</span><span class="small-tag alt">${q.points} PONT</span></div>
      <h1>${escapeHTML(q.text)}</h1><div class="answer-grid" role="group" aria-label="Válaszlehetőségek">
      ${options.map((o,i)=>`<button type="button" class="option" data-opt="${escapeHTML(o.id)}" aria-pressed="false"><span class="option-letter">${'ABCDEFGH'[i]}</span><span>${escapeHTML(o.text)}</span></button>`).join('')}
      </div><div class="question-bottom"><div class="question-help">A véglegesített válaszra nem léphetsz vissza.${!reviewPass ? ' A kérdést egyszer átugorhatod.' : ''}</div><div class="actions">
      ${reviewPass ? '' : '<button class="btn btn-quiet" id="skipBtn" type="button">↷ Átlépés</button>'}
      <button class="btn" id="confirmBtn" type="button" disabled>Válasz véglegesítése →</button></div></div></section>
      <div class="exam-footnote"><span>Visszalépés és válaszmódosítás nélkül.</span><span>Átugrott kérdések: <strong>${state.skipped.filter(id=>!(id in state.answers)).length}</strong> · Oldalelhagyás: <strong>${state.departures}</strong></span></div>
      <div class="early-submit-panel"><div><strong>Nem szeretnéd tovább folytatni?</strong><p>A tesztet bármikor véglegesen beadhatod. A meg nem válaszolt kérdésekre 0 pont jár.</p></div><button class="btn btn-danger" id="finishEarlyBtn" type="button">■ Teszt végleges befejezése</button></div>
    </main>`;
    let selection = currentSelected;
    document.querySelectorAll('[data-opt]').forEach(b => b.addEventListener('click', () => {
      selection = b.dataset.opt;
      document.querySelectorAll('[data-opt]').forEach(item => {
        const chosen = item.dataset.opt === selection;
        item.classList.toggle('selected', chosen);
        item.setAttribute('aria-pressed', String(chosen));
      });
      $('confirmBtn').disabled = false;
    }));
    $('confirmBtn').addEventListener('click',() => {
      if (!selection) return;
      const active = currentQuestion();
      if (!active || (active.id in state.answers)) return;
      state.answers[active.id] = selection;
      state.cursor++;
      save();
      examPage();
      window.scrollTo({top:0,behavior:'instant'});
    });
    $('finishEarlyBtn')?.addEventListener('click', confirmEarlyFinish);
    $('skipBtn')?.addEventListener('click', () => {
      if (state.cursor >= TOTAL) return;
      const active = currentQuestion();
      if (!active || state.skipped.includes(active.id)) return;
      state.skipped.push(active.id);
      state.queue.push(active.id);
      state.cursor++;
      save();
      examPage();
      window.scrollTo({top:0,behavior:'instant'});
      notice('A kérdés az első kör végén újra megjelenik.');
    });
  }
  function confirmEarlyFinish() {
    if (!state || state.stage !== 'exam' || $('finishDialog')) return;
    const unanswered = TOTAL - answeredCount();
    const dialog = document.createElement('div');
    dialog.className = 'dialog-shade';
    dialog.id = 'finishDialog';
    dialog.innerHTML = `<div class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="finishTitle">
      <div class="dialog-symbol" aria-hidden="true">■</div>
      <h2 id="finishTitle">Biztosan véglegesen beadod?</h2>
      <p>Megválaszolt kérdések: <strong>${answeredCount()} / ${TOTAL}</strong>.</p>
      <p>Ha most befejezed, <strong>${unanswered} megválaszolatlan kérdésre 0 pontot kapsz</strong>. Az eredményt azonnal megkapod, de a dolgozathoz többé nem térhetsz vissza.</p>
      <div class="dialog-actions"><button type="button" id="finishCancel" class="btn btn-secondary">Még folytatom</button>
      <button type="button" id="finishAccept" class="btn btn-danger">Igen, véglegesen beadom</button></div></div>`;
    document.body.appendChild(dialog);
    $('finishCancel').addEventListener('click', () => dialog.remove());
    $('finishAccept').addEventListener('click', () => finalize('Tanuló által idő előtt véglegesen beadva'));
    $('finishCancel').focus();
  }
  function checkTime() {
    if (!state) return;
    if (state.stage === 'exam') {
      if (Date.now() >= state.deadline) { finalize('Lejárt az idő'); return; }
      const clock = $('clock');
      if (clock) {
        clock.textContent = formatClock(state.deadline-Date.now());
        clock.classList.toggle('urgent', state.deadline-Date.now()<300000);
      }
    } else if (state.stage === 'finished') {
      const remaining=state.reviewUntil-Date.now();
      const clock=$('reviewClock');
      if (clock && remaining > 0) clock.textContent=formatClock(remaining);
      if (remaining <= 0 && $('wrongList')) resultsPage();
    }
  }
  function guard(reason) {
    if (!state || state.stage !== 'exam') return;
    const now=Date.now();
    if (now < guardGraceUntil || now-lastGuardAt < 1800) return;
    lastGuardAt=now;
    state.departures++;
    state.events.push({time:now,event:reason});
    save();
    if (state.departures >= LIMIT) {
      finalize('Automatikus lezárás – túl sok oldalelhagyás');
      return;
    }
    pendingWarning=true;
    if (document.visibilityState==='visible' && document.hasFocus()) showPendingWarning();
  }
  function showPendingWarning() {
    if (!pendingWarning || !state || state.stage !== 'exam') return;
    pendingWarning=false;
    examPage();
    const shade=document.createElement('div');
    shade.className='dialog-shade';shade.id='guardDialog';
    shade.innerHTML=`<div class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="guardTitle"><div class="dialog-symbol">⚠</div>
      <h2 id="guardTitle">Oldalelhagyás észlelve</h2><p>A böngésző fókuszának elvesztését vagy a teljes képernyő elhagyását rögzítettük. <strong>${state.departures}/${LIMIT}</strong> jelzés. A ${LIMIT}. jelzés automatikusan lezárja a dolgozatot.</p>
      <p>Ha ez tévedésből történt, folytathatod a felmérőt, az időmérés azonban közben sem állt le.</p>
      <div class="dialog-actions"><button type="button" id="guardResume" class="btn btn-wide">Megértettem, folytatom</button></div></div>`;
    document.body.appendChild(shade);
    $('guardResume').addEventListener('click',async()=>{
      shade.remove();
      guardGraceUntil=Date.now()+3500;
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        try{await document.documentElement.requestFullscreen({navigationUI:'hide'});}catch{}
      }
    });
  }
  function finalize(reason) {
    if (!state || state.stage !== 'exam') return;
    state.stage='finished';
    state.finishedAt=Date.now();
    state.reviewUntil=state.finishedAt+DATA.reviewMinutes*60*1000;
    state.finishReason=reason;
    save();
    pendingWarning=false;
    document.getElementById('guardDialog')?.remove();
    document.getElementById('finishDialog')?.remove();
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(()=>{});
    resultsPage();
  }
  function details() {
    const rows = DATA.sections.map(section => {
      const qs=section.questions;
      const got=qs.filter(q=>state.answers[q.id]===q.correctOptionId).length;
      const answered=qs.filter(q=>q.id in state.answers).length;
      return {section:section.title,got,max:qs.length,points:got*2,maxPoints:qs.length*2,answered};
    });
    const score=rows.reduce((a,r)=>a+r.points,0);
    const good=score/2;
    const answered=answeredCount();
    const wrong=answered-good;
    return {rows,score,percent:Math.round(score/DATA.maxPoints*100),good,wrong,unanswered:TOTAL-answered,answered};
  }
  function resultsPage() {
    if (!state || state.stage!=='finished') return;
    document.body.classList.remove('exam-mode');
    const d=details();
    const remains=state.reviewUntil-Date.now();
    const reviewOpen=remains>0;
    const wrongQuestions = questions.filter(q => state.answers[q.id]!==q.correctOptionId);
    $('app').innerHTML=`${header('DOLGOZAT LEZÁRVA')}<main class="results-wrap">
      <div class="results-title">Kiértékelés kész</div>
      <div class="results-head"><div><h1>Megérkezett az<br>eredményed.</h1><p style="color:var(--muted);margin:16px 0 0">${escapeHTML(state.name)} · ${escapeHTML(state.group)} · ${dateTime(state.finishedAt)}</p><p style="font-size:12px;color:#9db2c9">Lezárás oka: ${escapeHTML(state.finishReason)}</p></div><div class="score-ring" style="--score:${d.percent}"><div class="score-ring-inner"><strong>${d.percent}%</strong><span>${d.score} / ${DATA.maxPoints} pont</span></div></div></div>
      <section class="results-cards"><div class="results-card"><strong>${d.good}</strong><span>Helyes válasz</span></div><div class="results-card"><strong>${d.wrong}</strong><span>Hibás válasz</span></div><div class="results-card"><strong>${d.unanswered}</strong><span>Megválaszolatlan</span></div><div class="results-card"><strong>${state.departures}</strong><span>Oldalelhagyási jelzés</span></div></section>
      <section class="result-panel"><h2>Eredmények témakörönként</h2><div class="breakdown">${d.rows.map(r=>`<div class="breakdown-row"><div class="breakdown-name">${escapeHTML(r.section)}</div><div class="mini-track"><div class="mini-fill" style="width:${100*r.got/r.max}%"></div></div><div class="breakdown-value">${r.points}/${r.maxPoints} p.</div></div>`).join('')}</div></section>
      <section class="result-panel"><h2>Hibák és helyes válaszok</h2>
        ${reviewOpen ? `<div class="review-box"><div><strong>✓ A hibajegyzék még megtekinthető</strong><p>A helyes megoldások a befejezéstől számítva 5 percig láthatók.</p></div><div id="reviewClock" class="review-clock">${formatClock(remains)}</div></div>
        <div id="wrongList" class="wrong-list">${wrongQuestions.length ? wrongQuestions.map((q,i)=>{const userOpt=q.options.find(o=>o.id===state.answers[q.id]);const good=q.options.find(o=>o.id===q.correctOptionId);return `<article class="wrong"><div class="wrong-meta">${escapeHTML(sectionName(q.section))} · ${i+1}. hibajegy</div><h3>${escapeHTML(q.text)}</h3><p class="bad">${userOpt ? 'A válaszod: '+escapeHTML(userOpt.text) : 'Nem érkezett válasz erre a kérdésre.'}</p><p class="good">Helyes válasz: <strong>${escapeHTML(good?.text||'–')}</strong></p></article>`;}).join('') : '<div class="review-expired">Hibátlan dolgozat! Mind az 50 kérdésre helyesen válaszoltál.</div>'}</div>` : `<div class="review-expired">⏳ Az 5 perces megtekintési idő lejárt. A hibák és helyes válaszok már nem láthatók. A pontszám és a PDF-eredménylap továbbra is elérhető.</div>`}
      </section>
      <section class="result-panel"><h2>Eredménylap továbbítása</h2><p class="panel-p" style="margin:0 0 16px">A PDF-hez kattints az alábbi gombra. A böngésző nyomtatási ablakában a <strong>Cél / Nyomtató</strong> mezőben válaszd a <strong>Mentés PDF-ként</strong> lehetőséget, majd a <strong>Mentés</strong> gombot. Az elkészült PDF-et küldd el a tanárodnak e-mailben vagy add le a Google Classroomban.</p><div class="results-actions"><button id="pdfButton" class="btn" type="button">⎙ Eredménylap mentése PDF-ként</button><button id="resetButton" class="btn btn-quiet" type="button">↻ Újrapróbálkozás / nullázás</button></div><p class="result-message">Próbálkozás: ${state.attempt}. · Azonosító: ${escapeHTML(state.sessionId)} · A PDF tartalmazza a pontszámot, a témakörök eredményét és az oldalelhagyásokat, de a megoldókulcsot nem.</p></section>
      <div class="notice">Ez a weboldal GitHub Pages-en, szerveroldali hitelesítés nélkül fut. A PDF a tanuló böngészőjében készül, ezért önmagában nem tekinthető hamisításbiztos vizsgajegyzőkönyvnek.</div>
    </main>${footer()}`;
    renderReport();
    $('pdfButton').addEventListener('click',pdfDownload);
    $('resetButton').addEventListener('click',()=>{
      if (!window.confirm('Biztosan törölni szeretnéd a mostani próbálkozást, és új tesztet kezdenél? Az előző eredmény helyben nem lesz visszaállítható. Előbb mentsd el PDF-ben!')) return;
      const name=state.name,group=state.group,attempt=state.attempt+1;
      localStorage.removeItem(STORAGE);
      state=null;
      homepage();
      $('studentName').value=name;$('studentClass').value=group;
      $('honorRules').checked=false;
      $('studentName').scrollIntoView({behavior:'smooth',block:'center'});
      notice(`A ${attempt}. próbálkozás előtt fogadd el ismét a szabályokat.`);
      // Next attempt is recorded in temporary memory, not browser storage.
      $('startForm').addEventListener('submit', function updateAttempt(){ /* First-page form gets regular start. */ },{once:true});
      document.documentElement.dataset.nextAttempt=String(attempt);
    });
  }
  function reportHTML() {
    const d=details();
    const spent=Math.max(0,Math.ceil((state.finishedAt-state.startedAt)/60000));
    return `<div class="pr-head"><div class="pr-meta">OSZTV 2025 · INFORMATIKAI RENDSZER- ÉS ALKALMAZÁS-ÜZEMELTETŐ TECHNIKUS</div><h1>Interaktív tudáspróba – eredménylap</h1><div class="pr-meta">50 kérdés · 100 pont · 60 perc</div></div>
      <table><tbody><tr><td><strong>Tanuló neve</strong></td><td>${escapeHTML(state.name)}</td></tr><tr><td><strong>Osztály / csoport</strong></td><td>${escapeHTML(state.group)}</td></tr><tr><td><strong>Próbálkozás / azonosító</strong></td><td>${state.attempt}. / ${escapeHTML(state.sessionId)}</td></tr><tr><td><strong>Kezdés</strong></td><td>${dateTime(state.startedAt)}</td></tr><tr><td><strong>Befejezés</strong></td><td>${dateTime(state.finishedAt)}</td></tr><tr><td><strong>Eltelt idő</strong></td><td>${spent} perc</td></tr><tr><td><strong>Lezárás oka</strong></td><td>${escapeHTML(state.finishReason)}</td></tr></tbody></table>
      <div class="pr-score">${d.percent}% <small>${d.score} / 100 pont</small></div>
      <div>Helyes: <strong>${d.good}</strong> · Hibás: <strong>${d.wrong}</strong> · Megválaszolatlan: <strong>${d.unanswered}</strong> · Oldalelhagyási jelzés: <strong>${state.departures}</strong></div>
      <h2>Témakörönkénti pontszám</h2><table><thead><tr><th>Témakör</th><th>Elért pont</th><th>Maximum</th></tr></thead><tbody>${d.rows.map(r=>`<tr><td>${escapeHTML(r.section)}</td><td>${r.points}</td><td>${r.maxPoints}</td></tr>`).join('')}</tbody></table>
      <h2>Oldalelhagyási események</h2>${state.events.length ? `<table><thead><tr><th>Időpont</th><th>Esemény típusa</th></tr></thead><tbody>${state.events.map(e=>`<tr><td>${dateTime(e.time)}</td><td>${escapeHTML(e.event)}</td></tr>`).join('')}</tbody></table>` : '<p>A böngésző nem naplózott oldalelhagyási eseményt.</p>'}
      <div class="pr-foot">Forrás: 2025. évi OSZTV – megoldással ellátott területi előválogató feladatsor. Ez a PDF a tanuló böngészőjében készült, nem hitelesített szerveroldali vizsgajegyzőkönyv. A helyes válaszokat a dokumentum nem tartalmazza.</div>`;
  }
  function renderReport() {
    const print=$('print-sheet');
    if (print && state?.stage==='finished') print.innerHTML=reportHTML();
  }
  function pdfDownload() {
    if (!state || state.stage !== 'finished') return;
    // Render the separate, print-only sheet before invoking the browser's native PDF printer.
    // The older html2pdf canvas export could produce blank pages in some browsers.
    renderReport();
    const sheet = $('print-sheet');
    if (!sheet || !sheet.textContent.trim()) {
      notice('Nem sikerült elkészíteni az eredménylapot. Kérjük, frissítsd az oldalt, és próbáld újra.');
      return;
    }
    window.print();
  }
  // Focus changes cannot prevent other applications from opening; they are only signals.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState==='hidden') guard('Böngészőlap elrejtése');
    else if (pendingWarning) setTimeout(showPendingWarning,150);
  });
  window.addEventListener('blur', () => guard('A böngésző elvesztette a fókuszt'));
  window.addEventListener('focus', () => {if (pendingWarning) setTimeout(showPendingWarning,140);});
  document.addEventListener('fullscreenchange', () => {
    if (state?.stage==='exam' && !document.fullscreenElement && Date.now()>guardGraceUntil) guard('Kilépés teljes képernyőből');
  });
  window.addEventListener('pagehide', () => guard('Az oldal elhagyása vagy újratöltése'));
  window.addEventListener('beforeunload', e => {
    if (state?.stage==='exam') {e.preventDefault();e.returnValue='';}
  });
  window.addEventListener('popstate', () => {
    if (state?.stage==='exam') {
      guard('Böngésző visszalépés');
      history.pushState({osztvExam:true},'',location.pathname+location.search+location.hash);
    }
  });
  document.addEventListener('contextmenu',e=>{if(state?.stage==='exam') e.preventDefault();});
  document.addEventListener('copy',e=>{if(state?.stage==='exam') e.preventDefault();});
  document.addEventListener('keydown',e=>{
    if (state?.stage!=='exam') return;
    if ((e.ctrlKey||e.metaKey)&&['c','v','x','u','s','p'].includes(e.key.toLowerCase())) e.preventDefault();
    if (e.key==='F12') e.preventDefault(); // Cannot reliably disable browser developer tools.
  });
  state=load();
  if (state && state.stage==='exam' && Date.now()>=state.deadline) finalize('Lejárt az idő');
  else if (state?.stage==='exam') {
    // A reload is not a free reset: answers and deadline remain, and navigation was logged on leaving.
    guardGraceUntil=Date.now()+2200;
    history.pushState({osztvExam:true},'',location.pathname+location.search+location.hash);
    examPage();
  } else if (state?.stage==='finished') resultsPage();
  else homepage();
  // A restored browser should honour the next attempt number after an explicit reset.
  const originalLaunch=launch;
  launch = function(name,group,attempt) {
    const next=Number(document.documentElement.dataset.nextAttempt||'0');
    delete document.documentElement.dataset.nextAttempt;
    return originalLaunch(name,group,next||attempt);
  };
  setInterval(checkTime,250);
})();
