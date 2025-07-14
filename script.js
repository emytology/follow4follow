// script.js

// ------------------------------------------------
// 1) Firebase als ES-Module importieren
// ------------------------------------------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  limit,
  getDocs
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

// ------------------------------------------------
// 2) Firebase-Konfiguration
// ------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyDvjeDW6YFzbdqB1x0KREja5I2_M3n0Ga0",
  authDomain: "follow4follow-e623b.firebaseapp.com",
  projectId: "follow4follow-e623b",
  storageBucket: "follow4follow-e623b.firebasestorage.app",
  messagingSenderId: "476859246089",
  appId: "1:476859246089:web:0960da2629007a1fe2bad8",
  measurementId: "G-0Y2SRQ83CW"
};

// ------------------------------------------------
// 3) Firebase initialisieren & Collection-Referenz
// ------------------------------------------------
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const scoresCol = collection(db, 'scores');

// ------------------------------------------------
// 4) Firestore-Helfer (halten wir hier oben)
// ------------------------------------------------
async function saveScore(name, score) {
  try {
    await addDoc(scoresCol, { name, score, timestamp: serverTimestamp() });
  } catch (err) {
    console.error('Fehler beim Speichern:', err);
  }
}

async function loadHighscores() {
  const tbody = document.querySelector('#highscore-table tbody');
  tbody.innerHTML = `<tr><td colspan="3">Lade…</td></tr>`;
  const q = query(scoresCol, orderBy('score', 'desc'), limit(10));
  try {
    const snap = await getDocs(q);
    tbody.innerHTML = '';
    if (snap.empty) {
      tbody.innerHTML = `<tr><td colspan="3">Noch keine Einträge</td></tr>`;
      return;
    }
    snap.forEach((doc, i) => {
      const { name, score } = doc.data();
      const row = document.createElement('tr');
      row.innerHTML = `<td>${i+1}</td><td>${name}</td><td>${score}</td>`;
      tbody.appendChild(row);
    });
  } catch {
    tbody.innerHTML = `<tr><td colspan="3">Fehler beim Laden</td></tr>`;
  }
}

// ------------------------------------------------
// 5) Alles weitere erst nach DOMContentLoaded
// ------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  // Screens & Buttons
  const startScreen  = document.getElementById('start-screen');
  const game1Screen  = document.getElementById('game1-screen');
  const game2Screen  = document.getElementById('game2-screen');
  const game3Screen  = document.getElementById('game3-screen');
  const startButton  = document.getElementById('start-button');
  const shellRestart = document.getElementById('shell-restart');

  // Stats-Leiste
  const followersCountEl = document.getElementById('followers-count-follow');
  const followingCountEl = document.getElementById('following-count-follow');

  // Gesamt- und Teilpunkte
  let totalScore = 0;
  let game1Score = 0;
  let game2Score = 0;
  let game3Score = 0;

  // ===== redirect helper =====
  function showScreen(n) {
    [startScreen, game1Screen, game2Screen, game3Screen]
      .forEach((el,i) => el.classList.toggle('hidden', i+1 !== n));
  }

  // ===== Highscore-Prompt jetzt hier drin, kann startGame & loadHighscores aufrufen =====
  function promptForNameAndSave(finalScore) {
    const name = prompt(`Spiel beendet!\nDein Score: ${finalScore}\nWie heißt du?`);
    if (!name || !name.trim()) {
      showScreen(1);
      return;
    }
    saveScore(name.trim(), finalScore)
      .then(() => {
        loadHighscores();
        showScreen(1);
      })
      .catch(() => {
        showScreen(1);
      });
  }

  // ===== Spiel 1: Follow-Game =====
  const listFollow  = document.getElementById('list-follow');
  const popupFollow = document.getElementById('limit-popup-follow');
  const popupClose  = document.getElementById('close-popup-follow');

  let followTimes     = [];
  let sinceLastReturn = 0;
  let nextThreshold   = 7;
  let followingCount  = 0;
  let followersCount  = 0;
  let followTimer, followTime = 45;

  function getRandomThreshold() {
    return Math.floor(Math.random()*8)+7;
  }
  function updateStats() {
    followersCountEl.textContent = followersCount;
    followingCountEl.textContent = followingCount;
  }
  function checkRateLimit() {
    const cutoff = Date.now() - 60000;
    while (followTimes.length && followTimes[0] < cutoff) followTimes.shift();
    return followTimes.length >= 40;
  }
  function createFollowButton() {
    const btn = document.createElement('button');
    btn.className = 'follow-button';
    btn.textContent = 'Follow';
    btn.addEventListener('click', () => {
      if (checkRateLimit()) {
        popupFollow.classList.remove('hidden');
        return;
      }
      const now = btn.classList.toggle('following');
      if (now) {
        followingCount++;
        sinceLastReturn++;
        followTimes.push(Date.now());
        if (sinceLastReturn >= nextThreshold) {
          followersCount++;
          sinceLastReturn = 0;
          nextThreshold   = getRandomThreshold();
          game1Score = followersCount;
        }
        btn.style.transform = `translateX(${(Math.random()-0.5)*600}px)`;
      } else {
        followingCount = Math.max(0, followingCount-1);
        btn.style.transform = '';
      }
      btn.textContent = now?'Following':'Follow';
      updateStats();
    });
    return btn;
  }
  function loadFollowItems(n=20) {
    for (let i=0;i<n;i++) listFollow.appendChild(createFollowButton());
  }
  popupClose.addEventListener('click', () => popupFollow.classList.add('hidden'));
  listFollow.addEventListener('scroll', () => {
    if (listFollow.scrollTop + listFollow.clientHeight >= listFollow.scrollHeight - 50) {
      loadFollowItems();
    }
  });
  function initFollowGame() {
    totalScore = game1Score = game2Score = game3Score = 0;
    followTimes = []; sinceLastReturn = 0;
    nextThreshold = getRandomThreshold();
    followingCount = followersCount = 0;
    updateStats();
    listFollow.innerHTML = '';

    followTime = 45;
    document.getElementById('timer-follow').textContent = '00:45';
    clearInterval(followTimer);
    followTimer = setInterval(() => {
      followTime--;
      const m = String(Math.floor(followTime/60)).padStart(2,'0');
      const s = String(followTime%60).padStart(2,'0');
      document.getElementById('timer-follow').textContent = `${m}:${s}`;
      if (followTime<=0) {
        clearInterval(followTimer);
        totalScore += game1Score;
        startGame(2);
      }
    },1000);

    loadFollowItems();
  }

  // ===== Spiel 2: Hashtag-Game =====
  const baseTags = [ '#fun','#cool','#wow','#amazing','#instagood','#photooftheday',
    '#love','#happy','#cute','#tbt','#fashion','#beautiful',
    '#picoftheday','#nature','#selfie','#summer','#art','#travel' ];
  let hashtagTimer, hashtagTime=45, hashtagInterval;
  let dropCount=0, game2Local=0;
  const hashtagContainer = document.querySelector('#game2-screen .smartphone-container');
  const caption = document.getElementById('caption-hashtag');

  function createTag() {
    const tag = document.createElement('div');
    tag.className='hashtag';
    tag.innerText = baseTags[Math.floor(Math.random()*baseTags.length)];
    tag.draggable=true;
    tag.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', tag.innerText);
    });
    const W = hashtagContainer.clientWidth - 80;
    const H = hashtagContainer.clientHeight - window.innerHeight*0.2 - 40;
    tag.style.left=`${Math.random()*W}px`;
    tag.style.top=`${Math.random()*H}px`;
    tag.vx=(Math.random()-0.5)*4;
    tag.vy=(Math.random()-0.5)*4;
    hashtagContainer.appendChild(tag);
  }
  function moveHashtags() {
    document.querySelectorAll('.hashtag').forEach(tag => {
      let x = parseFloat(tag.style.left) + tag.vx;
      let y = parseFloat(tag.style.top)  + tag.vy;
      const maxW = hashtagContainer.clientWidth - tag.offsetWidth;
      const maxH = hashtagContainer.clientHeight - window.innerHeight*0.2 - tag.offsetHeight;
      if (x<0||x>maxW) tag.vx*=-1;
      if (y<0||y>maxH) tag.vy*=-1;
      tag.style.left=`${Math.max(0,Math.min(maxW,x))}px`;
      tag.style.top=`${Math.max(0,Math.min(maxH,y))}px`;
    });
  }
  function initHashtagGame() {
    dropCount=0; game2Local=0;
    caption.value='';
    hashtagTime=45;
    document.getElementById('timer-hashtag').textContent='00:45';
    clearInterval(hashtagTimer);
    clearInterval(hashtagInterval);

    hashtagTimer = setInterval(()=>{
      hashtagTime--;
      const m=String(Math.floor(hashtagTime/60)).padStart(2,'0');
      const s=String(hashtagTime%60).padStart(2,'0');
      document.getElementById('timer-hashtag').textContent=`${m}:${s}`;
      if(hashtagTime<=0){
        clearInterval(hashtagTimer);
        clearInterval(hashtagInterval);
        totalScore += game2Local;
        startGame(3);
      }
    },1000);

    document.querySelectorAll('.hashtag').forEach(el=>el.remove());
    for(let i=0;i<12;i++) createTag();
    hashtagInterval = setInterval(moveHashtags,40);

    caption.addEventListener('dragover', e=>e.preventDefault());
    caption.addEventListener('drop', e=>{
      e.preventDefault();
      const txt = e.dataTransfer.getData('text/plain');
      caption.value += (caption.value?' ':'') + txt;
      dropCount++;
      if(dropCount%3===0){
        game2Local += Math.floor(Math.random()*3)+1;
      }
      for(let i=0;i<5;i++) createTag();
    });
  }

  // ===== Spiel 3: Giveaway-Game =====
  const game3Container = game3Screen.querySelector('.smartphone-container');
  const game3TimerEl   = document.getElementById('attempts-shell'); // Timer
  let game3TimerInt, spawnInt;

  function spawnSquare() {
    const sq = document.createElement('div');
    sq.className='giveaway-tile';
    const size=100;
    const W = game3Container.clientWidth - size;
    const H = game3Container.clientHeight - size;
    const x = Math.random()*W, y = Math.random()*H;
    Object.assign(sq.style, { left:`${x}px`, top:`${y}px` });
    const isGiveaway = Math.random()<0.5;
    if(isGiveaway){
      sq.textContent='giveaway';
      sq.dataset.ga='1';
      sq.addEventListener('dblclick', ()=>{
        if(sq.dataset.ga!=='1') return;
        game3Score++;
        followersCount++;
        updateStats();
        sq.textContent='❤';
        sq.dataset.ga='0';
      },{once:true});
    }
    game3Container.appendChild(sq);
    setTimeout(()=> sq.remove(),1000);
  }

  function initGame3() {
    game3Score=0;
    document.querySelectorAll('.giveaway-tile').forEach(e=>e.remove());
    let t=30;
    game3TimerEl.textContent='00:30';
    clearInterval(game3TimerInt);
    clearInterval(spawnInt);

    game3TimerInt = setInterval(()=>{
      t--;
      const m=String(Math.floor(t/60)).padStart(2,'0');
      const s=String(t%60).padStart(2,'0');
      game3TimerEl.textContent=`${m}:${s}`;
      if(t<=0){
        clearInterval(game3TimerInt);
        clearInterval(spawnInt);
        promptForNameAndSave(totalScore + game3Score);
      }
    },1000);

    spawnInt = setInterval(spawnSquare, 800);
  }

  // ===== Sequenzierung =====
  function startGame(n){
    showScreen(n===1?2:n===2?3:n===3?4:1);
    if(n===1) initFollowGame();
    if(n===2) initHashtagGame();
    if(n===3) initGame3();
  }

  // Events + Initial
  startButton.addEventListener('click', ()=> startGame(1));
  shellRestart.addEventListener('click', ()=> startGame(1));
  loadHighscores();
  showScreen(1);
});
