// Content-driven site: loads from content.json

function getLang() {
  const saved = localStorage.getItem('site_lang');
  if (saved === 'en' || saved === 'ja') return saved;
  return 'ja';
}

function updateLangButtons() {
  const cur = getLang();
  document.querySelectorAll('.lang-switch [data-lang]').forEach(btn => {
    const l = btn.getAttribute('data-lang');
    btn.setAttribute('aria-pressed', String(l === cur));
  });
}

function setLang(lang) {
  localStorage.setItem('site_lang', lang);
  document.documentElement.setAttribute('lang', lang);
  updateLangButtons();
}

function getContentPath() {
  const lang = getLang();
  return lang === 'en' ? 'content.en.json' : 'content.json';
}

async function loadContent() {
  try {
    const res = await fetch(getContentPath(), { cache: 'no-store' });
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

// Simple slugify for creating in-page anchors (e.g., works cards)
function slugify(str) {
  if (!str) return '';
  return String(str)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
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

function renderNews(news, worksCtx) {
  if (!news) return;
  setText('news-subtitle', news.subtitle || '');
  const list = document.getElementById('news-list');
  list.innerHTML = '';
  const lang = getLang();

  const ordinalEn = (n) => {
    const s = ['th','st','nd','rd'];
    const v = n % 100; const suf = s[(v - 20) % 10] || s[v] || s[0];
    return `${n}${suf}`;
  };
  const makeUniformTitle = (workItem, n) => {
    const title = workItem?.title || '';
    // guess artist name from tags (first non-"Album" tag)
    let artist = '';
    if (Array.isArray(workItem?.tags)) {
      const t = workItem.tags.find(t => String(t).toLowerCase() !== 'album');
      if (t) artist = t;
    }
    if (lang === 'ja') {
      // Use English-style ordinal in Japanese UI as requested
      const nth = n ? `${ordinalEn(n)} Album` : 'Album';
      if (artist && title) return `${artist}：${nth}：${title}：リリース`;
      if (title) return `${nth}：${title}：リリース`;
      return `${artist || ''}：${nth}：リリース`;
    } else {
      const nth = n ? `${ordinalEn(n)} Album` : 'Album';
      if (artist && title) return `${artist}: ${nth}: ${title}: Released`;
      if (title) return `${nth}: ${title}: Released`;
      return `${artist || ''}: ${nth}: Released`;
    }
  };
  const findWorkByHash = (hash) => {
    if (!worksCtx || !worksCtx.items) return null;
    const sid = hash.replace(/^#?work-/, '');
    return worksCtx.items.find(it => slugify(it.title) === sid) || null;
  };
  const nthForArtist = (workItem) => {
    if (!worksCtx || !worksCtx.items || !workItem) return null;
    // determine artist tag
    const artistTag = (workItem.tags || []).find(t => String(t).toLowerCase() !== 'album');
    if (!artistTag) return null;
    // collect works for this artist
    const parseDate = (d) => { const t = Date.parse(d); return isNaN(t) ? null : new Date(t); };
    const items = worksCtx.items.filter(it => Array.isArray(it.tags) && it.tags.includes(artistTag));
    // sort by date ascending (older to newer)
    items.sort((a,b) => {
      const ad = parseDate(a.date); const bd = parseDate(b.date);
      if (ad && bd) return ad - bd; if (ad && !bd) return -1; if (!ad && bd) return 1; return 0;
    });
    const idx = items.findIndex(x => x.title === workItem.title);
    return idx >= 0 ? (idx + 1) : null;
  };
  (news.items || []).forEach(n => {
    const li = createEl('li', { className: 'news-item' });
    const date = createEl('div', { className: 'news-date', text: n.date || '' });
    const body = createEl('div');
    const title = createEl('h3', { className: 'news-title' });
    let displayTitle = n.title || '';
    let isHash = false;
    if (n.url && typeof n.url === 'string') {
      isHash = n.url.startsWith('#');
      if (isHash) {
        const work = findWorkByHash(n.url);
        const nth = nthForArtist(work);
        displayTitle = makeUniformTitle(work, nth);
      }
    }
    if (n.url) {
      const a = createEl('a', { attrs: { href: n.url } });
      a.target = isHash ? '_self' : (n.target || '_blank');
      if (!isHash) a.rel = 'noopener';
      a.textContent = displayTitle;
      title.appendChild(a);
    } else {
      title.textContent = displayTitle;
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
    // Add stable anchors for works cards so News can deep-link
    if (sectionId === 'works-grid' && item.title) {
      const id = 'work-' + slugify(item.title);
      card.id = id;
    }
    const media = createEl('div', { className: 'card-media' });
    if (item.image) {
      const img = createEl('img', { attrs: { src: normalizeImagePath(item.image), alt: item.title || 'thumbnail', loading: 'lazy', decoding: 'async' } });
      // Optional retina support: if image2x provided, expose as 2x for crisper zoom
      if (item.image2x) {
        const x1 = normalizeImagePath(item.image);
        const x2 = normalizeImagePath(item.image2x);
        img.setAttribute('srcset', `${x1} 1x, ${x2} 2x`);
      }
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
      const toEmbedSpotify = (url) => {
        if (!url) return url;
        let u = String(url);
        // Convert share URL to embed URL when necessary
        if (!/\/embed\//.test(u)) {
          u = u.replace('open.spotify.com/', 'open.spotify.com/embed/');
        }
        // Avoid duplicate 'embed/embed'
        u = u.replace('/embed/embed/', '/embed/');
        return u;
      };
      const spUrl = toEmbedSpotify(item.player.spotify);
      iframe.src = spUrl;
      iframe.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
      iframe.loading = 'lazy';
      iframe.setAttribute('frameborder', '0');
      iframe.style.width = '100%';
      // Decide reasonable default heights per Spotify embed type if not provided
      const typeGuess = /\/embed\/(album|track|playlist|show|episode)\//.exec(spUrl)?.[1] || '';
      let baseH = item.player.height;
      if (!baseH) {
        if (typeGuess === 'album') baseH = 352; // full album with tracks
        else if (typeGuess === 'playlist' || typeGuess === 'show') baseH = 232; // show/playlist title + list
        else if (typeGuess === 'track' || typeGuess === 'episode') baseH = 152; // compact track/episode
        else baseH = 232;
      }
      // Scale down by 20% only for non-"show/track/episode" embeds unless explicitly disabled
      let scale = 1;
      const isGrid = (sectionId === 'artists-grid' || sectionId === 'works-grid');
      const avoidScale = item.player.noScale === true || typeGuess === 'show' || typeGuess === 'track' || typeGuess === 'episode';
      if (isGrid && !avoidScale) scale = 0.8;
      const h = Math.round(baseH * scale);
      // Compute expanded height to reveal more info (titles) while focused/hovered
      let expanded = h;
      if (typeGuess === 'album') expanded = Math.max(h, 420);
      else if (typeGuess === 'playlist' || typeGuess === 'show') expanded = Math.max(h, 340);
      else expanded = Math.max(h, 200);
      // Expose via CSS variables for smooth transition
      playerWrap.style.setProperty('--player-h', h + 'px');
      playerWrap.style.setProperty('--player-h-expanded', expanded + 'px');
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
    // clear previous embed to avoid duplicates on reload
    embedWrap.innerHTML = '';
    // ensure single-column layout and remove any left visual pane
    grid && grid.classList.remove('split');
    grid && grid.classList.add('single');
    // remove pre-existing visual pane if present
    document.querySelectorAll('.contact-visual').forEach(v => v.remove());
    // Build collapsible card
    embedWrap.classList.add('collapse-card');
    const head = createEl('button', { className: 'collapse-head' });
    const title = 'Contact Form';
    head.setAttribute('type', 'button');
    head.setAttribute('aria-expanded', 'false');
    const hid = 'contact-collapse-body';
    head.setAttribute('aria-controls', hid);
    head.appendChild(document.createTextNode(title));
    const chev = createEl('span', { className: 'chev', attrs: { 'aria-hidden': 'true' } });
    head.appendChild(chev);
    const body = createEl('div', { className: 'collapse-body', attrs: { id: hid } });
    const inner = createEl('div', { className: 'collapse-body-inner' });
    const iframe = document.createElement('iframe');
    iframe.src = contact.form.embedUrl || '';
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('marginheight', '0');
    iframe.setAttribute('marginwidth', '0');
    iframe.style.width = '100%';
    iframe.style.height = (contact.form.height || 760) + 'px';
    inner.appendChild(iframe);
    body.appendChild(inner);
    embedWrap.appendChild(head);
    embedWrap.appendChild(body);
    // toggle behavior
    const setOpen = (open) => {
      if (open) {
        embedWrap.classList.add('open');
        head.setAttribute('aria-expanded', 'true');
        body.style.maxHeight = body.scrollHeight + 'px';
        grid && grid.classList.add('expanded');
      } else {
        embedWrap.classList.remove('open');
        head.setAttribute('aria-expanded', 'false');
        body.style.maxHeight = '0px';
        grid && grid.classList.remove('expanded');
      }
    };
    setOpen(false);
    head.addEventListener('click', () => {
      const nowOpen = head.getAttribute('aria-expanded') !== 'true';
      setOpen(nowOpen);
    });
    // allow fine-tuned width via content.json (e.g., 640, '720px')
    if (contact.form.width) {
      const w = typeof contact.form.width === 'number' ? contact.form.width + 'px' : String(contact.form.width);
      // center the inner body content only
      inner.style.maxWidth = w;
      inner.style.marginInline = 'auto';
      inner.style.width = '100%';
    }
    // hide demo form
    form.classList.add('hide');
    // layout: single column when embedding external form (centered via CSS)
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
  // Footer: append social icons next to other platform buttons
  const footerLogos = document.querySelector('.site-footer .platform-logos');
  if (footerLogos) {
    // remove any previously injected social anchors (data-social)
    footerLogos.querySelectorAll('a[data-social]')?.forEach(a => a.remove());
    (footer?.social || []).forEach(s => {
      const label = (s.label || '').toLowerCase();
      const map = { instagram: 'image/instagram_logo.png', tiktok: 'image/TikTok_logo.png' };
      const icon = map[label];
      const attrs = { href: s.href || '#', target: '_blank', rel: 'noopener', 'aria-label': s.label || '', 'data-label': s.label || '', 'data-social': '1', class: 'btn secondary' };
      const a = createEl('a', { attrs });
      if (icon) {
        const img = document.createElement('img');
        img.src = normalizeImagePath(icon);
        img.alt = s.label || '';
        a.appendChild(img);
      } else {
        a.textContent = s.label || '';
      }
      footerLogos.appendChild(a);
    });
  }
  // Header side (hero area): place above subtitle
  const heroSocial = document.getElementById('social-logos-hero');
  if (heroSocial) {
    heroSocial.innerHTML = '';
    (footer?.social || []).forEach(s => {
      const label = (s.label || '').toLowerCase();
      const map = { instagram: 'image/instagram_logo.png', tiktok: 'image/TikTok_logo.png' };
      const icon = map[label];
      const attrs = { href: s.href || '#', target: '_blank', rel: 'noopener', 'aria-label': s.label || '', 'data-label': s.label || '', class: 'btn secondary' };
      const a = createEl('a', { attrs });
      if (icon) {
        const img = document.createElement('img');
        img.src = normalizeImagePath(icon);
        img.alt = s.label || '';
        a.appendChild(img);
      } else {
        a.textContent = s.label || '';
      }
      heroSocial.appendChild(a);
    });
  }

  // Legacy list (no longer used): clear if present
  const ul = document.getElementById('social-links');
  if (ul) ul.innerHTML = '';
}

function renderSite(data) {
  // Sort helpers: newest-first if `date` exists
  const parseDate = (d) => {
    if (!d) return null;
    const t = Date.parse(d);
    return isNaN(t) ? null : new Date(t);
  };
  const sortByDateDesc = (items = []) => {
    // Priority: featured first → dated (newest→oldest) → undated in original order
    return [...items]
      .map((it, i) => ({ it, i, dt: parseDate(it.date), feat: it.featured === true }))
      .sort((a, b) => {
        if (a.feat !== b.feat) return a.feat ? -1 : 1; // featured first
        const ad = a.dt, bd = b.dt;
        if (ad && bd) return bd - ad;                  // newer first
        if (ad && !bd) return -1;                      // dated items before undated
        if (!ad && bd) return 1;
        return a.i - b.i;                              // keep original order
      })
      .map(x => x.it);
  };

  renderHero(data.hero);
  // Section backgrounds loop (falls back gracefully)
  applySectionBackgrounds(data.sectionBackgrounds || data.backgrounds || []);
  renderAbout(data.about);
  renderNews(data.news, data.works);
  // Artists: newest-first if `date` exists per item
  document.getElementById('artists-subtitle').textContent = data.artists?.subtitle || '';
  const artistsData = data.artists ? { ...data.artists, items: sortByDateDesc(data.artists.items) } : null;
  renderCards('artists-grid', artistsData);
  // Albums (works): newest-first by `date`
  document.getElementById('works-subtitle').textContent = data.works?.subtitle || '';
  const worksData = data.works ? { ...data.works, items: sortByDateDesc(data.works.items) } : null;
  renderCards('works-grid', worksData);
  renderVideo(data.video);
  renderContact(data.contact);
  renderFooter(data.footer);
  initIconMagnetism();
  initSubtitleGlitch();
  applyDuoTitles();
  randomizeGradientPhases();
  initCustomHScrollbars();
  initCardProximityEnlarge();

  // Hide disabled sections
  (data.hideSections || []).forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hide');
  });

  // If URL already has a hash, highlight the corresponding card
  highlightHashTarget();
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
  // Brand link: always smooth-scroll to very top
  const brand = document.querySelector('a.brand');
  brand?.addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // maintain #top in URL for consistency
    try { history.replaceState(null, '', '#top'); } catch (_) {}
  });
}

document.addEventListener('DOMContentLoaded', () => {
  // init language
  setLang(getLang());
  const langButtons = document.querySelectorAll('.lang-switch [data-lang]');
  langButtons.forEach(btn => btn.addEventListener('click', () => {
    const l = btn.getAttribute('data-lang');
    if (l) { setLang(l); loadContent(); }
  }));
  updateLangButtons();
  setupMenu();
  loadContent();
  initStarfield();
  randomizeGradientPhases();
  initHeroGlitch();
  // Highlight on hash navigation
  window.addEventListener('hashchange', () => {
    // Delay slightly to allow native scroll to settle
    setTimeout(highlightHashTarget, 50);
  });
});

function highlightHashTarget() {
  const hash = decodeURIComponent(location.hash || '').replace(/^#/, '');
  if (!hash) return;
  const el = document.getElementById(hash);
  if (!el) return;
  // Center the album card in viewport and within horizontal grid
  if (hash.startsWith('work-')) {
    try {
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    } catch (_) {
      // Fallback: manual horizontal centering in parent grid
      const grid = document.getElementById('works-grid');
      if (grid && typeof el.offsetLeft === 'number') {
        const targetLeft = el.offsetLeft - (grid.clientWidth / 2) + (el.clientWidth / 2);
        grid.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });
      }
      // Vertical centering
      const rect = el.getBoundingClientRect();
      window.scrollTo({ top: window.scrollY + rect.top - (window.innerHeight/2 - rect.height/2), behavior: 'smooth' });
    }
  }
  // Immediate flash + stronger lightning ring for 10s
  el.classList.remove('flash-highlight', 'lightning-highlight');
  void el.offsetWidth; // reflow to restart animations
  el.classList.add('flash-highlight');
  setTimeout(() => el.classList.remove('flash-highlight'), 1800);
  // Apply the obvious lightning border effect
  el.classList.add('lightning-highlight');
  setTimeout(() => el.classList.remove('lightning-highlight'), 10000);
}

function initCustomHScrollbars() {
  const ids = ['artists-grid', 'works-grid'];
  ids.forEach(id => {
    const grid = document.getElementById(id);
    if (!grid) return;
    // remove old rails
    grid.querySelectorAll('.hs-rail, .hs-thumb').forEach(n => n.remove());
    const rail = createEl('div', { className: 'hs-rail' });
    const thumb = createEl('div', { className: 'hs-thumb' });
    grid.appendChild(rail);
    grid.appendChild(thumb);
    const update = () => {
      const max = grid.scrollWidth - grid.clientWidth;
      const gutter = 30;
      const inner = grid.clientWidth - 2 * gutter;
      const ratio = max > 0 ? grid.clientWidth / grid.scrollWidth : 1;
      const width = Math.max(40, Math.floor(inner * ratio));
      const left = max > 0 ? Math.floor((grid.scrollLeft / max) * (inner - width)) + gutter : gutter;
      thumb.style.width = width + 'px';
      thumb.style.left = left + 'px';
    };
    update();
    grid.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    // drag support
    let dragging = false; let startX = 0; let startLeft = 0; let maxLeft = 0; let maxScroll = 0; let thumbW = 0;
    const onDown = (e) => {
      dragging = true; grid.classList.add('hs-dragging');
      startX = e.clientX || (e.touches && e.touches[0]?.clientX) || 0;
      startLeft = parseFloat(getComputedStyle(thumb).left) || 0;
      const gutter = 30; const inner = grid.clientWidth - 2 * gutter;
      thumbW = thumb.offsetWidth; maxLeft = gutter + (inner - thumbW); maxScroll = grid.scrollWidth - grid.clientWidth;
      e.preventDefault();
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      document.addEventListener('touchmove', onMove, { passive: false });
      document.addEventListener('touchend', onUp);
    };
    const onMove = (e) => {
      if (!dragging) return;
      const x = e.clientX || (e.touches && e.touches[0]?.clientX) || 0;
      let nx = startLeft + (x - startX);
      const gutter = 30; const inner = grid.clientWidth - 2 * gutter;
      nx = Math.max(gutter, Math.min(maxLeft, nx));
      thumb.style.left = nx + 'px';
      const p = (nx - gutter) / ((inner - thumbW) || 1);
      grid.scrollLeft = p * maxScroll;
      e.preventDefault();
    };
    const onUp = () => {
      dragging = false; grid.classList.remove('hs-dragging');
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
    };
    thumb.addEventListener('mousedown', onDown);
    thumb.addEventListener('touchstart', onDown, { passive: false });
    // click on rail to page scroll
    rail.addEventListener('click', (e) => {
      const rect = rail.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const page = grid.clientWidth * 0.8;
      if (x < (parseFloat(getComputedStyle(thumb).left) - 10)) grid.scrollBy({ left: -page, behavior: 'smooth' });
      else grid.scrollBy({ left: page, behavior: 'smooth' });
    });
  });
}

// Proximity-based enlarge: approach a card -> scale up toward original size
function initCardProximityEnlarge() {
  const grids = ['artists-grid', 'works-grid']
    .map(id => document.getElementById(id))
    .filter(Boolean);
  const MAX_SCALE = 1.25; // roughly revert 20% shrink
  const MIN_SCALE = 1.0;  // base scale
  const THRESH = 170;     // px distance for influence
  grids.forEach(grid => {
    if (grid.dataset.proxBound === '1') return;
    grid.dataset.proxBound = '1';
    const cards = Array.from(grid.querySelectorAll('.card'));
    const resetAll = () => {
      cards.forEach(c => { c.style.setProperty('--card-scale', MIN_SCALE); c.style.zIndex = ''; });
    };
    resetAll();
    const onMove = (e) => {
      const gx = e.clientX;
      const gy = e.clientY;
      let topCard = null; let topScale = 0;
      cards.forEach(c => {
        const r = c.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dist = Math.hypot(gx - cx, gy - cy);
        const ratio = Math.max(0, 1 - dist / THRESH);
        const scale = MIN_SCALE + ratio * (MAX_SCALE - MIN_SCALE);
        c.style.setProperty('--card-scale', scale.toFixed(3));
        if (scale > topScale) { topScale = scale; topCard = c; }
      });
      // raise the closest card above neighbors to avoid overlap artifacts
      cards.forEach(c => c.style.zIndex = (c === topCard && topScale > 1.02) ? '12' : '');
      // expand player area only for the closest boosted card
      cards.forEach(c => c.classList.remove('player-expanded'));
      if (topCard && topScale > 1.12) topCard.classList.add('player-expanded');
    };
    const onLeave = () => { resetAll(); };
    grid.addEventListener('mousemove', onMove);
    grid.addEventListener('mouseleave', onLeave);
    // Keyboard accessibility: focus within a card grows it
    cards.forEach(c => {
      c.addEventListener('focusin', () => { c.style.setProperty('--card-scale', MAX_SCALE); c.style.zIndex = '12'; c.classList.add('player-expanded'); });
      c.addEventListener('focusout', () => { c.style.setProperty('--card-scale', MIN_SCALE); c.style.zIndex = ''; c.classList.remove('player-expanded'); });
    });
    // Touch: on tap, briefly boost the tapped card
    grid.addEventListener('touchstart', (e) => {
      const t = e.target.closest('.card');
      if (!t) return;
      cards.forEach(c => { if (c !== t) c.style.setProperty('--card-scale', MIN_SCALE); });
      t.style.setProperty('--card-scale', MAX_SCALE);
      t.style.zIndex = '12';
      t.classList.add('player-expanded');
      // Auto-center the tapped card horizontally within the grid and vertically in viewport
      try {
        // Prefer native centering where supported
        t.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      } catch (_) {
        const parentGrid = t.closest('.card-grid');
        if (parentGrid) {
          const targetLeft = t.offsetLeft - (parentGrid.clientWidth / 2) + (t.clientWidth / 2);
          parentGrid.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });
        }
        const rect = t.getBoundingClientRect();
        const delta = (rect.top + rect.height / 2) - (window.innerHeight / 2);
        window.scrollBy({ top: delta, behavior: 'smooth' });
      }
      setTimeout(() => { t.style.setProperty('--card-scale', MIN_SCALE); t.style.zIndex = ''; t.classList.remove('player-expanded'); }, 1400);
    }, { passive: true });
  });
}

function applyDuoTitles() {
  const nodes = document.querySelectorAll('.section-title, .hero h1, #hero-subtitle');
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

function initSubtitleGlitch() {
  const el = document.getElementById('hero-subtitle');
  if (!el || el.dataset.glitchBound === '1') return;
  el.dataset.glitchBound = '1';
  const t = (el.textContent || '').trim();
  if (!el.getAttribute('data-text')) el.setAttribute('data-text', t);
  const burst = () => {
    el.classList.add('glitch');
    setTimeout(() => el.classList.remove('glitch'), 420);
  };
  // 初回は少し遅らせて実行、その後3秒周期
  setTimeout(burst, 600);
  setInterval(burst, 3000);
}

// Subtle magnetic hover for platform icons (header + footer)
function initIconMagnetism() {
  const containers = document.querySelectorAll('.platform-logos');
  containers.forEach(container => {
    if (container.dataset.magnetBound === '1') return;
    container.dataset.magnetBound = '1';
    const THRESH = 160;
    const MAX_SHIFT = 10;
    const onMove = (e) => {
      const x = e.clientX, y = e.clientY;
      container.querySelectorAll('a').forEach(a => {
        const r = a.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.hypot(dx, dy);
        const ratio = Math.max(0, 1 - dist / THRESH);
        const tx = (dx / THRESH) * MAX_SHIFT * ratio;
        const ty = (dy / THRESH) * MAX_SHIFT * ratio;
        a.style.transform = `translate(${tx}px, ${ty}px)`;
        const img = a.querySelector('img');
        if (img) img.style.opacity = (0.72 + 0.28 * ratio).toFixed(2);
      });
    };
    const onLeave = () => {
      container.querySelectorAll('a').forEach(a => {
        a.style.transform = '';
        const img = a.querySelector('img');
        if (img) img.style.opacity = '';
      });
    };
    container.addEventListener('mousemove', onMove);
    container.addEventListener('mouseleave', onLeave);
    container.addEventListener('touchend', onLeave, { passive: true });
  });
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
