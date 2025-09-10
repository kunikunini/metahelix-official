// Content-driven site: loads from content.json

const CONTENT_PATH = 'content.json';

async function loadContent() {
  try {
    const res = await fetch(CONTENT_PATH, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to load content.json');
    const data = await res.json();
    renderSite(data);
  } catch (e) {
    console.error(e);
    // Minimal fallback
    document.getElementById('hero-title').textContent = 'AI Music Producer';
  }
}

function normalizeImagePath(p) {
  if (!p) return p;
  const s = String(p);
  if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('data:')) return s;
  if (s.startsWith('image/')) return s;
  if (s.includes('/')) return s; // allow custom subfolders
  return `image/${s}`;
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el && text != null) el.innerHTML = text;
}

function createEl(tag, options = {}) {
  const el = document.createElement(tag);
  if (options.className) el.className = options.className;
  if (options.text) el.textContent = options.text;
  if (options.html) el.innerHTML = options.html;
  if (options.attrs) Object.entries(options.attrs).forEach(([k, v]) => el.setAttribute(k, v));
  return el;
}

function applySectionBackgrounds(images) {
  if (!images) return;
  const setBg = (id, img) => {
    if (!img) return;
    const url = normalizeImagePath(img);
    const el = document.getElementById(id);
    if (!el) return;
    if (id === 'hero') {
      const hasVideo = !!document.querySelector('#hero-media video');
      if (hasVideo) return;
      el.classList.add('has-bg');
      el.style.setProperty('--bg-img', `url(${url})`);
      const media = document.getElementById('hero-media');
      media && media.classList.add('hide');
    } else {
      el.classList.add('has-bg');
      el.style.setProperty('--bg-img', `url(${url})`);
    }
  };

  if (Array.isArray(images)) {
    if (!images.length) return;
    const order = ['hero','about','news','artists','works','video','contact'];
    for (let i = 0; i < order.length; i++) setBg(order[i], images[i % images.length]);
  } else if (typeof images === 'object') {
    Object.entries(images).forEach(([id, img]) => setBg(id, img));
  }
}

function renderHero(hero) {
  if (!hero) return;
  setText('brand-text', hero.brand || 'Producer');
  // Title with duplicated layers and enlarged first/last letters
  const titleEl = document.getElementById('hero-title');
  const tRaw = hero.title || 'AI Music Producer';
  if (titleEl) {
    if (tRaw && tRaw.length >= 2) {
      const first = tRaw[0];
      const middle = tRaw.slice(1, -1);
      const last = tRaw.slice(-1);
      const inner = `<span class="em-first">${first}</span>${middle}<span class="em-last">${last}</span>`;
      titleEl.innerHTML = `<span class="txt">${inner}</span><span class="txt-back" aria-hidden="true">${inner}</span>`;
    } else {
      titleEl.textContent = tRaw;
    }
  }
  setText('hero-subtitle', hero.subtitle || '');

  const media = document.getElementById('hero-media');
  media.innerHTML = '';
  if (hero.backgroundVideo) {
    const v = document.createElement('video');
    v.autoplay = true; v.muted = true; v.playsInline = true; v.loop = true;
    const src = document.createElement('source');
    src.src = hero.backgroundVideo; src.type = hero.backgroundType || 'video/mp4';
    v.appendChild(src);
    media.appendChild(v);
  } else if (hero.backgroundImage && !window.__hasSiteBg) {
    const url = normalizeImagePath(hero.backgroundImage);
    const overlay = 'radial-gradient(1000px 600px at 20% 10%, rgba(0,229,255,.16), transparent), radial-gradient(800px 500px at 80% 10%, rgba(255,47,185,.12), transparent), linear-gradient(180deg, rgba(0,0,0,.1), rgba(0,0,0,.65))';
    media.style.background = `url(${url}) center/cover no-repeat, ${overlay}`;
    media.style.filter = 'saturate(1.06) contrast(1.06)';
  }

  const ct = document.getElementById('hero-ctas');
  ct.innerHTML = '';
  (hero.ctas || []).forEach(b => {
    const a = createEl('a', { className: `btn ${b.variant === 'secondary' ? 'secondary' : ''}` });
    a.href = b.href || '#';
    a.textContent = b.label || 'Learn more';
    a.target = b.target || '_self';
    ct.appendChild(a);
  });
}

function renderAbout(about) {
  if (!about) return;
  setText('about-subtitle', about.subtitle || '');
  setText('about-text', about.html || '');
  const facts = document.getElementById('about-facts');
  facts.innerHTML = '';
  (about.facts || []).forEach(f => {
    const div = createEl('div', { className: 'fact' });
    div.innerHTML = `<strong>${f.label ?? ''}</strong><div>${f.value ?? ''}</div>`;
    facts.appendChild(div);
  });
}

function renderNews(news) {
  if (!news) return;
  setText('news-subtitle', news.subtitle || '');
  const list = document.getElementById('news-list');
  list.innerHTML = '';
  (news.items || []).forEach(n => {
    const li = createEl('li', { className: 'news-item' });
    const date = createEl('div', { className: 'news-date', text: n.date || '' });
    const body = createEl('div');
    const title = createEl('h3', { className: 'news-title' });
    if (n.url) {
      const a = createEl('a', { attrs: { href: n.url, target: n.target || '_blank', rel: 'noopener' } });
      a.textContent = n.title || '';
      title.appendChild(a);
    } else {
      title.textContent = n.title || '';
    }
    const meta = createEl('div', { className: 'card-meta', text: n.summary || '' });
    body.appendChild(title); body.appendChild(meta);
    li.appendChild(date); li.appendChild(body);
    list.appendChild(li);
  });
}

function renderCards(sectionId, data) {
  const grid = document.getElementById(sectionId);
  if (!grid || !data) return;
  grid.innerHTML = '';
  const tagsAfterPlayer = sectionId === 'artists-grid' || sectionId === 'works-grid';
  (data.items || []).forEach(item => {
    const card = createEl('article', { className: 'card' });
    const media = createEl('div', { className: 'card-media' });
    if (item.image) {
      const img = createEl('img', { attrs: { src: normalizeImagePath(item.image), alt: item.title || 'thumbnail' } });
      media.appendChild(img);
    } else if (item.embed) {
      media.innerHTML = item.embed; // trusted input expected from local JSON
    } else {
      media.textContent = 'No Image';
    }
    if (item.badge || item.comingSoon) {
      const b = createEl('div', { className: 'card-badge', text: item.badge || 'coming soon' });
      media.appendChild(b);
    }
    const body = createEl('div', { className: 'card-body' });
    body.appendChild(createEl('h3', { className: 'card-title', text: item.title || '' }));
    if (item.meta) body.appendChild(createEl('div', { className: 'card-meta', text: item.meta }));
    // For artists, move tags below the player to avoid shifting buttons
    if (!tagsAfterPlayer && item.tags && item.tags.length) {
      const chips = createEl('div', { className: 'chip-row' });
      item.tags.forEach(t => chips.appendChild(createEl('span', { className: 'chip', text: t })));
      body.appendChild(chips);
    }
    const actions = createEl('div', { className: 'card-actions' });
    (item.links || []).forEach(l => {
      const a = createEl('a', { className: `btn ${l.variant === 'secondary' ? 'secondary' : ''}`, text: l.label || 'Open' });
      a.href = l.href || '#';
      a.target = l.target || '_blank';
      a.rel = 'noopener';
      actions.appendChild(a);
    });
    card.appendChild(media);
    card.appendChild(body);
    // Buttons first
    if (actions.children.length) card.appendChild(actions);
    // Optional embedded player placed under buttons; no placeholder to avoid empty space
    if (item.player && item.player.spotify) {
      const playerWrap = createEl('div', { className: 'card-player spotify' });
      const iframe = document.createElement('iframe');
      iframe.src = item.player.spotify;
      iframe.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
      iframe.loading = 'lazy';
      iframe.setAttribute('frameborder', '0');
      iframe.style.width = '100%';
      if (item.player.height) iframe.style.height = String(item.player.height) + 'px';
      playerWrap.appendChild(iframe);
      card.appendChild(playerWrap);
    }
    // For artists, append tags at the bottom (after player) to keep buttons aligned
    if (tagsAfterPlayer && item.tags && item.tags.length) {
      const tagWrap = createEl('div', { className: 'card-tags' });
      const chips = createEl('div', { className: 'chip-row' });
      item.tags.forEach(t => chips.appendChild(createEl('span', { className: 'chip', text: t })));
      tagWrap.appendChild(chips);
      card.appendChild(tagWrap);
    }
    grid.appendChild(card);
  });
}

function renderVideo(video) {
  if (!video) return;
  setText('video-subtitle', video.subtitle || '');
  const wrap = document.getElementById('video-embed');
  wrap.innerHTML = '';
  if (video.embed) {
    wrap.innerHTML = video.embed;
  } else if (video.file) {
    const v = document.createElement('video');
    v.controls = true; v.playsInline = true; v.poster = normalizeImagePath(video.poster || '');
    const src = document.createElement('source');
    src.src = video.file; src.type = video.type || 'video/mp4';
    v.appendChild(src);
    wrap.appendChild(v);
  }
}

function renderContact(contact) {
  if (!contact) return;
  setText('contact-subtitle', contact.subtitle || '');
  const actions = document.getElementById('contact-actions');
  actions.innerHTML = '';
  (contact.actions || []).forEach(c => {
    const a = createEl('a', { text: c.label || '', attrs: { href: c.href || '#', target: c.target || '_self' } });
    actions.appendChild(a);
  });
  const form = document.getElementById('contact-form');
  const embedWrap = document.getElementById('contact-embed');
  const grid = document.querySelector('.contact-grid');
  // Google Form embed support
  if (contact.form && (contact.form.embed || contact.form.embedUrl)) {
    const iframe = document.createElement('iframe');
    iframe.src = contact.form.embedUrl || '';
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('marginheight', '0');
    iframe.setAttribute('marginwidth', '0');
    iframe.style.width = '100%';
    iframe.style.height = (contact.form.height || 760) + 'px';
    embedWrap.appendChild(iframe);
    // allow fine-tuned width via content.json (e.g., 640, '720px')
    if (contact.form.width) {
      const w = typeof contact.form.width === 'number' ? contact.form.width + 'px' : String(contact.form.width);
      embedWrap.style.maxWidth = w;
      embedWrap.style.marginInline = 'auto';
      embedWrap.style.width = '100%';
    }
    // hide demo form
    form.classList.add('hide');
    // layout: single column when embedding external form
    grid && grid.classList.add('single');
    // hide empty actions panel to avoid left blank space
    if (!actions.children.length) actions.classList.add('hide');
  } else if (contact.form && contact.form.action) {
    form.action = contact.form.action;
    form.method = contact.form.method || 'POST';
  } else {
    // keep demo mode
    form.addEventListener('submit', e => {
      e.preventDefault();
      alert('デモ送信です。後で送信先を設定できます。');
    });
  }
}

function renderFooter(footer) {
  const yearEl = document.querySelector('[data-year]');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
  if (footer && footer.copyright) {
    const cr = document.getElementById('copyright');
    cr.innerHTML = footer.copyright;
  }
  const ul = document.getElementById('social-links');
  ul.innerHTML = '';
  (footer?.social || []).forEach(s => {
    const li = document.createElement('li');
    const a = createEl('a', { text: s.label || '', attrs: { href: s.href || '#', target: '_blank', rel: 'noopener' } });
    li.appendChild(a); ul.appendChild(li);
  });
}

function renderSite(data) {
  renderHero(data.hero);
  // Section backgrounds loop (falls back gracefully)
  applySectionBackgrounds(data.sectionBackgrounds || data.backgrounds || []);
  renderAbout(data.about);
  renderNews(data.news);
  document.getElementById('artists-subtitle').textContent = data.artists?.subtitle || '';
  renderCards('artists-grid', data.artists);
  document.getElementById('works-subtitle').textContent = data.works?.subtitle || '';
  renderCards('works-grid', data.works);
  renderVideo(data.video);
  renderContact(data.contact);
  renderFooter(data.footer);
  applyDuoTitles();
  randomizeGradientPhases();

  // Hide disabled sections
  (data.hideSections || []).forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hide');
  });
}

// Mobile menu
function setupMenu() {
  const btn = document.querySelector('.nav-toggle');
  const menu = document.getElementById('site-menu');
  btn?.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(open));
  });
  menu?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => menu.classList.remove('open')));
}

document.addEventListener('DOMContentLoaded', () => {
  setupMenu();
  loadContent();
  initStarfield();
  randomizeGradientPhases();
  initHeroGlitch();
});

function applyDuoTitles() {
  const nodes = document.querySelectorAll('.section-title, .hero h1');
  nodes.forEach(el => {
    let t = (el.textContent || '').trim();
    if (el.matches('.hero h1')) {
      const main = el.querySelector('.txt');
      if (main) t = (main.textContent || '').trim();
    }
    el.setAttribute('data-text', t);
  });
}

function randomizeGradientPhases() {
  const setDelay = (el, max = 20) => {
    const d = -(Math.random() * max).toFixed(2) + 's';
    el.style.setProperty('--gd-delay', d);
  };
  document.querySelectorAll('.menu a').forEach(el => setDelay(el, 18));
  document.querySelectorAll('.btn').forEach(el => setDelay(el, 15));
  document.querySelectorAll('.section-title, .hero h1').forEach(el => setDelay(el, 22));
}

function initHeroGlitch() {
  const el = document.querySelector('.hero h1');
  if (!el) return;
  // Safety: ensure data-text exists
  const t = (el.textContent || '').trim();
  if (!el.getAttribute('data-text')) el.setAttribute('data-text', t);
  const burst = () => {
    el.classList.add('glitch');
    // keep class long enough for CSS animations (>= electricScan 320ms)
    setTimeout(() => el.classList.remove('glitch'), 420);
  };
  // immediate first burst after short delay so変化が分かりやすい
  setTimeout(burst, 400);
  setInterval(burst, 2000);
}

// Twinkling starfield
function initStarfield() {
  const canvas = document.getElementById('stars');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w, h, dpr, stars = [], sprite;
  let meteors = [];
  let spawnTarget = 0; // seconds until next meteor

  function makeSprite() {
    const s = document.createElement('canvas');
    const sz = 32; s.width = s.height = sz;
    const g = s.getContext('2d');
    const gr = g.createRadialGradient(sz/2, sz/2, 0, sz/2, sz/2, sz/2);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.3, 'rgba(255,255,255,0.8)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(sz/2, sz/2, sz/2, 0, Math.PI*2); g.fill();
    return s;
  }

  function resize() {
    dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    w = Math.floor(window.innerWidth);
    h = Math.floor(window.innerHeight);
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // regen stars on resize
    const count = Math.floor((w * h) / 8000); // density
    stars = new Array(count).fill(0).map(() => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 0.6 + Math.random() * 1.6,           // radius factor
      a: 0.5 + Math.random() * 0.5,           // base alpha
      sp: 0.5 + Math.random() * 1.5,          // twinkle speed
      ph: Math.random() * Math.PI * 2,        // twinkle phase
      vy: -((16 + Math.random() * 36) * 1.5)  // upward px/sec (now 1.5x faster than before)
    }));
    if (!sprite) sprite = makeSprite();
    // schedule first meteor (1.5x more frequent)
    spawnTarget = rand(6, 14) / 1.5;
  }

  let t0 = performance.now();
  function frame(t) {
    const dt = (t - t0) / 1000; t0 = t;
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      // upward drift
      s.y += s.vy * dt;
      if (s.y < -12) { s.y = h + 12; s.x = Math.random() * w; }
      const tw = 0.35 * Math.sin(t * 0.002 * s.sp + s.ph);
      const alpha = Math.max(0, Math.min(1, s.a + tw));
      ctx.globalAlpha = alpha;
      const size = s.r * 6;
      ctx.drawImage(sprite, s.x - size/2, s.y - size/2, size, size);
    }
    ctx.globalAlpha = 1;

    // spawn meteors occasionally
    spawnTarget -= dt;
    if (spawnTarget <= 0) { meteors.push(spawnMeteor()); spawnTarget = rand(7, 15) / 1.5; }
    // update + draw meteors
    drawMeteors(ctx, meteors, dt, w, h);
    requestAnimationFrame(frame);
  }

  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(frame);

  function rand(a, b) { return a + Math.random() * (b - a); }

  function spawnMeteor() {
    // start from top-left or top-right edge
    const fromLeft = Math.random() < 0.5;
    const startX = fromLeft ? rand(-80, 0) : rand(w, w + 80);
    const startY = rand(-60, 80);
    const speed = rand(260, 480); // px/sec
    const angle = fromLeft ? rand(Math.PI * 0.10, Math.PI * 0.22) // 18°–40° down-right
                           : Math.PI - rand(Math.PI * 0.10, Math.PI * 0.22); // down-left
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    const length = rand(120, 220);
    const life = rand(0.8, 1.6);
    const colors = ['#00e5ff', '#ff2fb9', '#7b61ff'];
    let i1 = Math.floor(Math.random() * colors.length);
    let i2 = Math.floor(Math.random() * colors.length);
    if (i2 === i1) i2 = (i2 + 1) % colors.length;
    const c1 = colors[i1];
    const c2 = colors[i2];
    return { x: startX, y: startY, vx, vy, length, life, c1, c2 };
  }

  function drawMeteors(ctx, meteors, dt, w, h) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i];
      m.x += m.vx * dt; m.y += m.vy * dt; m.life -= dt;
      if (m.life <= 0 || m.x < -200 || m.x > w + 200 || m.y > h + 200) {
        meteors.splice(i, 1); continue;
      }
      const dir = Math.atan2(m.vy, m.vx);
      const nx = Math.cos(dir), ny = Math.sin(dir);
      const tailX = m.x - nx * m.length;
      const tailY = m.y - ny * m.length;
      const grad = ctx.createLinearGradient(tailX, tailY, m.x, m.y);
      // two-color neon gradient with transparent tail
      grad.addColorStop(0.00, m.c1 + '00');
      grad.addColorStop(0.10, m.c1 + '55');
      grad.addColorStop(0.50, m.c1 + 'ff');
      grad.addColorStop(0.80, m.c2 + 'ff');
      grad.addColorStop(1.00, '#ffffff');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 3;
      ctx.shadowColor = m.c2;
      ctx.shadowBlur = 36;
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(m.x, m.y);
      ctx.stroke();
      // head glow
      ctx.fillStyle = m.c2;
      ctx.shadowBlur = 40;
      ctx.beginPath();
      ctx.arc(m.x, m.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
