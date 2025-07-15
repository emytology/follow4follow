// script.js

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

// ======== Globale Zähler (persistieren über alle Spiele hinweg) ========
let followersCount = 0;
let followingCount = 0;

// Firebase-Konfiguration
const firebaseConfig = {
  apiKey: "AIzaSyDvjeDW6YFzbdqB1x0KREja5I2_M3n0Ga0",
  authDomain: "follow4follow-e623b.firebaseapp.com",
  projectId: "follow4follow-e623b",
  storageBucket: "follow4follow-e623b.firebasestorage.app",
  messagingSenderId: "476859246089",
  appId: "1:476859246089:web:2629007a1fe2bad8",
  measurementId: "G-0Y2SRQ83CW"
};

// Firebase initialisieren
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const scoresCol = collection(db, 'scores');

// Score speichern
async function saveScore(name, score) {
  try {
    await addDoc(scoresCol, { name, score, timestamp: serverTimestamp() });
  } catch (err) {
    console.error('Fehler beim Speichern:', err);
  }
}

// Highscores laden und Rangnummerierung
async function loadHighscores() {
  const tbody = document.querySelector('#highscore-table tbody');
  tbody.innerHTML = `<tr><td colspan="3">Lade…</td></tr>`;

  // Entferne das Limit(10), so dass alle Einträge geladen werden
  const q = query(scoresCol, orderBy('score', 'desc'));

  try {
    const snap = await getDocs(q);
    tbody.innerHTML = '';
    if (snap.empty) {
      tbody.innerHTML = `<tr><td colspan="3">Noch keine Einträge</td></tr>`;
      return;
    }
    snap.docs.forEach((doc, i) => {
      const { name = 'Unbekannt', score = 0 } = doc.data();
      const row = document.createElement('tr');
      row.innerHTML = `<td>${i+1}</td><td>${name}</td><td>${score}</td>`;
      tbody.appendChild(row);
    });
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="3">Fehler beim Laden</td></tr>`;
    console.error('Fehler beim Laden der Highscores:', e);
  }
}


// Update beider Stats-Leisten
function updateStats() {
  document.querySelectorAll('#followers-count-follow')
    .forEach(el => el.textContent = followersCount);
  document.querySelectorAll('#following-count-follow')
    .forEach(el => el.textContent = followingCount);
}

document.addEventListener('DOMContentLoaded', () => {
  const startScreen   = document.getElementById('start-screen');
  const game1Screen   = document.getElementById('game1-screen');
  const game2Screen   = document.getElementById('game2-screen');
  const game3Screen   = document.getElementById('game3-screen');
  const startButton   = document.getElementById('start-button');
  const caption       = document.getElementById('caption-hashtag');

  let totalScore = 0;
  let game1Score = 0, game2Score = 0, game3Score = 0;

  function showScreen(n) {
    [startScreen, game1Screen, game2Screen, game3Screen]
      .forEach((el,i) => el.classList.toggle('hidden', i+1 !== n));
  }

  function promptForNameAndSave(finalScore) {
    const name = prompt(`Spiel beendet!\nDein Score: ${finalScore}\nWie heißt du?`);
    followersCount = 0;
    followingCount = 0;
    updateStats();
    if (name && name.trim()) {
      saveScore(name.trim(), finalScore)
        .then(() => {
          loadHighscores();
          showScreen(1);
        })
        .catch(() => showScreen(1));
    } else {
      showScreen(1);
    }
  }

  // ===== Spiel 1: Follow =====
  const listFollow  = document.getElementById('list-follow');
  let followTimes = [], sinceLastReturn = 0, nextThreshold = getRandomThreshold();
  let followTimer, followTime = 30;

  function getRandomThreshold() { return Math.floor(Math.random() * 8) + 7; }

  function createFollowButton() {
    const btn = document.createElement('button');
    btn.className = 'follow-button';
    btn.textContent = 'Follow';
    btn.addEventListener('click', () => {
      const now = btn.classList.toggle('following');
      if (now) {
        followingCount++;
        sinceLastReturn++;
        followTimes.push(Date.now());
        if (sinceLastReturn >= nextThreshold) {
          followersCount++;
          game1Score = followersCount;
          sinceLastReturn = 0;
          nextThreshold = getRandomThreshold();
        }
        btn.style.transform = `translateX(${(Math.random() - 0.5) * 600}px)`;
      } else {
        followingCount = Math.max(0, followingCount - 1);
        btn.style.transform = '';
      }
      btn.textContent = now ? 'Following' : 'Follow';
      updateStats();
    });
    return btn;
  }

  function loadFollowItems(n = 20) {
    for (let i = 0; i < n; i++) {
      listFollow.appendChild(createFollowButton());
    }
  }

  listFollow.addEventListener('scroll', () => {
    if (listFollow.scrollTop + listFollow.clientHeight >= listFollow.scrollHeight - 50) {
      loadFollowItems();
    }
  });

  function initFollowGame() {
    totalScore = game1Score = game2Score = game3Score = 0;
    followTimes = [];
    sinceLastReturn = 0;
    nextThreshold = getRandomThreshold();
    updateStats();
    listFollow.innerHTML = '';
    followTime = 30;
    document.getElementById('timer-follow').textContent = '00:30';
    clearInterval(followTimer);
    followTimer = setInterval(() => {
      followTime--;
      const m = String(Math.floor(followTime / 60)).padStart(2, '0');
      const s = String(followTime % 60).padStart(2, '0');
      document.getElementById('timer-follow').textContent = `${m}:${s}`;
      if (followTime <= 0) {
        clearInterval(followTimer);
        totalScore += game1Score;
        startGame(2);
      }
    }, 1000);
    loadFollowItems();
  }

  // ===== Spiel 2: Hashtag =====
  const baseTags = [
    '#fun', '#cool', '#wow', '#amazing', '#instagood', '#photooftheday',
    '#love', '#happy', '#cute', '#tbt', '#fashion', '#beautiful',
    '#picoftheday', '#nature', '#selfie', '#summer', '#art', '#travel'
  ];
  let hashtagTimer, hashtagTime = 30;
  const hashtagContainer = document.querySelector('#game2-screen .smartphone-container');

  function applyHashtagBonus(text) {
    caption.value += (caption.value ? ' ' : '') + text;
    const bonus = Math.floor(Math.random() * 3) + 1;
    game2Score += bonus;
    followersCount += bonus;
    updateStats();
    for (let i = 0; i < 5; i++) createTag();
  }

  function createTag() {
    const tag = document.createElement('div');
    tag.className = 'hashtag';
    tag.innerText = baseTags[Math.floor(Math.random() * baseTags.length)];

    // Maus-Drag & Touch-Drag kombiniert
    tag.draggable = true;
    tag.addEventListener('dragstart', e => e.dataTransfer.setData('text/plain', tag.innerText));
    tag.addEventListener('click', () => applyHashtagBonus(tag.innerText));

    let offsetX = 0, offsetY = 0;
    tag.addEventListener('touchstart', e => {
      const touch = e.touches[0], rect = tag.getBoundingClientRect();
      offsetX = touch.pageX - rect.left;
      offsetY = touch.pageY - rect.top;
      e.preventDefault();
    }, { passive: false });
    tag.addEventListener('touchmove', e => {
      const touch = e.touches[0];
      tag.style.left = `${touch.pageX - offsetX}px`;
      tag.style.top  = `${touch.pageY - offsetY}px`;
      e.preventDefault();
    }, { passive: false });
    tag.addEventListener('touchend', e => {
      const touch = e.changedTouches[0];
      // Drop prüfen
      const dz = caption.getBoundingClientRect();
      if (
        touch.pageX >= dz.left && touch.pageX <= dz.right &&
        touch.pageY >= dz.top  && touch.pageY <= dz.bottom
      ) {
        applyHashtagBonus(tag.innerText);
        tag.remove();
      }
    });

    // zufällige Bewegung
    tag.vx = (Math.random() - 0.5) * 4;
    tag.vy = (Math.random() - 0.5) * 4;
    const W = hashtagContainer.clientWidth - tag.offsetWidth;
    const H = hashtagContainer.clientHeight - window.innerHeight * 0.2 - tag.offsetHeight;
    tag.style.left = `${Math.random() * W}px`;
    tag.style.top  = `${Math.random() * H}px`;

    hashtagContainer.appendChild(tag);
  }

  function moveHashtags() {
    document.querySelectorAll('.hashtag').forEach(tag => {
      let x = parseFloat(tag.style.left) + tag.vx;
      let y = parseFloat(tag.style.top)  + tag.vy;
      const maxW = hashtagContainer.clientWidth - tag.offsetWidth;
      const maxH = hashtagContainer.clientHeight - window.innerHeight * 0.2 - tag.offsetHeight;
      if (x < 0 || x > maxW) tag.vx *= -1;
      if (y < 0 || y > maxH) tag.vy *= -1;
      tag.style.left = `${Math.max(0, Math.min(maxW, x))}px`;
      tag.style.top  = `${Math.max(0, Math.min(maxH, y))}px`;
    });
  }

  function initHashtagGame() {
    caption.value = '';               // Textbox leeren
    game2Score = 0;
    updateStats();
    hashtagTime = 30;
    document.getElementById('timer-hashtag').textContent = '00:30';
    clearInterval(hashtagTimer);
    clearInterval(window.hashtagInterval);

    hashtagContainer.querySelectorAll('.hashtag').forEach(el => el.remove());
    for (let i = 0; i < 12; i++) createTag();
    window.hashtagInterval = setInterval(moveHashtags, 40);

    caption.addEventListener('dragover', e => e.preventDefault());
    caption.addEventListener('drop', e => {
      e.preventDefault();
      applyHashtagBonus(e.dataTransfer.getData('text/plain'));
    });

    hashtagTimer = setInterval(() => {
      hashtagTime--;
      const m = String(Math.floor(hashtagTime / 60)).padStart(2, '0');
      const s = String(hashtagTime % 60).padStart(2, '0');
      document.getElementById('timer-hashtag').textContent = `${m}:${s}`;
      if (hashtagTime <= 0) {
        clearInterval(hashtagTimer);
        clearInterval(window.hashtagInterval);
        totalScore += game2Score;
        startGame(3);
      }
    }, 1000);
  }

  // ===== Spiel 3: Giveaway =====
const game3Container = game3Screen.querySelector('.smartphone-container');
let game3TimerInt, spawnInt;

function spawnSquare() {
  const sq = document.createElement('div');
  sq.className = 'giveaway-tile';

  // Label mit Pacifico-Font und Glow-Shadow
  const label = document.createElement('span');
  label.className = 'giveaway-label';
  label.textContent = 'giveaway';
  // setze Pacifico aus CSS-Import
  label.style.fontFamily = '"Pacifico", Helvetica, sans-serif';
  label.style.textShadow = '0 0 10px var(--light-gray)';

  // 50% Chance, dass diese Kachel Follower bringt → pink einfärben + Glow
  if (Math.random() < 0.5) {
    sq.dataset.ga = '1';
    label.style.color = 'lightpink';
    label.style.textShadow = '0 0 8px deeppink, 0 0 16px deeppink';
  }

  sq.append(label);

  // Zufällige Position innerhalb Container
  const size = 300;
  const W = game3Container.clientWidth - size;
  const H = game3Container.clientHeight - size;
  sq.style.left = `${Math.random() * W}px`;
  sq.style.top  = `${Math.random() * H}px`;

  // Klick auf Kachel:
  sq.addEventListener('click', () => {
    if (sq.dataset.ga === '1') {
      // Follower-Kachel: Punkte + Bild anzeigen
      game3Score++;
      followersCount++;
      updateStats();
      const img = document.createElement('img');
      img.src = 'follow2.png';
      img.className = 'follow-splash';
      // zentriert über Klick-Position
      const rect = sq.getBoundingClientRect();
      img.style.left = `${rect.left + rect.width/2}px`;
      img.style.top  = `${rect.top  + rect.height/2}px`;
      document.body.appendChild(img);
      // Fade-Out nach 1s
      setTimeout(() => {
        img.classList.add('fade-out');
        img.addEventListener('transitionend', () => img.remove(), { once: true });
      }, 1000);
    }
    // Entferne Kachel sofort
    sq.remove();
  }, { once: true });

  game3Container.appendChild(sq);

  // Non-Follower-Kacheln verschwinden nach 2s
  if (!sq.dataset.ga) {
    setTimeout(() => {
      sq.style.transition = 'opacity 1s';
      sq.style.opacity = '0';
      sq.addEventListener('transitionend', () => {
        if (sq.parentNode) sq.remove();
      }, { once: true });
    }, 2000);
  }
}

function initGame3() {
  game3Score = 0;
  updateStats();
  game3Container.querySelectorAll('.giveaway-tile').forEach(e => e.remove());

  let t = 30;
  document.getElementById('attempts-shell').textContent = '00:30';
  clearInterval(game3TimerInt);
  clearInterval(spawnInt);

  game3TimerInt = setInterval(() => {
    t--;
    const m = String(Math.floor(t / 60)).padStart(2, '0');
    const s = String(t % 60).padStart(2, '0');
    document.getElementById('attempts-shell').textContent = `${m}:${s}`;
    if (t <= 0) {
      clearInterval(game3TimerInt);
      clearInterval(spawnInt);
      promptForNameAndSave(totalScore + game3Score);
    }
  }, 1000);

  // Spawn alle 400ms
  spawnInt = setInterval(spawnSquare, 400);
}




  // ===== Sequenzierung =====
  function startGame(n) {
    showScreen(n === 1 ? 2 : n === 2 ? 3 : n === 3 ? 4 : 1);
    if (n === 1) initFollowGame();
    if (n === 2) initHashtagGame();
    if (n === 3) initGame3();
  }

  startButton.addEventListener('click', () => startGame(1));
  loadHighscores();
  showScreen(1);
});
