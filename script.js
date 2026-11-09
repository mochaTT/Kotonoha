const STAGE_SIZE = 45;
const NUM_STAGES = Math.ceil(WORDS.length / STAGE_SIZE);
const DAILY_GOAL = 45;
const AREA_NAMES = ["ことのはの芽","言の葉の小径","物思いの森","恋歌の泉","雅の館","宮中の間","千年の社"];
const COLLECTION_POOL = ["🌸","📜","🎎","🏯","🪭","⛩️","🎏","🍃","🪷","🕊️","🖌️","🀄","🎐","🏮","👘","🎴","🌕","🦢","🍵","🎋","🧧","💮","🌾","🍁","🏆","🎁","💎","👑"];
const UNLOCK_EVERY = 5;
const MASCOT_LINES = {
  home:["今日もがんばろう！","一つずつ覚えていこう！","言の葉の森を育てよう！"],
  ok:["やったね！","その調子！","覚えてきたね！"],
  ng:["だいじょうぶ、次いこう！","もう一度確認しよう！"],
  dk:["少しずつ覚えていこう！","次は分かるはず！"]
};

let state = null;
function defaultState(){
  return { stats:{}, exp:0, coins:0, todayCount:0, todayDate:new Date().toDateString(),
    totalStudied:0, totalMastered:0, unlockedStage:0, activeStage:0, collection:[], answerMode:'choice' };
}
function load(){
  try{ const raw = localStorage.getItem('kotonohaMoriSave'); state = raw ? JSON.parse(raw) : defaultState(); }
  catch(e){ state = defaultState(); }
  if(state.activeStage===undefined) state.activeStage = state.unlockedStage;
  if(state.answerMode!=='card') state.answerMode = 'choice';
  if(state.todayDate !== new Date().toDateString()){ state.todayDate = new Date().toDateString(); state.todayCount = 0; }
  save();
}
function save(){ try{ localStorage.setItem('kotonohaMoriSave', JSON.stringify(state)); }catch(e){} }

function level(){ return Math.floor(state.exp/100)+1; }
function expForNext(){ return level()*100; }
function stageWords(s){ return WORDS.slice(s*STAGE_SIZE, s*STAGE_SIZE+STAGE_SIZE).map((w,i)=>({...w, idx:s*STAGE_SIZE+i})); }
function stageMasteredCount(s){ return stageWords(s).reduce((n,w)=>n+((state.stats[w.idx]||{}).mastered?1:0),0); }
function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function formatMeaning(text){
  let n=0;
  return text.replace(/\s*(\[[^\]]+\])/g, (m,tag)=>{ n++; return n===1 ? tag : '<br>'+tag; });
}
function toast(msg){ const t=document.getElementById('toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(toast._t); toast._t=setTimeout(()=>t.classList.remove('show'),1800); }
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }

function renderWorldCard(elId, badgeText, ratio){
  const el = document.getElementById(elId);
  const hills = ratio>=.5 ? "⛰️🏔️⛰️" : "⛰️";
  const trees = ratio>=.25 ? (ratio>=.75 ? "🌳🌲🌳🌲🌳" : "🌳 🌲 🌳") : "🌱 🌱";
  const city = ratio>=1 ? "🏰🏘️🏠🏘️🏰" : ratio>=.5 ? "🏠 🏡 🏠" : ratio>0 ? "⛺" : "";
  el.innerHTML = `
    <div class="sun"></div>
    <div class="cloud c1"></div><div class="cloud c2"></div>
    <div class="title">ことのは</div>
    <div class="hillrow">${hills}</div>
    <div class="hillrow" style="bottom:56px;">${trees}</div>
    <div class="cityrow">${city}</div>
    <div class="badge">${badgeText}</div>`;
}

function showScreen(name){
  if(name==='study' && !session){
    toast('ホームの「学習をはじめる」から始めてね');
    return;
  }
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById('screen-'+name).classList.add('active');
  document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active', b.dataset.scr===name));
  if(name==='home') renderHome();
  if(name==='world') renderWorld();
  if(name==='collection') renderCollection();
  if(name==='menu') renderMenu();
}

function renderTopStat(prefix){
  document.getElementById(prefix+'Lv').textContent = 'Lv.'+level();
  document.getElementById(prefix+'ExpBar').style.width = Math.min(100,100*state.exp/expForNext())+'%';
  document.getElementById(prefix+'Diamond').textContent = state.totalMastered;
  document.getElementById(prefix+'Coin').textContent = state.coins;
}

function renderHome(){
  const s = state.activeStage;
  const ratio = stageMasteredCount(s)/STAGE_SIZE;
  renderTopStat('home');
  renderWorldCard('homeWorld', AREA_NAMES[s%AREA_NAMES.length]+' ・ '+(s*STAGE_SIZE+1)+'〜'+(s*STAGE_SIZE+stageWords(s).length)+'語', ratio);
  document.getElementById('homeToday').textContent = Math.min(state.todayCount,DAILY_GOAL)+' / '+DAILY_GOAL+'語';
  document.getElementById('homeTodayBar').style.width = Math.min(100,100*state.todayCount/DAILY_GOAL)+'%';
  document.getElementById('homeMascotLine').textContent = pick(MASCOT_LINES.home);
  renderMode();
  renderWeak('homeWeakList', 10);
}

function selectStage(i){
  state.activeStage = i; save(); startSession();
}

function renderWorld(){
  const s = state.activeStage;
  renderWorldCard('worldBig', AREA_NAMES[s%AREA_NAMES.length], stageMasteredCount(s)/STAGE_SIZE);
  const list = document.getElementById('stageList'); list.innerHTML='';
  for(let i=0;i<NUM_STAGES;i++){
    const total = stageWords(i).length;
    const cnt = stageMasteredCount(i);
    const done = cnt>=total && total>0;
    const beyond = i>state.unlockedStage;
    const current = i===state.activeStage;
    const div = document.createElement('div');
    div.className = 'stagecard'+(beyond?' beyond':'')+(done?' done':'')+(current?' current':'');
    const range = (i*STAGE_SIZE+1)+'〜'+(i*STAGE_SIZE+total)+'語';
    div.innerHTML = `<div class="num">${i+1}</div><div style="flex:1"><b>${AREA_NAMES[i%AREA_NAMES.length]}</b><div class="small">${range}　${cnt} / ${total} 語 定着</div></div>${beyond?'<div class="small">🔍</div>':''}`;
    div.onclick = ()=>selectStage(i);
    list.appendChild(div);
  }
}

function renderCollection(){
  const total = Math.floor(state.totalMastered/UNLOCK_EVERY);
  document.getElementById('collectionCount').textContent = Math.min(total,COLLECTION_POOL.length)+' / '+COLLECTION_POOL.length+' 集めた';
  const g = document.getElementById('collectionGrid'); g.innerHTML='';
  COLLECTION_POOL.forEach((emoji,i)=>{
    const unlocked = i < total;
    const d = document.createElement('div');
    d.className = 'gitem'+(unlocked?'':' locked');
    d.innerHTML = `<div>${unlocked?emoji:'❔'}</div><div class="lbl">${unlocked?'':'未開放'}</div>`;
    g.appendChild(d);
  });
}

function renderWeak(elId, limit){
  const arr = Object.entries(state.stats).map(([idx,st])=>({idx:+idx, bad:(st.i||0)+(st.d||0)})).filter(x=>x.bad>0);
  arr.sort((a,b)=>b.bad-a.bad);
  const list = document.getElementById(elId); list.innerHTML='';
  if(arr.length===0){ list.innerHTML = '<div class="small">まだ苦手な単語はありません</div>'; return; }
  arr.slice(0,limit).forEach(x=>{
    const w = WORDS[x.idx];
    const d = document.createElement('div'); d.className='weak';
    d.innerHTML = `<span>${w.w}<br><span class="small">${formatMeaning(w.full)}</span></span><span class="badge">${x.bad}回</span>`;
    list.appendChild(d);
  });
}

function renderMenu(){
  document.getElementById('menuTotal').textContent = state.totalStudied+' 語';
  document.getElementById('menuMastered').textContent = state.totalMastered+' / '+WORDS.length;
  document.getElementById('menuLevel').textContent = level();
}

function resetGame(){
  if(confirm('本当にすべての学習データを削除しますか？この操作は取り消せません。')){
    state = defaultState(); save(); showScreen('home'); toast('データをリセットしました');
  }
}

// ---- study session ----
let session = null;
function startSession(){
  const s = state.activeStage;
  const words = stageWords(s);
  session = { stage:s, round:1, queue: shuffle(words.slice()), review:[], total: words.length, answered:0, card: state.answerMode==='card' };
  showScreen('study');
  nextQuestion();
}
function studyStageLabel(){
  return 'STAGE '+(session.stage+1)+'-'+session.round+' ｜ '+AREA_NAMES[session.stage%AREA_NAMES.length];
}
function nextQuestion(){
  document.getElementById('studyFeedback').textContent='';
  document.getElementById('studyNextBtn').style.display='none';
  if(!session) return showScreen('home');
  if(session.queue.length===0){
    if(session.review.length>0 && session.round<5){
      session.round++; session.queue = shuffle(session.review.slice()); session.review=[];
    } else { finishSession(); return; }
  }
  session.current = session.queue.shift();
  renderQuestion();
}
function renderQuestion(){
  document.getElementById('studyFeedback').textContent='';
  document.getElementById('studyNextBtn').style.display='none';
  const w = session.current;
  document.getElementById('studyStage').textContent = studyStageLabel();
  document.getElementById('studyDiamond').textContent = state.totalMastered+' / '+WORDS.length;
  document.getElementById('qbarInner').style.width = Math.round(100*session.answered/session.total)+'%';
  document.getElementById('studyWord').textContent = w.w;
  resetCardUI();
  if(session.card){
    document.getElementById('studyChoices').innerHTML = '';
    document.getElementById('studyPrompt').textContent = 'この単語の意味を思い出してみよう';
    document.getElementById('cardHint').textContent = 'タップして答えを見る';
    document.getElementById('cardHint').style.display = 'block';
    return;
  }
  document.getElementById('studyPrompt').textContent = 'この単語の意味として最も近いものを選んでください';
  const others = [];
  while(others.length<3){ const r = pick(WORDS); if(r.full!==w.full && !others.includes(r.full)) others.push(r.full); }
  const opts = shuffle([w.full,...others]);
  const box = document.getElementById('studyChoices'); box.innerHTML='';
  opts.forEach((opt)=>{
    const b=document.createElement('button'); b.className='choice plain';
    b.dataset.full = opt;
    b.innerHTML = formatMeaning(opt);
    b.onclick=()=>answer(opt===w.full, b); box.appendChild(b);
  });
  const dn=document.createElement('button'); dn.className='choice dunno plain'; dn.textContent='？　わからない';
  dn.onclick=()=>answer(null,dn); box.appendChild(dn);
}

function answer(correct, btnEl){
  const w = session.current;
  // 「戻す」用に、回答する直前の状態を保存しておく
  session.snap = { state:JSON.stringify(state), queue:session.queue.slice(), review:session.review.slice(), round:session.round, cur:w, answered:session.answered };
  document.querySelectorAll('#studyChoices .choice').forEach(b=>{ b.onclick=null; });
  let st = state.stats[w.idx] || {c:0,i:0,d:0,hist:'',mastered:false};
  let kind, gainExp=0, gainCoin=0;
  if(correct===true){
    st.c++; st.hist=(st.hist+'O').slice(-5); kind='ok'; gainExp=10; gainCoin=5;
    btnEl.classList.add('correct');
  } else if(correct===false){
    st.i++; st.hist=(st.hist+'X').slice(-5); kind='ng';
    btnEl.classList.add('wrong');
    document.querySelectorAll('#studyChoices .choice').forEach(b=>{ if(b.dataset.full===w.full) b.classList.add('correct'); });
    session.review.push(w);
  } else {
    st.d++; st.hist=(st.hist+'D').slice(-5); kind='dk';
    btnEl.classList.add('wrong');
    document.querySelectorAll('#studyChoices .choice').forEach(b=>{ if(b.dataset.full===w.full) b.classList.add('correct'); });
    session.review.push(w);
  }
  let masteredNow=false;
  if(!st.mastered && st.hist.slice(-3)==='OOO'){ st.mastered=true; masteredNow=true; state.totalMastered++; gainExp+=30; }
  state.stats[w.idx]=st; state.exp+=gainExp; state.coins+=gainCoin;
  state.todayCount++; state.totalStudied++; session.answered++;
  save();
  if(masteredNow){
    if(state.totalMastered % UNLOCK_EVERY === 0) toast('🎁 新しいコレクションを獲得！');
    else toast('💎「'+w.w+'」が定着しました！');
  }
  if(session.card) return;   // カード式はスワイプ後にそのまま次の問題へ進む
  const cfg = { ok:{cls:'ok', text:'正解！'}, ng:{cls:'ng', text:'不正解…'}, dk:{cls:'ng', text:'わからない'} }[kind];
  const fb = document.getElementById('studyFeedback');
  fb.innerHTML = cfg.text; fb.className = 'feedback '+cfg.cls;
  document.getElementById('studyNextBtn').style.display='block';
}

// ---- 回答方式（4択 / カード） ----
function setAnswerMode(m){
  state.answerMode = m==='card' ? 'card' : 'choice'; save(); renderMode();
}
function renderMode(){
  document.querySelectorAll('#answerSeg button').forEach(b=>b.classList.toggle('active', b.dataset.ans===state.answerMode));
  const ad = document.getElementById('answerDesc');
  if(ad) ad.textContent = state.answerMode==='card'
    ? 'タップで答えを見て、覚えていたら右へ・間違えたら左へスワイプします'
    : '4つの選択肢から意味を選びます';
}

// ---- カード式（タップで答えを見る → 右: 正解 / 左: 間違い）----
const SWIPE_TH = 90;           // この距離(px)以上動かしたらスワイプ確定
let _drag = null;
function cardEl(){ return document.getElementById('swipeCard'); }
function setOverlay(dx){
  const c = cardEl(); if(!c) return;
  if(dx>50) c.dataset.d = 'ok'; else if(dx<-50) c.dataset.d = 'ng'; else delete c.dataset.d;
}
function resetCardUI(){
  const c = cardEl(); if(!c) return;
  const card = !!(session && session.card);
  c.classList.toggle('cardmode', card);
  const scr = document.getElementById('screen-study'); if(scr) scr.classList.toggle('cardfill', card);
  c.classList.remove('revealed');
  c.style.transition = 'none'; c.style.transform = ''; c.style.opacity = '';
  setOverlay(0);
  document.getElementById('cardMean').style.display = 'none';
  document.getElementById('cardHint').style.display = 'none';
  document.getElementById('cardBtns').style.display = card ? 'flex' : 'none';
  document.getElementById('cardNote').style.display = card ? 'block' : 'none';
  document.getElementById('ngBtn').disabled = true; document.getElementById('okBtn').disabled = true;
  document.getElementById('studyChoices').style.display = card ? 'none' : '';
  if(session){ session.revealed = false; session.locked = false; }
  _drag = null;
}
function revealCard(){
  if(!session || !session.card || session.revealed || session.locked) return;
  session.revealed = true;
  const w = session.current;
  cardEl().classList.add('revealed');
  const m = document.getElementById('cardMean');
  m.innerHTML = formatMeaning(w.full); m.style.display = 'block';
  document.getElementById('studyPrompt').textContent = '覚えていた？';
  document.getElementById('cardHint').style.display = 'none';
  document.getElementById('ngBtn').disabled = false; document.getElementById('okBtn').disabled = false;
}
function setCardDrag(dx){
  const c = cardEl();
  c.style.transition = 'none';
  c.style.transform = 'translateX('+dx+'px) rotate('+(dx/18)+'deg)';
  setOverlay(dx);
}
function releaseCard(){
  const c = cardEl();
  c.style.transition = 'transform .2s ease-out';
  c.style.transform = '';
  setOverlay(0);
}
function flyCard(ok){
  if(!session || session.locked) return;
  const s = session; s.locked = true;
  const c = cardEl();
  const dist = (window.innerWidth || 400) * (ok ? 1 : -1);
  c.style.transition = 'transform .22s ease-in, opacity .22s ease-in';
  c.style.transform = 'translateX('+dist+'px) rotate('+(ok?25:-25)+'deg)';
  c.style.opacity = '0';
  setOverlay(ok ? SWIPE_TH : -SWIPE_TH);
  document.getElementById('ngBtn').disabled = true; document.getElementById('okBtn').disabled = true;
  setTimeout(()=>{
    if(session!==s) return;
    answer(ok, {classList:{add(){}}});
    nextQuestion();
  }, 230);
}
function cardAnswer(ok){
  if(!session || !session.card || !session.revealed || session.locked) return;
  flyCard(ok);
}
function undo(){
  if(!session || session.locked || !session.snap){ toast('戻せる回答がありません'); return; }
  const s = session.snap;
  state = JSON.parse(s.state); save();
  session.queue = s.queue; session.review = s.review; session.round = s.round;
  session.answered = s.answered; session.current = s.cur; session.snap = null;
  renderQuestion();
  if(session.card) revealCard();   // カード式は答えを表示した状態に戻す
}
function initSwipe(){
  const el = cardEl(); if(!el) return;
  el.addEventListener('pointerdown', e=>{
    if(!session || !session.card || session.locked) return;
    _drag = { x:e.clientX, y:e.clientY, dx:0, moved:false, id:e.pointerId };
    try{ el.setPointerCapture(e.pointerId); }catch(_){}
  });
  el.addEventListener('pointermove', e=>{
    if(!_drag || e.pointerId!==_drag.id || !session || session.locked) return;
    const dx = e.clientX-_drag.x, dy = e.clientY-_drag.y;
    if(Math.abs(dx)>8 || Math.abs(dy)>8) _drag.moved = true;
    if(!session.revealed) return;
    _drag.dx = dx; setCardDrag(dx);
  });
  const end = e=>{
    if(!_drag || e.pointerId!==_drag.id) return;
    const d = _drag; _drag = null;
    if(!session || !session.card || session.locked) return;
    if(!session.revealed){ if(!d.moved && e.type==='pointerup') revealCard(); return; }
    if(e.type==='pointerup' && Math.abs(d.dx)>=SWIPE_TH) flyCard(d.dx>0); else releaseCard();
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  // パソコン用：Space/Enterで答えを見る、→ で正解、← で間違い
  document.addEventListener('keydown', e=>{
    const scr = document.getElementById('screen-study');
    if(!session || !session.card || !scr || !scr.classList.contains('active')) return;
    if(e.key===' ' || e.key==='Enter'){ e.preventDefault(); revealCard(); }
    else if(e.key==='ArrowRight') cardAnswer(true);
    else if(e.key==='ArrowLeft') cardAnswer(false);
  });
}

function finishSession(){
  const s = session.stage;
  const cleared = stageMasteredCount(s) >= stageWords(s).length;
  if(cleared && state.unlockedStage===s && s<NUM_STAGES-1){ state.unlockedStage++; save(); toast('🌟 新しいエリアが解放されました！'); }
  session = null; save();
  showScreen('home');
}

document.addEventListener('DOMContentLoaded', ()=>{ load(); initSwipe(); showScreen('home'); });
