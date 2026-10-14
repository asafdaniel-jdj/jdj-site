(() => {
  const ROUTES_TYPE = 'routes';
  const MAX_WAIT_ATTEMPTS = 40;
  const WAIT_MS = 100;

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function isRoutesCategory() {
    const path = window.location.pathname.replace(/\.html$/, '');
    if (path !== '/category') return false;
    const type = new URLSearchParams(window.location.search).get('type') || ROUTES_TYPE;
    return type === ROUTES_TYPE;
  }

  async function waitForCategoryState() {
    for (let attempt = 0; attempt < MAX_WAIT_ATTEMPTS; attempt += 1) {
      const ready = typeof supabaseClient !== 'undefined' &&
        typeof rawCategoryItems !== 'undefined' &&
        Array.isArray(rawCategoryItems) &&
        typeof applyAllCategoryFilters === 'function';
      if (ready) return true;
      await delay(WAIT_MS);
    }
    return false;
  }

  async function syncRecommendedState() {
    if (!isRoutesCategory()) return;
    if (!(await waitForCategoryState())) {
      console.warn('JDJ recommended sync skipped: category state was not ready');
      return;
    }

    try {
      const { data, error } = await supabaseClient
        .from('routes')
        .select('id')
        .eq('status', 'פורסם')
        .eq('route_type', 'מסלול טיול')
        .eq('is_recommended', true)
        .order('id', { ascending: false });

      if (error) throw error;

      const recommendedIds = new Set((data || []).map(row => String(row.id)));

      rawCategoryItems.forEach(item => {
        item.is_recommended = recommendedIds.has(String(item.id));
      });

      // baseSearchItems and filteredCategoryItems contain the same item objects in the
      // normal category flow, so updating rawCategoryItems refreshes recommendation flags
      // without replacing search/filter state.
      if (typeof updateCategorySeoState === 'function') {
        updateCategorySeoState(rawCategoryItems);
      }

      const requestedVisibleCount = typeof visibleItemsCount === 'number' ? visibleItemsCount : undefined;
      applyAllCategoryFilters(requestedVisibleCount);

      console.info('JDJ recommended sync applied', {
        recommendedIds: [...recommendedIds],
        source: 'shared-recommended-cache'
      });
    } catch (error) {
      console.warn('JDJ recommended sync failed; keeping category collection state', error);
    }
  }

  function start() {
    setTimeout(syncRecommendedState, 0);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
