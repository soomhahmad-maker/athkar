/* تطبيق أذكار الصباح والمساء — خط ثمانية + مسبحة لكل ذكر + تكبير خط + ثيم */
(function(){
"use strict";

let currentTab = 'morning';
let hideDone = false;
let progress = {};
let totalCounter = 0;
let fontScale = 1;

try { progress = JSON.parse(localStorage.getItem('athkar-progress') || '{}'); } catch(e){ progress = {}; }
try { totalCounter = parseInt(localStorage.getItem('athkar-total') || '0', 10) || 0; } catch(e){ totalCounter = 0; }
try { fontScale = parseFloat(localStorage.getItem('athkar-font-scale') || '1') || 1; } catch(e){ fontScale = 1; }
fontScale = Math.min(1.6, Math.max(0.8, fontScale));

const listEl = document.getElementById('list');
const emptyEl = document.getElementById('emptyState');
const progressText = document.getElementById('progressText');
const progressFill = document.getElementById('progressFill');
const totalCountEl = document.getElementById('totalCount');
const searchInput = document.getElementById('search');
const timeHint = document.getElementById('timeHint');
const fontPct = document.getElementById('fontPct');

/* ---------- حجم الخط ---------- */
function applyFontScale(){
  document.querySelector(':root').style.setProperty('--font-scale', fontScale);
  fontPct.textContent = Math.round(fontScale * 100) + '%';
  try { localStorage.setItem('athkar-font-scale', String(fontScale)); } catch(e){}
}
document.getElementById('fontInc').onclick = () => { fontScale = Math.min(1.6, +(fontScale + 0.1).toFixed(2)); applyFontScale(); };
document.getElementById('fontDec').onclick = () => { fontScale = Math.max(0.8, +(fontScale - 0.1).toFixed(2)); applyFontScale(); };
document.getElementById('fontReset').onclick = () => { fontScale = 1; applyFontScale(); };

/* ---------- الثيم ---------- */
const themeBtn = document.getElementById('themeBtn');
function applyTheme(t){
  const dark = (t === 'dark');
  document.body.classList.toggle('dark', dark);
  themeBtn.textContent = dark ? '☀️' : '🌙';
  themeBtn.title = dark ? 'التبديل للوضع النهاري' : 'التبديل للوضع الليلي';
  try { localStorage.setItem('athkar-theme', dark ? 'dark' : 'light'); } catch(e){}
}
themeBtn.onclick = () => applyTheme(document.body.classList.contains('dark') ? 'light' : 'dark');
(function initTheme(){
  let saved = null;
  try { saved = localStorage.getItem('athkar-theme'); } catch(e){}
  if(saved === 'dark' || saved === 'light') applyTheme(saved);
  else if(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) applyTheme('dark');
  else applyTheme('light');
})();

/* ---------- الوقت والتبويب ---------- */
function isMorningTime(){ const h = new Date().getHours(); return h >= 4 && h < 16; }
function renderTimeHint(){
  let auto = null;
  try { auto = localStorage.getItem('athkar-tab-set'); } catch(e){}
  if(isMorningTime()){
    timeHint.textContent = '☀️ الآن وقت أذكار الصباح (بعد الفجر حتى قبل العصر)';
    if(currentTab !== 'morning' && !auto) currentTab = 'morning';
  } else {
    timeHint.textContent = '🌙 الآن وقت أذكار المساء (بعد العصر حتى الفجر)';
    if(currentTab !== 'evening' && !auto) currentTab = 'evening';
  }
  syncTabs();
}
function syncTabs(){
  document.getElementById('tabMorning').classList.toggle('active', currentTab === 'morning');
  document.getElementById('tabEvening').classList.toggle('active', currentTab === 'evening');
  document.getElementById('tabMorning').setAttribute('aria-selected', currentTab === 'morning');
  document.getElementById('tabEvening').setAttribute('aria-selected', currentTab === 'evening');
}
function setTab(t){ currentTab = t; try{ localStorage.setItem('athkar-tab-set','1'); }catch(e){} syncTabs(); render(); }
document.getElementById('tabMorning').onclick = () => setTab('morning');
document.getElementById('tabEvening').onclick = () => setTab('evening');

/* ---------- البيانات ---------- */
function keyFor(a){ return currentTab + '-' + a.id; }
function getRemain(a){
  const k = keyFor(a);
  if(progress[k] === undefined) return a.repeat;
  return progress[k];
}
function setRemain(a, v){ progress[keyFor(a)] = v; save(); }
function save(){
  try {
    localStorage.setItem('athkar-progress', JSON.stringify(progress));
    localStorage.setItem('athkar-total', String(totalCounter));
  } catch(e){}
}
function filtered(){
  const q = (searchInput.value || '').trim();
  let arr = ADHKAR.filter(a => (a.cat === currentTab || a.cat === 'both') && (!q || (a.title + a.text + a.source + a.virtue).includes(q)));
  if(hideDone) arr = arr.filter(a => getRemain(a) > 0);
  return arr;
}
function vibrate(ms){ try { if(navigator.vibrate) navigator.vibrate(ms); } catch(e){} }

/* ---------- العرض ---------- */
function render(){
  const items = filtered();
  listEl.innerHTML = '';
  let done = 0;
  const totalAll = ADHKAR.filter(a => (a.cat === currentTab || a.cat === 'both')).length;
  ADHKAR.filter(a => (a.cat === currentTab || a.cat === 'both')).forEach(a => { if(getRemain(a) === 0) done++; });

  items.forEach((a, idx) => {
    const remain = getRemain(a);
    const isDone = (remain === 0);
    const card = document.createElement('article');
    card.className = 'card' + (isDone ? ' done' : '');

    let tasbihHTML = '';
    if(a.repeat === 1){
      tasbihHTML = `
        <button class="single-done-btn ${isDone ? 'is-done' : ''}" data-act="single">
          ${isDone ? '✓ تم الذكر بحمد الله — اضغط للتراجع' : '✓ اضغط بعد قول الذكر لتعليمه كمنجز'}
        </button>`;
    } else {
      const finishedCount = a.repeat - remain;
      const pct = a.repeat ? Math.round(finishedCount / a.repeat * 100) : 100;
      tasbihHTML = `
        <button class="sebha-btn ${isDone ? 'finished' : ''}" data-act="sebha" style="--p:${pct}%"
          aria-label="مسبحة ${a.title}: المتبقي ${remain} من ${a.repeat}. اضغط للتسبيح">
          <span class="sebha-inner">
            <span class="sebha-count">${isDone ? '✓' : remain}</span>
            <span class="sebha-label">${isDone ? 'تم بحمد الله' : ('المتبقي / ' + a.repeat)}</span>
            <span class="sebha-hint">${isDone ? 'اضغط للتراجع' : 'اضغط للتسبيح 👆'}</span>
          </span>
        </button>
        <div class="tasbih-side">
          <div class="repeat-line">🔁 التكرار المطلوب: <b>${a.repeat}</b> &nbsp;•&nbsp; المنجز: <b>${finishedCount}</b> &nbsp;•&nbsp; المتبقي: <b>${remain}</b></div>
          <div class="tasbih-btns">
            <button class="btn-small primary" data-act="plus-one">+ تسبيحة</button>
            <button class="btn-small" data-act="undo">↩ تراجع</button>
            <button class="btn-small" data-act="reset-one">↺ تصفير الذكر</button>
            <button class="btn-small" data-act="copy">📋 نسخ</button>
          </div>
        </div>`;
      if(a.repeat === 1){
        // لن يصل هنا لكن للاحتياط
      }
    }
    // زر النسخ للذكر المفرد أيضاً
    const extraCopy = (a.repeat === 1)
      ? `<div class="tasbih-btns" style="margin-top:10px">
           <button class="btn-small" data-act="copy">📋 نسخ الذكر</button>
           <button class="btn-small" data-act="reset-one">↺ إعادة</button>
         </div>` : '';

    card.innerHTML = `
      <div class="card-head">
        <h2 class="card-title"><span class="card-num">${idx + 1}</span> ${escapeHtml(a.title)}</h2>
        <span class="grade ${a.gradeType}">✔ ${escapeHtml(a.grade)}</span>
      </div>
      <p class="card-text">${escapeHtml(a.text)}</p>
      <div class="meta">
        <div class="virtue">🌟 <span class="label">الفضل:</span> ${escapeHtml(a.virtue)}</div>
        <div class="source">📖 <span class="label">المصدر:</span> ${escapeHtml(a.source)}</div>
      </div>
      <div class="tasbih-zone">${tasbihHTML}</div>
      ${extraCopy ? `<div style="padding:0 20px 20px">${extraCopy}</div>` : ''}
    `;

    // الأحداث
    const sebhaBtn = card.querySelector('[data-act="sebha"]');
    if(sebhaBtn){
      sebhaBtn.onclick = () => {
        let r = getRemain(a);
        if(r > 0){
          r--; setRemain(a, r); totalCounter++; save();
          vibrate(25);
          if(r === 0){ card.classList.add('just-done'); vibrate([30,50,30]); }
          render();
        } else {
          // مكتمل: الضغط يتراجع خطوة (لمن أخطأ)
          if(confirm('هذا الذكر مكتمل. هل تريد التراجع عن الإتمام؟')){ setRemain(a, 1); render(); }
        }
      };
    }
    const singleBtn = card.querySelector('[data-act="single"]');
    if(singleBtn){
      singleBtn.onclick = () => {
        const r = getRemain(a);
        if(r > 0){ setRemain(a, 0); totalCounter++; save(); vibrate(30); card.classList.add('just-done'); }
        else { setRemain(a, 1); save(); }
        render();
      };
    }
    const plusOne = card.querySelector('[data-act="plus-one"]');
    if(plusOne) plusOne.onclick = () => { if(sebhaBtn) sebhaBtn.click(); };
    const undoBtn = card.querySelector('[data-act="undo"]');
    if(undoBtn) undoBtn.onclick = () => {
      let r = getRemain(a);
      if(r < a.repeat){ setRemain(a, r + 1); render(); }
    };
    const resetOne = card.querySelector('[data-act="reset-one"]');
    if(resetOne) resetOne.onclick = () => { setRemain(a, a.repeat); render(); };
    const copyBtn = card.querySelector('[data-act="copy"]');
    if(copyBtn) copyBtn.onclick = (e) => {
      const txt = `${a.title}\n${a.text}\nالتكرار: ${a.repeat}\nالفضل: ${a.virtue}\nالمصدر: ${a.source}`;
      copyText(txt, e.currentTarget);
    };

    listEl.appendChild(card);
  });

  emptyEl.classList.toggle('hidden', items.length > 0);
  totalCountEl.textContent = `المجموع: ${totalAll} ذكر`;
  progressText.textContent = `${done} / ${totalAll} مكتمل`;
  progressFill.style.width = totalAll ? (done / totalAll * 100) + '%' : '0';
  document.getElementById('fabCount').textContent = totalCounter;
  document.getElementById('counterVal').textContent = totalCounter;
}

function copyText(txt, btn){
  const doneMsg = () => { const old = btn.textContent; btn.textContent = '✅ تم النسخ'; setTimeout(() => btn.textContent = old, 1500); };
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(txt).then(doneMsg).catch(() => fallbackCopy(txt, doneMsg));
  } else fallbackCopy(txt, doneMsg);
}
function fallbackCopy(txt, cb){
  const ta = document.createElement('textarea');
  ta.value = txt; document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); cb(); } catch(e){}
  document.body.removeChild(ta);
}
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* ---------- أزرار عامة ---------- */
searchInput.addEventListener('input', render);
document.getElementById('resetBtn').onclick = () => {
  if(!confirm('تصفير تقدم الورد الحالي؟')) return;
  ADHKAR.forEach(a => { progress[currentTab + '-' + a.id] = a.repeat; });
  save(); render();
};
document.getElementById('hideDoneBtn').onclick = (e) => {
  hideDone = !hideDone;
  e.target.textContent = hideDone ? '👁 إظهار الكل' : '🙈 إخفاء المنجز';
  render();
};

/* ---------- المسبحة العامة ---------- */
const modal = document.getElementById('counterModal');
document.getElementById('counterFab').onclick = () => modal.classList.remove('hidden');
document.getElementById('counterClose').onclick = () => modal.classList.add('hidden');
modal.addEventListener('click', (e) => { if(e.target === modal) modal.classList.add('hidden'); });
document.addEventListener('keydown', (e) => { if(e.key === 'Escape') modal.classList.add('hidden'); });
document.getElementById('counterPlus').onclick = () => { totalCounter++; save(); render(); vibrate(20); };
document.getElementById('counterMinus').onclick = () => { if(totalCounter > 0) totalCounter--; save(); render(); };
document.getElementById('counterReset').onclick = () => { if(confirm('تصفير المسبحة العامة؟')){ totalCounter = 0; save(); render(); } };

/* ---------- تشغيل ---------- */
applyFontScale();
renderTimeHint();
syncTabs();
render();

})();
