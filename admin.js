// =============================================================
//  ハッシュ化された管理者パスワード（SHA-256）
//  変更方法: https://emn178.github.io/online-tools/sha256.html
// =============================================================
const ADMIN_PASSWORD_HASH = '8d16af78755e40dc37eb58e0bd4540d416b34bd2f56b5b1a79935ac49c004893';

async function sha256(str) {
  const buf = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const CATEGORIES = [
  { key: 'today', label: '１日' },
  { key: 'week', label: '１週間' },
  { key: 'month', label: '１ヶ月' },
  { key: 'alltime', label: '殿堂入り' },
];
const RANK_COUNT = 30;
const INLINE_SETS = 6;
const GITHUB_SETTINGS_KEY = 'tvGithubSettings';

// =============================================================
//  GitHub設定の読み書き（localStorageに保存）
// =============================================================
function loadGithubSettings() {
  try {
    const raw = localStorage.getItem(GITHUB_SETTINGS_KEY);
    return raw ? JSON.parse(raw) : { owner: 'DenpxyRoll', repo: '', branch: 'main', pat: '' };
  } catch { return { owner: 'DenpxyRoll', repo: '', branch: 'main', pat: '' }; }
}

function saveGithubSettings(settings) {
  localStorage.setItem(GITHUB_SETTINGS_KEY, JSON.stringify(settings));
}

// =============================================================
//  データ初期化
// =============================================================
function emptyVideoEntry() {
  return { xUrl: '', previewSrc: '', user: '', startTime: '', endTime: '' };
}
function emptyBannerSlot() {
  return { htmlCode: '', enabled: false };
}
function emptyInlineSet() {
  return { left: emptyBannerSlot(), right: emptyBannerSlot() };
}

function emptyData() {
  const d = {
    banners: {
      topRight: emptyBannerSlot(),
      bottomCenter: emptyBannerSlot(),
      popup: { htmlCode: '', enabled: false, delay: 1 },
      inline: Array.from({ length: INLINE_SETS }, emptyInlineSet),
    }
  };
  CATEGORIES.forEach(c => {
    d[c.key] = Array.from({ length: RANK_COUNT }, emptyVideoEntry);
  });
  return d;
}

// =============================================================
//  data.json の読み込み（GitHub Pages から fetch）
// =============================================================
async function loadData() {
  try {
    const res = await fetch('data.json?_=' + Date.now());
    if (!res.ok) throw new Error('fetch failed');
    const parsed = await res.json();
    const def = emptyData();

    CATEGORIES.forEach(c => {
      if (!parsed[c.key]) parsed[c.key] = def[c.key];
      while (parsed[c.key].length < RANK_COUNT) parsed[c.key].push(emptyVideoEntry());
      parsed[c.key] = parsed[c.key].map(e => ({ ...emptyVideoEntry(), ...e }));
    });

    if (!parsed.banners) parsed.banners = def.banners;
    parsed.banners.topRight = { ...emptyBannerSlot(), ...parsed.banners.topRight };
    parsed.banners.bottomCenter = { ...emptyBannerSlot(), ...parsed.banners.bottomCenter };
    parsed.banners.popup = { ...def.banners.popup, ...parsed.banners.popup };
    if (!parsed.banners.inline || parsed.banners.inline.length < INLINE_SETS) {
      parsed.banners.inline = Array.from({ length: INLINE_SETS }, (_, i) =>
        parsed.banners.inline?.[i]
          ? {
            left: { ...emptyBannerSlot(), ...parsed.banners.inline[i].left },
            right: { ...emptyBannerSlot(), ...parsed.banners.inline[i].right }
          }
          : emptyInlineSet()
      );
    }
    return parsed;
  } catch {
    return emptyData();
  }
}

// =============================================================
//  GitHub API で data.json を更新
// =============================================================
async function saveDataToGitHub(dataObj) {
  const settings = loadGithubSettings();
  const { owner, repo, branch, pat } = settings;

  if (!owner || !repo || !pat) {
    throw new Error('GitHub設定（リポジトリ名・PAT）が未入力です。\n画面上の「GitHub設定」欄を入力してください。');
  }

  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/data.json`;

  // 現在のファイルのSHAを取得（更新に必要）
  let sha = null;
  try {
    const getRes = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${pat}`,
        'Accept': 'application/vnd.github+json',
      }
    });
    if (getRes.ok) {
      const getJson = await getRes.json();
      sha = getJson.sha;
    }
  } catch { /* ファイルが存在しない場合は新規作成 */ }

  const content = btoa(unescape(encodeURIComponent(JSON.stringify(dataObj, null, 2))));

  const body = {
    message: `[管理画面] data.json を更新 ${new Date().toLocaleString('ja-JP')}`,
    content,
    branch,
    ...(sha ? { sha } : {}),
  };

  const putRes = await fetch(apiUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${pat}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!putRes.ok) {
    const errJson = await putRes.json().catch(() => ({}));
    throw new Error(`GitHub APIエラー: ${putRes.status} ${errJson.message || ''}`);
  }

  return await putRes.json();
}

// =============================================================
//  ログイン
// =============================================================
const loginScreen = document.getElementById('loginScreen');
const adminApp = document.getElementById('adminApp');
const pwInput = document.getElementById('passwordInput');
const loginBtn = document.getElementById('loginBtn');
const loginError = document.getElementById('loginError');

async function tryLogin() {
  const hash = await sha256(pwInput.value);
  if (hash === ADMIN_PASSWORD_HASH) {
    loginScreen.style.display = 'none';
    adminApp.style.display = 'block';
    sessionStorage.setItem('adminLoggedIn', '1');
    await initAdmin();
  } else {
    loginError.style.display = 'block';
    pwInput.value = '';
    pwInput.focus();
  }
}
loginBtn.addEventListener('click', tryLogin);
pwInput.addEventListener('keydown', e => { if (e.key === 'Enter') tryLogin(); });

if (sessionStorage.getItem('adminLoggedIn') === '1') {
  loginScreen.style.display = 'none';
  adminApp.style.display = 'block';
  initAdmin();
}

document.getElementById('logoutBtn').addEventListener('click', () => {
  sessionStorage.removeItem('adminLoggedIn');
  location.reload();
});

// =============================================================
//  初期化（ログイン後）
// =============================================================
let data = emptyData();

async function initAdmin() {
  showToast('⏳ データを読み込み中...');
  data = await loadData();
  renderGithubSettings();
  renderCurrentTab();
  showToast('✅ データを読み込みました！');
}

// =============================================================
//  タブ切り替え
// =============================================================
let currentCat = 'today';
let currentMode = 'videos';

const catTabs = document.querySelectorAll('.cat-tab');
const modeTabs = document.querySelectorAll('.mode-tab');

catTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    catTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentCat = tab.dataset.cat;
    renderCurrentTab();
  });
});

modeTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    modeTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentMode = tab.dataset.mode;
    const catRow = document.getElementById('catTabRow');
    catRow.style.display = (currentMode === 'banners' || currentMode === 'github') ? 'none' : 'flex';
    renderCurrentTab();
  });
});

// =============================================================
//  描画
// =============================================================
const rankList = document.getElementById('rankList');

function renderCurrentTab() {
  if (currentMode === 'videos') renderVideos();
  else if (currentMode === 'banners') renderBanners();
  else if (currentMode === 'github') renderGithubSettings();
}

/* ---- GitHub設定タブ ---- */
function renderGithubSettings() {
  const settings = loadGithubSettings();
  rankList.innerHTML = `
    <div class="banner-section" style="border:2px solid #1d9bf0;">
      <h3 class="banner-title">⚙️ GitHub設定</h3>
      <p style="font-size:12px;color:#666;margin-bottom:16px;">
        管理画面で「保存する」を押すと、GitHubの <code>data.json</code> が自動更新されます。<br>
        PATは <a href="https://github.com/settings/tokens" target="_blank" style="color:#1d9bf0;">github.com/settings/tokens</a> で作成してください（権限：Contents Read & Write）。
      </p>
      <div class="banner-fields">
        <label>GitHubユーザー名</label>
        <input type="text" id="ghOwner" value="${esc(settings.owner)}" placeholder="DenpxyRoll" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:13px;font-family:var(--font);" />
        <label>リポジトリ名</label>
        <input type="text" id="ghRepo" value="${esc(settings.repo)}" placeholder="x-twitter-video-ranking" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:13px;font-family:var(--font);" />
        <label>ブランチ名（通常は main）</label>
        <input type="text" id="ghBranch" value="${esc(settings.branch)}" placeholder="main" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:13px;font-family:var(--font);" />
        <label>Personal Access Token（PAT）</label>
        <input type="password" id="ghPat" value="${esc(settings.pat)}" placeholder="ghp_xxxxxxxxxxxx" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:13px;font-family:var(--font);" />
        <button id="saveGhBtn" style="margin-top:8px;background:#1d9bf0;color:#fff;border:none;border-radius:999px;padding:9px 24px;font-size:13px;font-weight:600;font-family:var(--font);cursor:pointer;">設定を保存</button>
      </div>
    </div>
  `;
  document.getElementById('saveGhBtn').addEventListener('click', () => {
    const s = {
      owner: document.getElementById('ghOwner').value.trim(),
      repo: document.getElementById('ghRepo').value.trim(),
      branch: document.getElementById('ghBranch').value.trim() || 'main',
      pat: document.getElementById('ghPat').value.trim(),
    };
    saveGithubSettings(s);
    showToast('✅ GitHub設定を保存しました！');
  });
}

/* ---- 通常動画行 ---- */
function renderVideos() {
  rankList.innerHTML = '';
  const entries = data[currentCat];

  const header = document.createElement('div');
  header.className = 'table-header';
  header.innerHTML = `
    <span>順位</span>
    <span>X 投稿URL（クリック先）</span>
    <span>プレビュー動画URL（任意）</span>
    <span>@ユーザー名</span>
    <span>開始(秒)</span>
    <span>終了(秒)</span>
    <span>状態</span>
  `;
  rankList.appendChild(header);

  for (let i = 0; i < RANK_COUNT; i++) {
    const rank = i + 1;
    const entry = entries[i];
    const hasUrl = entry.xUrl.trim() !== '';

    const row = document.createElement('div');
    row.className = 'rank-row';
    row.innerHTML = `
      <div class="rank-num ${rank <= 3 ? 'top3' : ''}">${rank}</div>
      <input type="text" class="xurl-input ${hasUrl ? 'active-url' : ''}"
        placeholder="https://x.com/username/status/..."
        value="${esc(entry.xUrl)}" data-index="${i}" data-field="xUrl" />
      <div class="preview-field">
        <input type="text" class="preview-input"
          placeholder="動画 URL（右のボタンで自動取得）"
          value="${esc(entry.previewSrc)}" data-index="${i}" data-field="previewSrc" />
        <button class="fetch-btn" data-fetch-index="${i}" title="X URLから動画 URLを自動取得">⚡ 取得</button>
      </div>
      <input type="text"
        placeholder="@ユーザー名"
        value="${esc(entry.user)}" data-index="${i}" data-field="user" />
      <input type="number" class="time-input" min="0" step="0.5"
        placeholder="0" value="${esc(entry.startTime)}" data-index="${i}" data-field="startTime" />
      <input type="number" class="time-input" min="0" step="0.5"
        placeholder="3" value="${esc(entry.endTime)}" data-index="${i}" data-field="endTime" />
      <div class="row-status ${hasUrl ? 'ok' : ''}">${hasUrl ? '✓ 設定済' : '未設定'}</div>
    `;
    rankList.appendChild(row);

    if (rank % 5 === 0 && rank < RANK_COUNT) {
      const sep = document.createElement('div');
      sep.className = 'banner-separator';
      sep.textContent = `▼ ${rank}位後のインラインバナー（${rank / 5}セット目）→「バナー広告」タブで設定`;
      rankList.appendChild(sep);
    }
  }

  bindInputs(rankList, (idx, field, val) => {
    data[currentCat][idx][field] = val;
    if (field === 'xUrl') refreshStatus(rankList, idx, val);
  });

  rankList.querySelectorAll('.fetch-btn').forEach(btn => {
    btn.addEventListener('click', () => fetchVideoUrl(parseInt(btn.dataset.fetchIndex, 10)));
  });
}

/* ---- X 動画 URL 自動取得 ---- */
async function fetchVideoUrl(idx) {
  const xUrl = data[currentCat][idx].xUrl.trim();
  if (!xUrl) { alert('先に X の投稿 URL を入力してください。'); return; }

  const match = xUrl.match(/status\/([0-9]+)/);
  if (!match) { alert('正しい X の投稿 URL を入力してください。'); return; }
  const tweetId = match[1];

  const rows = rankList.querySelectorAll('.rank-row');
  const fetchBtn = rows[idx]?.querySelector('.fetch-btn');
  if (fetchBtn) { fetchBtn.textContent = '取得中...'; fetchBtn.disabled = true; }

  try {
    const res = await fetch(`https://api.vxtwitter.com/Twitter/status/${tweetId}`);
    const json = await res.json();

    const media = json.media_extended || [];
    const video = media.find(m => m.type === 'video' || m.type === 'gif');
    const videoUrl = video?.url || '';

    if (!videoUrl) {
      alert('動画 URL を取得できませんでした。\nこのツイートに動画がないかもしれません。');
      return;
    }

    const pureUrl = videoUrl.split('?')[0];
    data[currentCat][idx].previewSrc = pureUrl;

    const previewInput = rows[idx]?.querySelector('.preview-input');
    if (previewInput) previewInput.value = pureUrl;

    showToast('✅ 動画 URL を取得しました！');
  } catch {
    alert('取得に失敗しました。ネットワークを確認してください。');
  } finally {
    if (fetchBtn) { fetchBtn.textContent = '⚡ 取得'; fetchBtn.disabled = false; }
  }
}

/* ---- バナー設定 ---- */
function renderBanners() {
  rankList.innerHTML = '';

  const pu = data.banners.popup;
  rankList.innerHTML += `
    <div class="banner-section" style="border: 2px solid #a855f7;">
      <h3 class="banner-title">🎯 ポップアップ広告（ページを開いた瞬間に表示）</h3>
      <div class="banner-fields">
        <label>HTMLコード <span class="hint-text">(&lt;a href="..."&gt;&lt;img ...&gt;&lt;/a&gt; をそのまま貼り付け）</span></label>
        <textarea data-key="popup-html" placeholder='&lt;a href="https://..." target="_blank"&gt;&lt;img src="https://..." border="0"&gt;&lt;/a&gt;' rows="3">${esc(pu.htmlCode)}</textarea>
        <label>表示までの秒数（0=即時）</label>
        <input type="number" id="popupDelay" min="0" max="10" step="0.5" value="${pu.delay ?? 1}" style="width:100px;padding:7px 10px;border:1px solid var(--border);border-radius:8px;font-size:13px;font-family:var(--font);" />
        <label class="toggle-label">
          <input type="checkbox" data-key-check="popup-enabled" ${pu.enabled ? 'checked' : ''} />
          表示する
        </label>
      </div>
    </div>
  `;

  rankList.innerHTML += bannerSlotHtml('floating-tr', '📌 右上バナー（固定表示）', data.banners.topRight);
  rankList.innerHTML += bannerSlotHtml('floating-bc', '📌 中央下バナー（固定表示）', data.banners.bottomCenter);

  for (let i = 0; i < INLINE_SETS; i++) {
    const rankEnd = (i + 1) * 5;
    const set = data.banners.inline[i];
    rankList.innerHTML += `
      <div class="banner-section">
        <h3 class="banner-title">📋 インラインバナー ${i + 1}セット目（${rankEnd - 4}〜${rankEnd}位の下）</h3>
        <div class="inline-banner-pair">
          <div class="inline-banner-slot">
            <p class="banner-slot-label">左バナー（300×250）</p>
            ${bannerFieldHtml(`inline-${i}-left`, set.left)}
          </div>
          <div class="inline-banner-slot">
            <p class="banner-slot-label">右バナー（300×250）</p>
            ${bannerFieldHtml(`inline-${i}-right`, set.right)}
          </div>
        </div>
      </div>
    `;
  }

  bindBannerInputs();
}

function bannerSlotHtml(key, title, cfg) {
  return `
    <div class="banner-section">
      <h3 class="banner-title">${title}</h3>
      <div class="banner-fields">
        ${bannerFieldHtml(key, cfg)}
      </div>
    </div>
  `;
}

function bannerFieldHtml(key, cfg) {
  return `
    <label>HTMLコード <span class="hint-text">(&lt;a href="..."&gt;&lt;img ...&gt;&lt;/a&gt; をそのまま貼り付け）</span></label>
    <textarea data-key="${key}" placeholder='&lt;a href="https://..." target="_blank"&gt;&lt;img src="https://..." border="0"&gt;&lt;/a&gt;' rows="3">${esc(cfg.htmlCode)}</textarea>
    <label class="toggle-label">
      <input type="checkbox" data-key-check="${key}" ${cfg.enabled ? 'checked' : ''} />
      表示する
    </label>
  `;
}

function bindBannerInputs() {
  rankList.querySelectorAll('textarea[data-key]').forEach(el => {
    el.addEventListener('input', syncAllBanners);
  });
  rankList.querySelectorAll('input[data-key-check]').forEach(el => {
    el.addEventListener('change', syncAllBanners);
  });
  const delayEl = document.getElementById('popupDelay');
  if (delayEl) delayEl.addEventListener('input', syncAllBanners);
}

function syncAllBanners() {
  const puHtml = rankList.querySelector('textarea[data-key="popup-html"]');
  const puDelay = document.getElementById('popupDelay');
  const puEnabled = rankList.querySelector('input[data-key-check="popup-enabled"]');
  if (puHtml) data.banners.popup.htmlCode = puHtml.value;
  if (puDelay) data.banners.popup.delay = parseFloat(puDelay.value) || 0;
  if (puEnabled) data.banners.popup.enabled = puEnabled.checked;
  setFromKey('floating-tr', (cfg, v, c) => { data.banners.topRight.htmlCode = v; data.banners.topRight.enabled = c; });
  setFromKey('floating-bc', (cfg, v, c) => { data.banners.bottomCenter.htmlCode = v; data.banners.bottomCenter.enabled = c; });
  for (let i = 0; i < INLINE_SETS; i++) {
    setFromKey(`inline-${i}-left`, (cfg, v, c) => { data.banners.inline[i].left.htmlCode = v; data.banners.inline[i].left.enabled = c; });
    setFromKey(`inline-${i}-right`, (cfg, v, c) => { data.banners.inline[i].right.htmlCode = v; data.banners.inline[i].right.enabled = c; });
  }
}

function setFromKey(key, setter) {
  const ta = rankList.querySelector(`textarea[data-key="${key}"]`);
  const chk = rankList.querySelector(`input[data-key-check="${key}"]`);
  if (ta && chk) setter(null, ta.value, chk.checked);
}

// =============================================================
//  共通入力バインド
// =============================================================
function bindInputs(container, onChange) {
  container.querySelectorAll('input[data-field]').forEach(input => {
    input.addEventListener('input', () => {
      onChange(parseInt(input.dataset.index, 10), input.dataset.field, input.value);
    });
  });
}

function refreshStatus(container, idx, val) {
  const rows = container.querySelectorAll('.rank-row');
  const row = rows[idx];
  if (!row) return;
  const hasUrl = val.trim() !== '';
  const urlInput = row.querySelector('.xurl-input');
  if (urlInput) urlInput.classList.toggle('active-url', hasUrl);
  const status = row.querySelector('.row-status');
  if (status) {
    status.textContent = hasUrl ? '✓ 設定済' : '未設定';
    status.className = 'row-status' + (hasUrl ? ' ok' : '');
  }
}

// =============================================================
//  保存（GitHub API）
// =============================================================
document.getElementById('saveAllBtn').addEventListener('click', async () => {
  if (currentMode === 'banners') syncAllBanners();

  const btn = document.getElementById('saveAllBtn');
  btn.textContent = '⏳ 保存中...';
  btn.disabled = true;

  try {
    await saveDataToGitHub(data);
    showToast('✅ GitHubに保存しました！反映まで数秒お待ちください。');
  } catch (err) {
    showToast('❌ 保存失敗: ' + err.message);
    alert('保存に失敗しました。\n\n' + err.message + '\n\n「GitHub設定」タブでリポジトリ名とPATを確認してください。');
  } finally {
    btn.textContent = '💾 保存する';
    btn.disabled = false;
  }
});

// =============================================================
//  Toast
// =============================================================
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
