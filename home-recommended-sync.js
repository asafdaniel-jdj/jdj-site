(() => {
  const MAX_WAIT_ATTEMPTS = 40;
  const WAIT_MS = 100;

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function isHome() {
    const path = window.location.pathname.replace(/index\.html$/, '').replace(/\/$/, '') || '/';
    return path === '/';
  }

  async function waitForHomeState() {
    for (let attempt = 0; attempt < MAX_WAIT_ATTEMPTS; attempt += 1) {
      const ready = typeof allHomeItems !== 'undefined' &&
        Array.isArray(allHomeItems) &&
        typeof renderHomeFeaturedGrid === 'function';
      if (ready) return true;
      await delay(WAIT_MS);
    }
    return false;
  }

  async function fetchSharedRecommended() {
    const response = await fetch('/.netlify/functions/recommended-routes', {
      headers: { Accept: 'application/json' }
    });
    if (!response.ok) throw new Error(`recommended-routes returned ${response.status}`);
    const payload = await response.json();
    return Array.isArray(payload?.data) ? payload.data : [];
  }

  function pickFeatured(data) {
    const featured = [];
    const byRegion = {};

    data.forEach(item => {
      const region = item.region || 'כללי';
      if (!byRegion[region]) byRegion[region] = [];
      byRegion[region].push(item);
    });

    const regions = Object.keys(byRegion);
    let round = 0;
    while (featured.length < 3 && round < 10) {
      for (const region of regions) {
        if (byRegion[region][round] && featured.length < 3) {
          featured.push(byRegion[region][round]);
        }
      }
      round += 1;
    }

    return featured;
  }

  async function syncHomeRecommended() {
    if (!isHome()) return;
    if (!(await waitForHomeState())) {
      console.warn('JDJ home recommended sync skipped: home state was not ready');
      return;
    }

    try {
      const recommended = await fetchSharedRecommended();
      const featured = pickFeatured(recommended);
      if (!featured.length) return;

      allHomeItems = featured;
      renderHomeFeaturedGrid();

      console.info('JDJ home recommended sync applied', {
        recommendedIds: featured.map(item => item.id),
        source: 'shared-recommended-cache'
      });
    } catch (error) {
      console.warn('JDJ home recommended sync failed; keeping existing home state', error);
    }
  }

  function start() {
    setTimeout(syncHomeRecommended, 0);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
