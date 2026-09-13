(() => {
  'use strict';

  const SITE = {
    name: "מסלולי הג'יפים של מדבר יהודה",
    logo: '/newlogo.png',
    fallbackLogo: '/favicon.png',
    whatsapp: 'https://chat.whatsapp.com/HA9Rjk6rSoyAii1YKUrPvS',
    facebook: 'https://bit.ly/4v9TpFw',
    instagram: 'https://bit.ly/4aIY4pK'
  };

  const topNav = `
    <nav class="hidden lg:flex items-center justify-center text-lg md:text-xl font-bold text-slate-900 tracking-tight absolute left-1/2 -translate-x-1/2" style="gap: 20px;">
      <a href="/category?type=routes" class="hover:text-indigo-600 transition whitespace-nowrap">מסלולי טיול</a>
      <a href="/category?type=technical" class="hover:text-indigo-600 transition whitespace-nowrap">מקטעים טכניים</a>
      <a href="/khan-catalog" class="hover:text-indigo-600 transition whitespace-nowrap">חאנים ולינה</a>
      <a href="/category?type=water" class="hover:text-indigo-600 transition whitespace-nowrap">מעיינות וגבים</a>
    </nav>`;

  function logo(className) {
    return `<a href="/" class="flex items-center group py-2">
      <img src="${SITE.logo}" alt="JDJ מסלולי ג'יפים נבחרים" onerror="this.src='${SITE.fallbackLogo}'; this.className='h-14 w-auto';" class="${className}">
    </a>`;
  }

  function menuButton(extra = '') {
    return `<button onclick="toggleSideMenu()" aria-label="פתח תפריט" class="w-11 h-11 flex items-center justify-center text-slate-900 hover:text-indigo-600 transition cursor-pointer ${extra}">
      <i class="fa-solid fa-bars text-2xl md:text-3xl"></i>
    </button>`;
  }

  function homeHeader() {
    return `<header class="w-full relative z-20">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="relative flex items-center justify-between h-24 md:h-28">
          <div class="flex items-center z-10">${logo('h-20 sm:h-24 md:h-28 w-auto max-w-[260px] sm:max-w-[360px] md:max-w-[520px] object-contain transition transform md:scale-95 group-hover:scale-100 duration-200')}</div>
          ${topNav}
          <div class="flex items-center z-10">${menuButton()}</div>
        </div>
      </div>
    </header>`;
  }

  function desktopHeader() {
    return `<div class="hidden md:block w-full bg-gradient-to-b from-sky-50/70 via-indigo-50/30 to-slate-50 relative overflow-hidden pb-4 border-b border-slate-200/60">
      <div class="absolute top-0 inset-x-0 h-64 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100/40 via-transparent to-transparent pointer-events-none"></div>
      <header class="w-full relative z-20">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="relative flex items-center justify-between h-24 md:h-28">
            <div class="flex items-center z-10">${logo('h-20 sm:h-24 md:h-28 w-auto max-w-[260px] sm:max-w-[360px] md:max-w-[520px] object-contain transition transform md:scale-95 group-hover:scale-100 duration-200')}</div>
            ${topNav}
            <div class="flex items-center z-10">${menuButton()}</div>
          </div>
        </div>
      </header>
    </div>`;
  }

  function mobileStickyHeader() {
    return `<header class="md:hidden w-full bg-white border-b border-slate-200 sticky top-0 z-40">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-20">
          <a href="/" class="flex items-center group">
            <img src="${SITE.logo}" alt="JDJ מסלולי ג'יפים נבחרים" onerror="this.src='${SITE.fallbackLogo}'; this.className='h-14 w-auto';" class="h-16 w-auto max-w-[260px] object-contain transition group-hover:scale-[1.01]">
          </a>
          ${menuButton()}
        </div>
      </div>
    </header>`;
  }

  function mobileOverlayHeader() {
    return `<header class="w-full relative z-20 md:hidden">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="relative flex items-center justify-between h-24 md:h-28">
          <div class="flex items-center z-10">${logo('h-20 sm:h-24 md:h-28 w-auto max-w-[260px] sm:max-w-[360px] md:max-w-[520px] object-contain transition transform md:scale-95 group-hover:scale-100 duration-200')}</div>
          <div class="flex items-center z-10">${menuButton()}</div>
        </div>
      </div>
    </header>`;
  }

  function sideMenu(section) {
    const floodActive = section === 'floods'
      ? 'bg-cyan-50 text-cyan-800'
      : 'hover:bg-cyan-50 hover:text-cyan-800';

    return `<div id="sideMenuDrawer" class="fixed inset-0 z-50 pointer-events-none transition-all duration-300">
      <div id="sideMenuBackdrop" onclick="toggleSideMenu()" class="absolute inset-0 bg-slate-950/60 opacity-0 transition-opacity duration-300"></div>
      <div id="sideMenuPanel" class="absolute top-0 left-0 w-full max-w-[360px] h-full bg-white shadow-2xl px-5 sm:px-6 pt-2.5 pb-5 sm:pt-3 sm:pb-6 flex flex-col justify-between overflow-y-auto transform -translate-x-full transition-transform duration-300 ease-out text-right">
        <div class="space-y-2">
          <div class="flex items-center justify-start border-b border-slate-100 pb-1">
            <button onclick="toggleSideMenu()" aria-label="סגור תפריט" class="w-9 h-9 -mr-1.5 text-slate-900 hover:text-indigo-600 flex items-center justify-center transition cursor-pointer"><i class="fa-solid fa-xmark text-2xl"></i></button>
          </div>
          <nav class="flex flex-col text-slate-900 font-bold text-base tracking-tight">
            <div class="space-y-0.5">
              <a href="/category?type=routes" class="block py-2 px-3 rounded-xl hover:bg-slate-100 hover:text-indigo-600 transition">מסלולי טיול</a>
              <a href="/category?type=technical" class="block py-2 px-3 rounded-xl hover:bg-slate-100 hover:text-indigo-600 transition">מקטעים טכניים</a>
              <a href="/category?type=viewpoints" class="block py-2 px-3 rounded-xl hover:bg-slate-100 hover:text-indigo-600 transition">נקודות תצפית</a>
              <a href="/category?type=water" class="block py-2 px-3 rounded-xl hover:bg-slate-100 hover:text-indigo-600 transition">מעיינות וגבים</a>
              <a href="/floods" class="block py-2 px-3 rounded-xl ${floodActive} transition">שטפונות בנחלי הדרום והמזרח</a>
              <a href="/category?type=poi" class="block py-2 px-3 rounded-xl hover:bg-slate-100 hover:text-indigo-600 transition">נקודות עניין</a>
            </div>
            <div class="py-2"><div class="border-t border-slate-100"></div></div>
            <div class="space-y-0.5">
              <a href="/khan-catalog" class="block py-2 px-3 rounded-xl hover:bg-slate-100 hover:text-indigo-600 transition">חאנים ומתחמי לינה</a>
              <a href="/stories" class="block py-2 px-3 rounded-xl hover:bg-slate-100 hover:text-indigo-600 transition">סיפורי מדבר ומורשת</a>
              <a href="/access" class="block py-2 px-3 rounded-xl hover:bg-slate-100 hover:text-indigo-600 transition">דרכי גישה למסלולים</a>
              <a href="/camp" class="block py-2 px-3 rounded-xl hover:bg-slate-100 hover:text-indigo-600 transition">חניוני לילה חינמיים</a>
              <a href="/mview" class="block py-2 px-3 rounded-xl hover:bg-slate-100 hover:text-indigo-600 transition">תצפיות מצוק ההעתקים</a>
            </div>
            <div class="py-2"><div class="border-t border-slate-100"></div></div>
            <div class="space-y-0.5 text-slate-600 text-sm">
              <a href="/about" class="block py-1.5 px-3 rounded-xl hover:bg-slate-100 hover:text-indigo-600 transition">אודות המיזם</a>
              <a href="/disclaimer" class="block py-1.5 px-3 rounded-xl hover:bg-slate-100 hover:text-indigo-600 transition">הגבלת אחריות ותנאים</a>
              <a href="/accessibility" class="block py-1.5 px-3 rounded-xl hover:bg-slate-100 hover:text-indigo-600 transition">הצהרת נגישות</a>
            </div>
          </nav>
        </div>
        <div class="pt-4 border-t border-slate-100 text-xs text-slate-400 text-center font-medium">${SITE.name}</div>
      </div>
    </div>`;
  }

  function footer() {
    return `<footer class="w-full bg-slate-900 text-slate-300 border-t-4 border-indigo-600 mt-8 md:mt-16">
      <div class="bg-slate-950/90 py-5 md:py-6 px-4 border-b border-slate-800">
        <div class="max-w-7xl mx-auto text-center md:text-right space-y-2">
          <h3 class="text-base font-black text-white flex items-center justify-center md:justify-start gap-2 tracking-tight"><i class="fa-solid fa-compass text-indigo-400"></i> ${SITE.name}</h3>
          <p class="text-xs text-slate-400 leading-relaxed max-w-5xl font-medium">הבית של מטיילי השטח, הניווט והג'יפאים במדבר יהודה, הנגב, בקעת הירדן והשומרון. מפות אינטראקטיביות, קבצי GPX להורדה, נקודות תצפית, גבי מים ועדכוני שטחי אש בזמן אמת.</p>
        </div>
      </div>
      <div class="max-w-7xl mx-auto p-4 sm:p-6 md:p-8 grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-8 text-xs md:text-sm font-bold tracking-tight">
        <div class="border-b border-slate-800 md:border-b-0 pb-2 md:pb-0 space-y-3">
          <button onclick="toggleFooterAccordion('footerSec1', 'footerArr1')" class="w-full flex items-center justify-between py-2 md:py-0 text-white font-black text-sm md:text-base md:border-b md:border-slate-800 md:pb-2 cursor-pointer md:cursor-default"><span>סוגי תוכן באתר</span><i id="footerArr1" class="fa-solid fa-chevron-down text-xs md:hidden transition-transform duration-200"></i></button>
          <ul id="footerSec1" class="hidden md:block space-y-2 text-slate-400 font-semibold pb-2 md:pb-0 transition-all duration-200">
            <li><a href="/category?type=routes" class="hover:text-indigo-400 transition block py-1 md:py-0">🚘 מסלולי טיול 4x4</a></li>
            <li><a href="/category?type=technical" class="hover:text-indigo-400 transition block py-1 md:py-0">⚙️ מקטעים ומעלה טכניים</a></li>
            <li><a href="/category?type=viewpoints" class="hover:text-indigo-400 transition block py-1 md:py-0">🔭 נקודות תצפית נוף</a></li>
            <li><a href="/category?type=water" class="hover:text-indigo-400 transition block py-1 md:py-0">💧 מעיינות, גבים ומים</a></li>
            <li><a href="/category?type=poi" class="hover:text-indigo-400 transition block py-1 md:py-0">📌 נקודות עניין והיסטוריה</a></li>
            <li><a href="/floods" class="hover:text-cyan-300 transition block py-1 md:py-0">🌊 שטפונות בנחלי הדרום והמזרח</a></li>
          </ul>
        </div>
        <div class="border-b border-slate-800 md:border-b-0 pb-2 md:pb-0 space-y-3">
          <button onclick="toggleFooterAccordion('footerSec2', 'footerArr2')" class="w-full flex items-center justify-between py-2 md:py-0 text-white font-black text-sm md:text-base md:border-b md:border-slate-800 md:pb-2 cursor-pointer md:cursor-default"><span>מדריכים שימושיים</span><i id="footerArr2" class="fa-solid fa-chevron-down text-xs md:hidden transition-transform duration-200"></i></button>
          <ul id="footerSec2" class="hidden md:block space-y-2 text-slate-400 font-semibold pb-2 md:pb-0 transition-all duration-200">
            <li><a href="/khan-catalog" class="hover:text-indigo-400 transition block py-1 md:py-0">⛺ חאנים ומתחמי לינה</a></li>
            <li><a href="/stories" class="hover:text-indigo-400 transition block py-1 md:py-0">📖 סיפורי מדבר ומורשת</a></li>
            <li><a href="/access" class="hover:text-indigo-400 transition block py-1 md:py-0">🚗 דרכי גישה ומסלולים</a></li>
            <li><a href="/mview" class="hover:text-indigo-400 transition block py-1 md:py-0">🔭 נקודות תצפית במצוק ההעתקים</a></li>
            <li><a href="/camp" class="hover:text-indigo-400 transition block py-1 md:py-0">⛺ חניוני לילה חינמיים</a></li>
          </ul>
        </div>
        <div class="border-b border-slate-800 md:border-b-0 pb-2 md:pb-0 space-y-3">
          <button onclick="toggleFooterAccordion('footerSec3', 'footerArr3')" class="w-full flex items-center justify-between py-2 md:py-0 text-white font-black text-sm md:text-base md:border-b md:border-slate-800 md:pb-2 cursor-pointer md:cursor-default"><span>מידע כללי ומשפטי</span><i id="footerArr3" class="fa-solid fa-chevron-down text-xs md:hidden transition-transform duration-200"></i></button>
          <ul id="footerSec3" class="hidden md:block space-y-2 text-slate-400 font-semibold pb-2 md:pb-0 transition-all duration-200">
            <li><a href="/about" class="hover:text-indigo-400 transition block py-1 md:py-0">ℹ️ אודות המיזם והחזון</a></li>
            <li><a href="/disclaimer" class="hover:text-indigo-400 transition block py-1 md:py-0">⚖️ הגבלת אחריות ותנאים</a></li>
            <li><a href="/accessibility" class="hover:text-indigo-400 transition block py-1 md:py-0">♿ הצהרת נגישות</a></li>
          </ul>
        </div>
        <div class="pb-2 md:pb-0 space-y-3">
          <button onclick="toggleFooterAccordion('footerSec4', 'footerArr4')" class="w-full flex items-center justify-between py-2 md:py-0 text-white font-black text-sm md:text-base md:border-b md:border-slate-800 md:pb-2 cursor-pointer md:cursor-default"><span>קהילה ויצירת קשר</span><i id="footerArr4" class="fa-solid fa-chevron-down text-xs md:hidden transition-transform duration-200"></i></button>
          <div id="footerSec4" class="hidden md:block space-y-3 pb-2 md:pb-0 transition-all duration-200">
            <p class="text-slate-400 text-xs leading-relaxed font-medium">רוצים לקבל עדכוני שיטפונות ומצב גבים? הצטרפו לקהילה שלנו!</p>
            <div class="flex items-center gap-2 pt-1">
              <a href="${SITE.whatsapp}" target="_blank" rel="noopener noreferrer" class="w-9 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center transition shadow-md" title="וואטסאפ"><i class="fa-brands fa-whatsapp text-base"></i></a>
              <a href="${SITE.facebook}" target="_blank" rel="noopener noreferrer" class="w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition shadow-md" title="פייסבוק"><i class="fa-brands fa-facebook-f text-sm"></i></a>
              <a href="${SITE.instagram}" target="_blank" rel="noopener noreferrer" class="w-9 h-9 rounded-xl bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center transition shadow-md" title="אינסטגרם"><i class="fa-brands fa-instagram text-sm"></i></a>
            </div>
          </div>
        </div>
      </div>
      <div class="bg-slate-950 py-4 px-6 border-t border-slate-800/80 text-xs text-slate-500">
        <div class="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-right font-medium">
          <div>© כל הזכויות שמורות למסלולי הג'יפים של מדבר יהודה.</div>
          <div class="flex items-center gap-4">
            <a href="/disclaimer" class="hover:text-slate-300 transition underline">הגבלת אחריות</a>
            <a href="/about" class="hover:text-slate-300 transition underline">אודות</a>
            <a href="/accessibility" class="hover:text-slate-300 transition underline">הצהרת נגישות</a>
          </div>
        </div>
      </div>
    </footer>`;
  }

  window.toggleSideMenu = function toggleSideMenu() {
    const drawer = document.getElementById('sideMenuDrawer');
    const backdrop = document.getElementById('sideMenuBackdrop');
    const panel = document.getElementById('sideMenuPanel');
    if (!drawer || !backdrop || !panel) return;
    const isClosed = drawer.classList.contains('pointer-events-none');
    if (isClosed) {
      drawer.classList.remove('pointer-events-none');
      document.body.classList.add('overflow-hidden');
      setTimeout(() => {
        backdrop.classList.remove('opacity-0');
        panel.classList.remove('-translate-x-full');
      }, 10);
    } else {
      backdrop.classList.add('opacity-0');
      panel.classList.add('-translate-x-full');
      document.body.classList.remove('overflow-hidden');
      setTimeout(() => drawer.classList.add('pointer-events-none'), 300);
    }
  };

  window.toggleFooterAccordion = function toggleFooterAccordion(contentId, arrowId) {
    if (window.innerWidth >= 768) return;
    const content = document.getElementById(contentId);
    const arrow = document.getElementById(arrowId);
    if (content) content.classList.toggle('hidden');
    if (arrow) arrow.classList.toggle('rotate-180');
  };

  function render() {
    const section = document.body?.dataset?.section || '';

    document.querySelectorAll('[data-site-header="home"]').forEach(el => { el.innerHTML = homeHeader(); });
    document.querySelectorAll('[data-site-header="internal"]').forEach(el => { el.innerHTML = desktopHeader() + mobileStickyHeader(); });
    document.querySelectorAll('[data-site-header="desktop"]').forEach(el => { el.innerHTML = desktopHeader(); });
    document.querySelectorAll('[data-site-header="mobile-overlay"]').forEach(el => { el.innerHTML = mobileOverlayHeader(); });
    document.querySelectorAll('[data-site-side-menu]').forEach(el => { el.innerHTML = sideMenu(section); });
    document.querySelectorAll('[data-site-footer]').forEach(el => { el.innerHTML = footer(); });
  }

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const drawer = document.getElementById('sideMenuDrawer');
    if (drawer && !drawer.classList.contains('pointer-events-none')) window.toggleSideMenu();
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render, { once: true });
  else render();

  window.JDJSiteShell = { render };
})();
