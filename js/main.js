/* ============================================
   MAIN JavaScript - Desa Persiapan Kiera
   ============================================ */

/* ---- Utility: Format Date ---- */
function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}
function formatDateFull(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}
function formatNumber(n) {
  return Number(n).toLocaleString('id-ID');
}

/* ---- Navbar ---- */
function initNavbar() {
  const navbar = document.querySelector('.navbar');
  const hamburger = document.querySelector('.hamburger');
  const navMenu = document.querySelector('.nav-menu');
  const navActions = document.querySelector('.nav-actions');

  if (navbar) {
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 50);
    });
  }

  if (hamburger && navMenu) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('open');
      navMenu.classList.toggle('open');
      if (navActions) {
        const clone = navActions.cloneNode(true);
        clone.classList.add('nav-actions-mobile');
      }
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!hamburger.contains(e.target) && !navMenu.contains(e.target)) {
        hamburger.classList.remove('open');
        navMenu.classList.remove('open');
      }
    });

    // Dropdown on mobile
    document.querySelectorAll('.nav-item > .nav-link').forEach(link => {
      if (link.nextElementSibling?.classList.contains('dropdown-menu')) {
        link.addEventListener('click', (e) => {
          if (window.innerWidth <= 768) {
            e.preventDefault();
            link.closest('.nav-item').classList.toggle('open');
          }
        });
      }
    });
  }

  // Active link
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage || href === '/' + currentPage) {
      link.classList.add('active');
    }
  });
}

/* ---- Hero Slider ---- */
function initHeroSlider() {
  const slides = document.querySelectorAll('.hero-slide');
  const dots = document.querySelectorAll('.hero-dot');
  if (!slides.length) return;
  let current = 0;
  let timer;

  function goTo(idx) {
    slides[current].classList.remove('active');
    if (dots[current]) dots[current].classList.remove('active');
    current = (idx + slides.length) % slides.length;
    slides[current].classList.add('active');
    if (dots[current]) dots[current].classList.add('active');
  }

  function next() { goTo(current + 1); }
  function startAuto() { timer = setInterval(next, 5000); }
  function stopAuto() { clearInterval(timer); }

  dots.forEach((dot, i) => dot.addEventListener('click', () => { stopAuto(); goTo(i); startAuto(); }));
  startAuto();
}

/* ---- Counter Animation ---- */
function animateCounter(el, target) {
  let current = 0;
  const step = Math.ceil(target / 60);
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = formatNumber(current);
    if (current >= target) clearInterval(timer);
  }, 20);
}

function initCounters() {
  const counters = document.querySelectorAll('[data-count]');
  if (!counters.length) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !entry.target.dataset.done) {
        entry.target.dataset.done = '1';
        animateCounter(entry.target, parseInt(entry.target.dataset.count));
      }
    });
  }, { threshold: .3 });
  counters.forEach(c => observer.observe(c));
}

/* ---- Scroll Animations ---- */
function initScrollAnimations() {
  const elements = document.querySelectorAll('.fade-up');
  if (!elements.length) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); }
    });
  }, { threshold: .1, rootMargin: '0px 0px -60px 0px' });
  elements.forEach(el => observer.observe(el));
}

/* ---- Back to Top ---- */
function initBackToTop() {
  const btn = document.querySelector('.back-to-top');
  if (!btn) return;
  window.addEventListener('scroll', () => btn.classList.toggle('visible', window.scrollY > 400));
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

/* ---- Lightbox ---- */
function initLightbox() {
  const box = document.querySelector('.lightbox');
  if (!box) return;
  const img = box.querySelector('img');
  const caption = box.querySelector('.lightbox-caption');
  const closeBtn = box.querySelector('.lightbox-close');

  document.querySelectorAll('[data-lightbox]').forEach(el => {
    el.addEventListener('click', () => {
      img.src = el.dataset.lightbox;
      if (caption) caption.textContent = el.dataset.caption || '';
      box.classList.add('active');
      document.body.style.overflow = 'hidden';
    });
  });

  const close = () => { box.classList.remove('active'); document.body.style.overflow = ''; };
  if (closeBtn) closeBtn.addEventListener('click', close);
  box.addEventListener('click', (e) => { if (e.target === box) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
}

/* ---- Load Berita (Home) ---- */
async function loadBeritaHome() {
  const container = document.getElementById('berita-home');
  if (!container) return;
  try {
    const res = await fetch('/api/berita?limit=5');
    const data = await res.json();
    const items = data.data || [];
    if (!items.length) { container.innerHTML = '<p style="text-align:center;color:#64748b">Belum ada berita</p>'; return; }

    const featured = items[0];
    const rest = items.slice(1, 5);

    container.innerHTML = `
      <div class="berita-grid fade-up">
        <a href="berita-detail.html?id=${featured.id}" class="berita-featured">
          ${featured.gambar 
            ? `<img src="${featured.gambar}" alt="${featured.judul}">`
            : `<div class="berita-placeholder">📰</div>`}
          <div class="berita-featured-overlay"></div>
          <div class="berita-featured-content">
            <span class="berita-cat">${formatKategori(featured.kategori)}</span>
            <h2>${featured.judul}</h2>
            <div class="berita-meta">
              <span>📅 ${formatDate(featured.tanggal)}</span>
              <span>👁 ${formatNumber(featured.views)} views</span>
            </div>
          </div>
        </a>
        <div class="berita-list">
          ${rest.map(b => `
            <a href="berita-detail.html?id=${b.id}" class="berita-card">
              <div class="berita-card-img">
                ${b.gambar 
                  ? `<img src="${b.gambar}" alt="${b.judul}">`
                  : `<div class="berita-placeholder" style="font-size:1.8rem">📰</div>`}
              </div>
              <div class="berita-card-body">
                <span class="berita-cat" style="font-size:.65rem;margin-bottom:6px;display:inline-block">${formatKategori(b.kategori)}</span>
                <h3>${b.judul}</h3>
                <span class="meta">📅 ${formatDate(b.tanggal)}</span>
              </div>
            </a>
          `).join('')}
        </div>
      </div>
    `;
  } catch (e) {
    container.innerHTML = '<p style="text-align:center;color:#ef4444">Gagal memuat berita</p>';
  }
}

async function loadStatistikHome() {
  const hasStats = document.getElementById('stat-penduduk') || document.getElementById('count-penduduk');
  if (!hasStats) return;

  try {
    const res = await fetch('/api/statistik?t=' + Date.now());
    const d = await res.json();
    
    // Hero stats (text display)
    const sp = document.getElementById('stat-penduduk');
    const sk = document.getElementById('stat-kk');
    const sl = document.getElementById('stat-laki');
    const spr = document.getElementById('stat-perempuan');
    if (sp) sp.textContent = Number(d.jumlah_penduduk || 0).toLocaleString('id-ID');
    if (sk) sk.textContent = Number(d.jumlah_kk || 0).toLocaleString('id-ID');
    if (sl) sl.textContent = Number(d.laki_laki || 0).toLocaleString('id-ID');
    if (spr) spr.textContent = Number(d.perempuan || 0).toLocaleString('id-ID');

    // Stats section counters (big cards)
    const cp = document.getElementById('count-penduduk');
    const ck = document.getElementById('count-kk');
    const cl = document.getElementById('count-laki');
    const cpr = document.getElementById('count-perempuan');
    if (cp) cp.dataset.count = d.jumlah_penduduk || 0;
    if (ck) ck.dataset.count = d.jumlah_kk || 0;
    if (cl) cl.dataset.count = d.laki_laki || 0;
    if (cpr) cpr.dataset.count = d.perempuan || 0;
  } catch (e) {
    console.error("Gagal memuat statistik home:", e);
  }
}

/* ---- Load Galeri (Home) ---- */
async function loadGaleriHome() {
  const container = document.getElementById('galeri-home');
  if (!container) return;
  try {
    const res = await fetch('/api/galeri');
    const data = await res.json();
    const items = data.slice(0, 6);
    if (!items.length) { container.innerHTML = '<p style="text-align:center;color:#64748b">Belum ada foto galeri</p>'; return; }
    container.innerHTML = `
      <div class="galeri-grid fade-up">
        ${items.map(g => `
          <div class="galeri-item" 
            data-lightbox="${g.gambar || ''}"
            data-caption="${g.judul}">
            ${g.gambar 
              ? `<img src="${g.gambar}" alt="${g.judul}" loading="lazy">`
              : `<div style="width:100%;height:100%;background:linear-gradient(135deg,#1a7a42,#0d4f2a);display:flex;align-items:center;justify-content:center;font-size:3rem">🖼️</div>`}
            <div class="galeri-overlay">
              <h3>${g.judul}</h3>
              ${g.deskripsi ? `<p>${g.deskripsi}</p>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `;
    initLightbox();
  } catch (e) {
    container.innerHTML = '<p style="text-align:center;color:#ef4444">Gagal memuat galeri</p>';
  }
}

/* ---- Load Pengumuman (Home) ---- */
async function loadPengumumanHome() {
  const container = document.getElementById('pengumuman-home');
  if (!container) return;
  try {
    const res = await fetch('/api/pengumuman');
    const data = await res.json();
    const items = data.slice(0, 4);
    if (!items.length) { container.innerHTML = '<p style="text-align:center;color:#64748b">Belum ada pengumuman</p>'; return; }
    container.innerHTML = `
      <div class="pengumuman-list fade-up">
        ${items.map(p => {
          const d = p.tanggal_acara ? new Date(p.tanggal_acara) : new Date(p.tanggal);
          const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];
          return `
            <div class="pengumuman-card">
              <div class="pengumuman-date-box">
                <div class="day">${d.getDate()}</div>
                <div class="month">${months[d.getMonth()]}</div>
              </div>
              <div class="pengumuman-body">
                <h3>${p.judul}</h3>
                <p>${p.konten}</p>
                ${p.lokasi ? `<span class="lokasi">📍 ${p.lokasi}</span>` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  } catch (e) {}
}

/* ---- Load Aparatur (Home) ---- */
async function loadAparaturHome() {
  const container = document.getElementById('aparatur-home');
  if (!container) return;
  try {
    const res = await fetch('/api/aparatur');
    const data = await res.json();
    const items = data.slice(0, 6);
    container.innerHTML = `
      <div class="aparatur-grid fade-up">
        ${items.map(a => `
          <div class="aparatur-card">
            <div class="aparatur-photo">
              ${a.foto ? `<img src="${a.foto}" alt="${a.nama}">` : getInitials(a.nama)}
            </div>
            <div class="aparatur-name">${a.nama}</div>
            <span class="aparatur-jabatan">${a.jabatan}</span>
          </div>
        `).join('')}
      </div>
    `;
  } catch (e) {}
}

/* ---- Load Pembangunan (Home) ---- */
async function loadPembangunanHome() {
  const container = document.getElementById('pembangunan-home');
  if (!container) return;
  try {
    const res = await fetch('/api/pembangunan');
    const data = await res.json();
    const items = data.slice(0, 4);
    container.innerHTML = `
      <div class="pembangunan-grid fade-up">
        ${items.map(p => `
          <div class="pembangunan-card">
            <span class="pembangunan-status status-${p.status}">${formatStatus(p.status)}</span>
            <h3>${p.nama}</h3>
            <p>${p.deskripsi || ''}</p>
            <div class="pembangunan-info">
              <div class="pembangunan-info-row"><span class="key">Anggaran</span><span class="val">${p.anggaran}</span></div>
              <div class="pembangunan-info-row"><span class="key">Sumber Dana</span><span class="val">${p.sumber_dana}</span></div>
              <div class="pembangunan-info-row"><span class="key">Tahun</span><span class="val">${p.tahun}</span></div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } catch (e) {}
}

/* ---- Helpers ---- */
function formatKategori(k) {
  const map = {
    'berita-desa': 'Berita Desa',
    'profil-desa': 'Profil Desa',
    'pemerintah-desa': 'Pemerintah Desa',
    'pengumuman': 'Pengumuman',
    'anti-korupsi': 'Anti Korupsi',
  };
  return map[k] || k || 'Berita';
}
function formatStatus(s) {
  const map = { selesai: '✅ Selesai', proses: '🔄 Proses', rencana: '📋 Rencana' };
  return map[s] || s;
}
function getInitials(name) {
  if (!name) return '👤';
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

/* ---- Search berita ---- */
function initSearch() {
  const form = document.getElementById('search-form');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = form.querySelector('input').value.trim();
    if (q) window.location.href = `berita.html?search=${encodeURIComponent(q)}`;
  });
}

/* ---- Toast Notification ---- */
function showToast(msg, type = 'success') {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position:fixed;bottom:80px;right:24px;z-index:9999;
    padding:12px 20px;border-radius:10px;
    background:${type === 'success' ? '#dcfce7' : '#fee2e2'};
    color:${type === 'success' ? '#166534' : '#991b1b'};
    border:1px solid ${type === 'success' ? '#bbf7d0' : '#fecaca'};
    font-size:.875rem;font-weight:600;font-family:'Outfit',sans-serif;
    box-shadow:0 4px 20px rgba(0,0,0,.15);
    animation:slideIn .3s ease;
  `;
  toast.innerHTML = (type === 'success' ? '✅ ' : '❌ ') + msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

/* ---- Layanan/Pengaduan Form ---- */
function initPengaduanForm() {
  const form = document.getElementById('form-pengaduan');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    try {
      const res = await fetch('/api/pengaduan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        showToast('Pengaduan berhasil dikirim! Kami akan segera menindaklanjuti.');
        form.reset();
      } else {
        showToast('Gagal mengirim pengaduan', 'error');
      }
    } catch (e) {
      showToast('Gagal mengirim pengaduan', 'error');
    }
  });
}

/* ---- Init All ---- */
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initHeroSlider();
  initScrollAnimations();
  initBackToTop();
  initSearch();
  initPengaduanForm();

  // Load home data
  loadBeritaHome();
  loadStatistikHome().then(() => initCounters());
  loadGaleriHome();
  loadPengumumanHome();
  loadAparaturHome();
  loadPembangunanHome();
});

// CSS animation for toast
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
`;
document.head.appendChild(style);
