// =============================================================
//  公開側スクリプト — Twitter動画保存ランキング
//  データ取得: data.json (GitHub Pages上のファイル)
// =============================================================

const PREVIEW_SECONDS_DEFAULT = 3;
const RANK_COUNT = 30;
const INLINE_SETS = 6;

// =============================================================
//  ★ デフォルト表示動画（data.jsonが空・取得失敗時に表示）
// =============================================================
const DEFAULT_VIDEOS = [
    { xUrl: 'https://x.com/NASA/status/1234567890', previewSrc: 'https://www.w3schools.com/html/mov_bbb.mp4', user: '@travelwith_yuki', avatar: 'https://i.pravatar.cc/150?img=1', caption: '夕暮れの海岸線 🌅 #travel #sunset', views: '248K', likes: '18.2K' },
    { xUrl: 'https://x.com/NASA/status/2345678901', previewSrc: 'https://www.w3schools.com/html/movie.mp4', user: '@daily_food_jp', avatar: 'https://i.pravatar.cc/150?img=5', caption: '自家製ラーメン🍜 6時間煮込み #料理', views: '512K', likes: '41.0K' },
    { xUrl: 'https://x.com/NASA/status/3456789012', previewSrc: 'https://www.w3schools.com/html/mov_bbb.mp4', user: '@kento_vlog', avatar: 'https://i.pravatar.cc/150?img=8', caption: '東京の朝 🏙️ 誰もいない渋谷交差点！', views: '1.1M', likes: '95.3K' },
    { xUrl: 'https://x.com/NASA/status/4567890123', previewSrc: 'https://www.w3schools.com/html/movie.mp4', user: '@sakura_dance', avatar: 'https://i.pravatar.cc/150?img=12', caption: '新しいルーティン練習💃 #dance', views: '763K', likes: '62.7K' },
    { xUrl: 'https://x.com/NASA/status/5678901234', previewSrc: 'https://www.w3schools.com/html/mov_bbb.mp4', user: '@nature_shots', avatar: 'https://i.pravatar.cc/150?img=17', caption: '富士山の朝焼け🗻 #富士山', views: '329K', likes: '27.4K' },
    { xUrl: 'https://x.com/NASA/status/6789012345', previewSrc: 'https://www.w3schools.com/html/movie.mp4', user: '@tech_shorts', avatar: 'https://i.pravatar.cc/150?img=22', caption: '3分でわかるAI入門⚡ #tech', views: '894K', likes: '73.1K' },
    { xUrl: 'https://x.com/NASA/status/7890123456', previewSrc: 'https://www.w3schools.com/html/mov_bbb.mp4', user: '@cat_diary', avatar: 'https://i.pravatar.cc/150?img=32', caption: '今日もかわいすぎる🐱 #猫', views: '2.4M', likes: '198K' },
    { xUrl: 'https://x.com/NASA/status/8901234567', previewSrc: 'https://www.w3schools.com/html/movie.mp4', user: '@street_photo', avatar: 'https://i.pravatar.cc/150?img=44', caption: '路地裏の光と影 📷 #Tokyo', views: '417K', likes: '33.8K' },
    { xUrl: 'https://x.com/NASA/status/9012345678', previewSrc: 'https://www.w3schools.com/html/mov_bbb.mp4', user: '@morning_run', avatar: 'https://i.pravatar.cc/150?img=50', caption: '毎朝5kmランニング🏃 #朝活', views: '183K', likes: '14.9K' },
    { xUrl: 'https://x.com/NASA/status/1012345678', previewSrc: 'https://www.w3schools.com/html/movie.mp4', user: '@art_studio_ai', avatar: 'https://i.pravatar.cc/150?img=60', caption: 'AI生成アート✨ #AIart', views: '605K', likes: '51.2K' },
    { xUrl: 'https://x.com/NASA/status/1112345678', previewSrc: 'https://www.w3schools.com/html/mov_bbb.mp4', user: '@gaming_jp', avatar: 'https://i.pravatar.cc/150?img=11', caption: '神プレイ集🎮 #gaming', views: '1.8M', likes: '142K' },
    { xUrl: 'https://x.com/NASA/status/1212345678', previewSrc: 'https://www.w3schools.com/html/movie.mp4', user: '@fashion_tokyo', avatar: 'https://i.pravatar.cc/150?img=25', caption: '今日のコーデ👗 #fashion', views: '376K', likes: '30.1K' },
    { xUrl: 'https://x.com/NASA/status/1312345678', previewSrc: 'https://www.w3schools.com/html/mov_bbb.mp4', user: '@science_clip', avatar: 'https://i.pravatar.cc/150?img=15', caption: '身近な科学の不思議🔬 #science', views: '940K', likes: '77.5K' },
    { xUrl: 'https://x.com/NASA/status/1412345678', previewSrc: 'https://www.w3schools.com/html/movie.mp4', user: '@dog_happy', avatar: 'https://i.pravatar.cc/150?img=33', caption: 'ドッグランで大はしゃぎ🐕 #犬', views: '1.2M', likes: '98.0K' },
    { xUrl: 'https://x.com/NASA/status/1512345678', previewSrc: 'https://www.w3schools.com/html/mov_bbb.mp4', user: '@music_cover', avatar: 'https://i.pravatar.cc/150?img=40', caption: '弾き語り🎸 人気曲アレンジ #music', views: '559K', likes: '45.3K' },
    { xUrl: 'https://x.com/NASA/status/1612345678', previewSrc: 'https://www.w3schools.com/html/movie.mp4', user: '@workout_daily', avatar: 'https://i.pravatar.cc/150?img=48', caption: '自宅10分筋トレ💪 #workout', views: '712K', likes: '58.9K' },
    { xUrl: 'https://x.com/NASA/status/1712345678', previewSrc: 'https://www.w3schools.com/html/mov_bbb.mp4', user: '@kyoto_trip', avatar: 'https://i.pravatar.cc/150?img=58', caption: '京都の早朝散歩🌸 金閣寺 #京都', views: '488K', likes: '39.7K' },
    { xUrl: 'https://x.com/NASA/status/1812345678', previewSrc: 'https://www.w3schools.com/html/movie.mp4', user: '@comedy_jp', avatar: 'https://i.pravatar.cc/150?img=3', caption: '思わず笑った😂 #おもしろ', views: '3.1M', likes: '254K' },
    { xUrl: 'https://x.com/NASA/status/1912345678', previewSrc: 'https://www.w3schools.com/html/mov_bbb.mp4', user: '@diy_craft', avatar: 'https://i.pravatar.cc/150?img=20', caption: '廃材リメイクで部屋がおしゃれに✨ #DIY', views: '283K', likes: '22.6K' },
    { xUrl: 'https://x.com/NASA/status/2012345678', previewSrc: 'https://www.w3schools.com/html/movie.mp4', user: '@sky_watch', avatar: 'https://i.pravatar.cc/150?img=27', caption: '天の川が肉眼で見えた🌟 #星空', views: '1.5M', likes: '121K' },
    { xUrl: 'https://x.com/NASA/status/2112345678', previewSrc: 'https://www.w3schools.com/html/mov_bbb.mp4', user: '@cooking_easy', avatar: 'https://i.pravatar.cc/150?img=36', caption: '5分で絶品パスタ🍝 材料3つ！ #料理', views: '822K', likes: '67.4K' },
    { xUrl: 'https://x.com/NASA/status/2212345678', previewSrc: 'https://www.w3schools.com/html/movie.mp4', user: '@bike_life', avatar: 'https://i.pravatar.cc/150?img=42', caption: 'ロードバイクで山越え🚴 #cycling', views: '197K', likes: '15.8K' },
    { xUrl: 'https://x.com/NASA/status/2312345678', previewSrc: 'https://www.w3schools.com/html/mov_bbb.mp4', user: '@baby_smiles', avatar: 'https://i.pravatar.cc/150?img=46', caption: 'この笑顔に癒される😊 #育児', views: '2.7M', likes: '231K' },
    { xUrl: 'https://x.com/NASA/status/2412345678', previewSrc: 'https://www.w3schools.com/html/movie.mp4', user: '@manga_draw', avatar: 'https://i.pravatar.cc/150?img=53', caption: 'キャラクター描き方講座🖊️ #イラスト', views: '634K', likes: '52.1K' },
    { xUrl: 'https://x.com/NASA/status/2512345678', previewSrc: 'https://www.w3schools.com/html/mov_bbb.mp4', user: '@drone_view', avatar: 'https://i.pravatar.cc/150?img=56', caption: 'ドローンで撮影した日本🗾 #drone', views: '1.9M', likes: '156K' },
    { xUrl: 'https://x.com/NASA/status/2612345678', previewSrc: 'https://www.w3schools.com/html/movie.mp4', user: '@plant_life', avatar: 'https://i.pravatar.cc/150?img=62', caption: '多肉植物の育て方🌵 #植物', views: '145K', likes: '11.2K' },
    { xUrl: 'https://x.com/NASA/status/2712345678', previewSrc: 'https://www.w3schools.com/html/mov_bbb.mp4', user: '@magic_trick', avatar: 'https://i.pravatar.cc/150?img=64', caption: '種明かし付き手品🃏 #マジック', views: '4.2M', likes: '345K' },
    { xUrl: 'https://x.com/NASA/status/2812345678', previewSrc: 'https://www.w3schools.com/html/movie.mp4', user: '@surf_wave', avatar: 'https://i.pravatar.cc/150?img=67', caption: '湘南でサーフィン🏄 #surf', views: '358K', likes: '28.9K' },
    { xUrl: 'https://x.com/NASA/status/2912345678', previewSrc: 'https://www.w3schools.com/html/mov_bbb.mp4', user: '@night_city', avatar: 'https://i.pravatar.cc/150?img=70', caption: '夜の新宿タイムラプス📽️ #夜景', views: '1.1M', likes: '89.4K' },
    { xUrl: 'https://x.com/NASA/status/3012345678', previewSrc: 'https://www.w3schools.com/html/movie.mp4', user: '@sweets_lab', avatar: 'https://i.pravatar.cc/150?img=9', caption: '映えすぎるクレープ🍓 レシピ公開 #スイーツ', views: '687K', likes: '55.7K' },
];

// =============================================================
//  GitHub blob URL → raw URL 自動変換
// =============================================================
function toRawUrl(url) {
    if (!url) return url;
    return url.replace(
        /https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.*)/,
        'https://raw.githubusercontent.com/$1/$2/$3/$4'
    );
}

// =============================================================
//  data.json の読み込み
// =============================================================
let _cachedData = null;

async function loadData() {
    if (_cachedData) return _cachedData;
    try {
        const res = await fetch('https://raw.githubusercontent.com/DenpxyRoll/x-twitter-video-ranking/main/data.json?_=' + Date.now());
        if (!res.ok) throw new Error('fetch failed');
        _cachedData = await res.json();
        return _cachedData;
    } catch {
        return null;
    }
}

function getVideos(cat, stored) {
    const entries = stored?.[cat];
    if (entries) {
        const filtered = entries
            .map((e, i) => {
                if (!e.xUrl?.trim()) return null;
                const urlMatch = e.xUrl.match(/(?:x\.com|twitter\.com)\/([^/]+)\/status/);
                const autoUser = urlMatch ? '@' + urlMatch[1] : '@unknown';
                return {
                    rank: i + 1,
                    xUrl: e.xUrl,
                    previewSrc: toRawUrl(e.previewSrc || ''),
                    user: e.user?.trim() || autoUser,
                    avatar: '',
                    caption: '', views: '', likes: '',
                    startTime: parseFloat(e.startTime) || 0,
                    endTime: (e.endTime !== '' && e.endTime !== undefined && parseFloat(e.endTime) > 0)
                        ? parseFloat(e.endTime)
                        : null, // null = 動画全体をループ再生
                };
            })
            .filter(Boolean);
        if (filtered.length > 0) return filtered;
    }
    return DEFAULT_VIDEOS.map((v, i) => ({
        rank: i + 1, ...v,
        startTime: 0,
        endTime: PREVIEW_SECONDS_DEFAULT,
    }));
}

// =============================================================
//  バナー
// =============================================================
function initFloatingBanners(stored) {
    initBanner('bannerTopRight', stored?.banners?.topRight);
    initBanner('bannerBottomCenter', stored?.banners?.bottomCenter);
    initPopup(stored?.banners?.popup);
}

function initBanner(id, cfg) {
    const el = document.getElementById(id);
    if (!el || !cfg?.enabled || !cfg.htmlCode?.trim()) {
        if (el) el.style.display = 'none';
        return;
    }
    el.style.display = 'block';
    el.innerHTML = cfg.htmlCode + `<button class="banner-close" onclick="this.parentElement.style.display='none'" aria-label="閉じる">✕</button>`;
}

// =============================================================
//  年齢確認ゲート
// =============================================================
(function initAgeGate() {
    const gate = document.getElementById('ageGate');
    const btnYes = document.getElementById('ageYes');
    const btnNo = document.getElementById('ageNo');
    if (!gate) return;

    if (sessionStorage.getItem('ageVerified') === '1') {
        gate.style.display = 'none';
        return;
    }

    btnYes?.addEventListener('click', () => {
        sessionStorage.setItem('ageVerified', '1');
        gate.style.opacity = '0';
        gate.style.transition = 'opacity 0.3s';
        setTimeout(() => { gate.style.display = 'none'; }, 300);
    });

    btnNo?.addEventListener('click', () => {
        location.href = 'https://www.google.com';
    });
})();

let _popupShown = false;

function initPopup(cfg) {
    if (_popupShown) return;
    const overlay = document.getElementById('popupOverlay');
    const content = document.getElementById('popupContent');
    if (!overlay || !content || !cfg?.enabled || !cfg.htmlCode?.trim()) return;

    const delay = (parseFloat(cfg.delay) || 0) * 1000;
    setTimeout(() => {
        content.innerHTML = cfg.htmlCode;
        overlay.style.display = 'flex';
        _popupShown = true;
    }, delay);

    document.getElementById('popupClose')?.addEventListener('click', () => {
        overlay.style.display = 'none';
    });
    overlay.addEventListener('click', evt => {
        if (evt.target === overlay) overlay.style.display = 'none';
    });
}

function buildInlineBannerRow(setIndex, stored) {
    const inline = stored?.banners?.inline;
    const set = inline?.[setIndex];
    const leftHtml = set?.left?.enabled && set?.left?.htmlCode?.trim() ? set.left.htmlCode : '';
    const rightHtml = set?.right?.enabled && set?.right?.htmlCode?.trim() ? set.right.htmlCode : '';

    if (!leftHtml && !rightHtml) return null;

    const row = document.createElement('div');
    row.className = 'inline-banner-row';
    row.innerHTML = `
    <div class="inline-banner-cell">${leftHtml}</div>
    <div class="inline-banner-cell">${rightHtml}</div>
  `;
    return row;
}

// =============================================================
//  カードHTML生成
// =============================================================
function rankLabel(rank) {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return rank;
}

function buildCard(video, uid) {
    const hasPreview = video.previewSrc?.trim() !== '';
    const top3Class = video.rank <= 3 ? 'rank-top3' : '';

    const card = document.createElement('div');
    card.className = 'video-card';
    card.dataset.uid = uid;
    card.dataset.xUrl = video.xUrl;

    card.innerHTML = `
    <div class="video-thumb">
      ${hasPreview ? `<video src="${e(video.previewSrc)}" muted playsinline loop preload="metadata"></video>` : ''}
      <div class="play-overlay" id="po-${uid}">
        <div class="play-icon">
          <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        </div>
      </div>
      ${hasPreview ? `<div class="preview-bar" id="pb-${uid}"></div>` : ''}
      <div class="rank-badge ${top3Class}">${rankLabel(video.rank)}</div>
      <div class="x-badge" aria-label="Xで見る">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
      </div>
    </div>
    <div class="card-info">
      <div class="card-user">
        <img class="avatar" src="${e(video.avatar)}" alt="${e(video.user)}" loading="lazy" />
        <span class="user-name">${e(video.user)}</span>
      </div>
      ${video.caption ? `<p class="card-caption">${e(video.caption)}</p>` : ''}
      <div class="card-meta">
        ${video.views ? `<span class="meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>${e(video.views)}</span>` : ''}
        ${video.likes ? `<span class="meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>${e(video.likes)}</span>` : ''}
      </div>
    </div>
  `;
    return card;
}

// =============================================================
//  グリッド描画（非同期）
// =============================================================
const gridWrapper = document.getElementById('gridWrapper');
let cardMap = {};

async function renderGrid(cat) {
    Object.values(cardMap).forEach(({ card }) => observer.unobserve(card));
    gridWrapper.innerHTML = '<p class="empty-msg">読み込み中...</p>';
    cardMap = {};

    const stored = await loadData();
    initFloatingBanners(stored);

    const videos = getVideos(cat, stored);

    gridWrapper.innerHTML = '';

    if (videos.length === 0) {
        gridWrapper.innerHTML = '<p class="empty-msg">この期間の動画はまだありません。</p>';
        return;
    }

    for (let groupIdx = 0; groupIdx < INLINE_SETS; groupIdx++) {
        const start = groupIdx * 5;
        const chunk = videos.slice(start, start + 5);
        if (chunk.length === 0) break;

        const subGrid = document.createElement('div');
        subGrid.className = 'video-grid';
        gridWrapper.appendChild(subGrid);

        chunk.forEach(video => {
            const uid = `v${video.rank}`;
            const card = buildCard(video, uid);
            subGrid.appendChild(card);
            cardMap[uid] = {
                card, video,
                videoEl: card.querySelector('video'),
                overlay: document.getElementById(`po-${uid}`),
                bar: document.getElementById(`pb-${uid}`),
                timer: null, rafId: null,
            };
            observer.observe(card);
        });

        const bannerRow = buildInlineBannerRow(groupIdx, stored);
        if (bannerRow) gridWrapper.appendChild(bannerRow);
    }
}

// =============================================================
//  プレビュー（startTime〜endTime）
// =============================================================
function startPreview(uid) {
    const it = cardMap[uid];
    if (!it?.videoEl) return;
    stopPreview(uid);

    const { videoEl, overlay, bar, video } = it;
    const startT = video.startTime ?? 0;
    const endT = video.endTime; // null = 動画全体モード

    videoEl.preload = 'auto';
    videoEl.load();
    videoEl.currentTime = startT;
    videoEl.play().catch(() => { });
    if (overlay) overlay.classList.add('hidden');

    if (endT === null) {
        // ── 全体再生モード: loop属性でループ、プログレスバーは実時間で更新 ──
        function tickFull() {
            if (videoEl.duration > 0) {
                const progress = (videoEl.currentTime / videoEl.duration) * 100;
                if (bar) bar.style.width = Math.min(progress, 100) + '%';
            }
            it.rafId = requestAnimationFrame(tickFull);
        }
        it.rafId = requestAnimationFrame(tickFull);
    } else {
        // ── 指定時間モード: startTime〜endTime を繰り返す ──
        const dur = Math.max((endT - startT) * 1000, 500);
        let loopT0 = performance.now();
        function tick(now) {
            const elapsed = now - loopT0;
            const progress = Math.min(elapsed / dur, 1) * 100;
            if (bar) bar.style.width = progress + '%';
            if (elapsed < dur) {
                it.rafId = requestAnimationFrame(tick);
            } else {
                videoEl.currentTime = startT;
                loopT0 = performance.now();
                if (bar) bar.style.width = '0%';
                it.rafId = requestAnimationFrame(tick);
            }
        }
        it.rafId = requestAnimationFrame(tick);
    }
}

function stopPreview(uid) {
    const it = cardMap[uid];
    if (!it) return;
    if (it.rafId) { cancelAnimationFrame(it.rafId); it.rafId = null; }
    if (it.timer) { clearTimeout(it.timer); it.timer = null; }
    if (it.videoEl) { it.videoEl.pause(); it.videoEl.currentTime = it.video.startTime ?? 0; }
    if (it.overlay) it.overlay.classList.remove('hidden');
    if (it.bar) it.bar.style.width = '0%';
}

// =============================================================
//  IntersectionObserver
// =============================================================
const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        const uid = entry.target.dataset.uid;
        if (entry.isIntersecting) {
            if (cardMap[uid]) {
                cardMap[uid].timer = setTimeout(() => {
                    const r = entry.target.getBoundingClientRect();
                    if (r.top < window.innerHeight && r.bottom > 0) startPreview(uid);
                }, 50);
            }
        } else {
            stopPreview(uid);
        }
    });
}, { threshold: 0.1 });

// =============================================================
//  カードクリック → Xへ遷移
// =============================================================
gridWrapper.addEventListener('click', evt => {
    const card = evt.target.closest('.video-card');
    if (!card) return;
    const url = card.dataset.xUrl;
    if (url) {
        if (typeof gtag !== 'undefined') {
            gtag('event', 'video_click', {
                rank: card.dataset.uid,
                video_url: url,
                category: document.querySelector('.filter-btn.active')?.dataset.filter || 'today',
            });
        }
        window.open(url, '_blank', 'noopener,noreferrer');
    }
});

// =============================================================
//  フィルターボタン
// =============================================================
const filterBtns = document.querySelectorAll('.filter-btn');
const titleMap = {
    today: '1日の人気動画', week: '1週間の人気動画',
    month: '1ヶ月の人気動画', alltime: '殿堂入り動画',
};

filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('sectionTitle').textContent = titleMap[btn.dataset.filter] || '';
        renderGrid(btn.dataset.filter);
    });
});

function e(str) {
    return String(str || '')
        .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
        .replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// =============================================================
//  初期表示
// =============================================================
renderGrid('today');
