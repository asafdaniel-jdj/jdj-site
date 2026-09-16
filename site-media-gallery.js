(function () {
  'use strict';

  const VERSION = '1.0.0';
  const galleries = new Map();
  let gallerySequence = 0;
  let activeViewer = null;
  let scrollLockState = null;

  function resolveElement(target) {
    if (!target) return null;
    if (typeof target === 'string') return document.querySelector(target);
    return target instanceof Element ? target : null;
  }

  function resolveAssetUrl(value, fallback = '') {
    const raw = String(value || '').trim();
    if (!raw) return fallback;
    if (/^(?:https?:)?\/\//i.test(raw) || raw.startsWith('/') || raw.startsWith('data:') || raw.startsWith('blob:')) return raw;
    return `/${raw.replace(/^\.?\//, '')}`;
  }

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    })[char]);
  }

  function normalizeMediaItem(item, forcedType = '') {
    if (!item) return null;
    if (typeof item === 'string') {
      const url = resolveAssetUrl(item);
      return url ? { type: forcedType || 'image', url, credit: '', credit_url: '', poster_url: '' } : null;
    }

    const type = forcedType || (String(item.type || '').toLowerCase() === 'video' ? 'video' : 'image');
    const url = resolveAssetUrl(item.url || item.src || '');
    if (!url) return null;

    return {
      ...item,
      type,
      url,
      credit: String(item.credit || ''),
      credit_url: String(item.credit_url || item.creditUrl || ''),
      poster_url: resolveAssetUrl(item.poster_url || item.posterUrl || ''),
      sort_order: Number(item.sort_order ?? item.sortOrder ?? 0) || 0
    };
  }

  function normalizeMainImage(mainImage) {
    if (!mainImage) return null;
    const item = normalizeMediaItem(
      typeof mainImage === 'string' ? { url: mainImage } : mainImage,
      'image'
    );
    return item ? { ...item, isMainImage: true } : null;
  }

  function normalizeMedia(media) {
    const seen = new Set();
    return (Array.isArray(media) ? media : [])
      .map(item => normalizeMediaItem(item))
      .filter(Boolean)
      .sort((a, b) => a.sort_order - b.sort_order)
      .filter(item => {
        if (seen.has(item.url)) return false;
        seen.add(item.url);
        return true;
      });
  }

  function buildGalleryState(options) {
    const container = resolveElement(options.container);
    if (!container) throw new Error('JDJMediaGallery: container not found');

    const id = String(options.galleryId || container.id || `jdj-media-gallery-${++gallerySequence}`);
    const mainImage = normalizeMainImage(options.mainImage);
    const media = normalizeMedia(options.media);

    const includeMainInMosaic = options.includeMainInMosaic !== false;
    const includeMainInViewer = options.includeMainInViewer === true;
    const mainImageClickable = options.mainImageClickable === true || includeMainInViewer;

    const mediaImages = media.filter(item => item.type === 'image');
    const videos = media.filter(item => item.type === 'video');

    const viewerImages = [];
    const viewerSeen = new Set();
    const pushViewerImage = item => {
      if (!item?.url || viewerSeen.has(item.url)) return;
      viewerSeen.add(item.url);
      viewerImages.push(item);
    };

    if (mainImage && includeMainInViewer) pushViewerImage(mainImage);
    mediaImages.forEach(pushViewerImage);

    const mosaicImages = [];
    const mosaicSeen = new Set();
    const pushMosaicImage = item => {
      if (!item?.url || mosaicSeen.has(item.url)) return;
      mosaicSeen.add(item.url);
      mosaicImages.push(item);
    };

    if (mainImage && includeMainInMosaic) pushMosaicImage(mainImage);
    mediaImages.forEach(pushMosaicImage);

    const viewerImageIndexByUrl = new Map(viewerImages.map((item, index) => [item.url, index]));
    const imageTiles = mosaicImages.map(item => ({
      type: 'image',
      url: item.url,
      item,
      imageIndex: viewerImageIndexByUrl.has(item.url) ? viewerImageIndexByUrl.get(item.url) : -1,
      clickable: item.isMainImage ? mainImageClickable : viewerImageIndexByUrl.has(item.url)
    }));

    const videoGroup = videos.length
      ? {
          type: 'video-group',
          videoCount: videos.length,
          previewUrl:
            videos.find(item => item.poster_url)?.poster_url ||
            mediaImages[0]?.url ||
            mainImage?.url ||
            ''
        }
      : null;

    const combined = [];
    if (videoGroup) {
      const insertAt = Math.min(Number(options.videoGroupInsertAt ?? 3), imageTiles.length);
      combined.push(...imageTiles.slice(0, insertAt), videoGroup, ...imageTiles.slice(insertAt));
    } else {
      combined.push(...imageTiles);
    }

    return {
      id,
      container,
      mainImage,
      media,
      mediaImages,
      viewerImages,
      videos,
      combined,
      altBase: String(options.altBase || options.title || 'גלריה'),
      title: String(options.title || ''),
      maxVisible: Math.max(1, Number(options.maxVisible || 5)),
      hideWhenEmpty: options.hideWhenEmpty !== false,
      includeMainInMosaic,
      includeMainInViewer,
      mainImageClickable,
      onOpen: typeof options.onOpen === 'function' ? options.onOpen : null,
      onClose: typeof options.onClose === 'function' ? options.onClose : null
    };
  }

  function getGallery(galleryOrId) {
    if (!galleryOrId) return null;
    if (typeof galleryOrId === 'string') return galleries.get(galleryOrId) || null;
    if (galleryOrId.id && galleries.has(galleryOrId.id)) return galleries.get(galleryOrId.id);
    return null;
  }

  function tileActionAttributes(gallery, action, index) {
    return `data-jdj-gallery-id="${esc(gallery.id)}" data-jdj-media-action="${esc(action)}" data-jdj-media-index="${Number(index || 0)}"`;
  }

  function renderVideoTile(gallery, item, tileClass = 'rounded-xl') {
    const multiBadge = item.videoCount > 1
      ? `<div class="absolute bottom-3 right-3 rounded-full bg-slate-950/70 text-white text-sm font-black px-3 py-1 leading-none border border-white/10 shadow-lg">+${item.videoCount}</div>`
      : '';
    const mediaLayer = item.previewUrl
      ? `<img src="${esc(item.previewUrl)}" loading="lazy" class="absolute inset-0 w-full h-full object-cover scale-110 blur-[3px] opacity-80 group-hover:scale-[1.14] transition duration-300" alt="">`
      : '<div class="absolute inset-0 bg-gradient-to-br from-slate-700 via-slate-800 to-indigo-950"></div>';

    return `
      <button type="button" ${tileActionAttributes(gallery, 'video', 0)} class="relative h-full w-full cursor-pointer group overflow-hidden ${tileClass} border border-slate-200/80 bg-slate-900 text-right" aria-label="פתח וידאו">
        ${mediaLayer}
        <span class="absolute inset-0 bg-gradient-to-t from-slate-950/72 via-slate-900/24 to-white/10"></span>
        <span class="absolute inset-0 flex items-center justify-center">
          <span class="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/20 backdrop-blur-sm text-white shadow-xl flex items-center justify-center group-hover:scale-110 group-hover:bg-white/25 transition duration-300 border border-white/35">
            <i class="fa-solid fa-play text-lg sm:text-xl pr-0.5" aria-hidden="true"></i>
          </span>
        </span>
        ${multiBadge}
      </button>`;
  }

  function renderPhotoTile(gallery, item, remainingCount = 0, tileClass = 'rounded-xl') {
    const index = Number(item.imageIndex);
    const clickable = item.clickable && index >= 0;
    const tag = clickable ? 'button' : 'div';
    const actionAttrs = clickable ? ` type="button" ${tileActionAttributes(gallery, 'image', index)}` : '';
    const cursorClass = clickable ? 'cursor-pointer group' : 'cursor-default';
    const hoverClass = clickable ? 'group-hover:scale-105' : '';
    const imageNumber = index >= 0 ? index + 1 : 1;
    const alt = `${gallery.altBase}, תמונה ${imageNumber}`;

    return `
      <${tag}${actionAttrs} class="relative h-full w-full ${cursorClass} overflow-hidden ${tileClass} text-right">
        <img src="${esc(item.url)}" ${imageNumber === 1 ? 'fetchpriority="high"' : 'loading="lazy"'} class="w-full h-full object-cover object-center ${hoverClass} transition duration-300" alt="${esc(alt)}">
        ${remainingCount > 0 ? `
          <span class="absolute inset-0 bg-slate-900/65 backdrop-blur-[1px] flex flex-col items-center justify-center text-white p-1 text-center font-black z-10">
            <span class="text-sm sm:text-base leading-none">+${remainingCount}</span>
            <span class="text-[10px] font-bold mt-0.5 tracking-tight opacity-90">פריטים נוספים</span>
          </span>` : ''}
      </${tag}>`;
  }

  function renderCombinedTile(gallery, item, remainingCount = 0, tileClass = 'rounded-xl') {
    if (!item) return `<div class="${tileClass} bg-slate-100 border border-dashed border-slate-200"></div>`;
    if (item.type === 'video-group') return renderVideoTile(gallery, item, tileClass);
    return renderPhotoTile(gallery, item, remainingCount, tileClass);
  }

  function attachContainerEvents(gallery) {
    if (gallery.container.dataset.jdjMediaGalleryBound === '1') return;
    gallery.container.dataset.jdjMediaGalleryBound = '1';

    gallery.container.addEventListener('click', event => {
      const trigger = event.target.closest('[data-jdj-media-action]');
      if (!trigger || !gallery.container.contains(trigger)) return;
      const galleryId = trigger.dataset.jdjGalleryId;
      const action = trigger.dataset.jdjMediaAction;
      const index = Number(trigger.dataset.jdjMediaIndex || 0);
      if (action === 'video') openVideo(galleryId, index);
      if (action === 'image') openImage(galleryId, index);
    });
  }

  function renderMosaic(gallery) {
    const totalItems = gallery.combined.length;
    const wrapper = gallery.container;

    if (!totalItems) {
      wrapper.innerHTML = '';
      if (gallery.hideWhenEmpty) wrapper.classList.add('hidden');
      return;
    }

    wrapper.classList.remove('hidden');
    attachContainerEvents(gallery);

    if (totalItems === 1) {
      wrapper.innerHTML = `<div class="w-full h-52 sm:h-64 md:h-72 rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm">${renderCombinedTile(gallery, gallery.combined[0], 0, 'rounded-2xl sm:rounded-3xl')}</div>`;
      return;
    }

    const gridClass = 'grid gap-1.5 sm:gap-2 rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-200/90 bg-slate-100 w-full p-0.5 shadow-sm';
    const visible = gallery.combined.slice(0, gallery.maxVisible);
    const remainingCount = Math.max(0, totalItems - visible.length);
    let html = '';

    if (visible.length === 2) {
      html = `<div class="${gridClass} grid-cols-2 h-48 sm:h-60 md:h-72">${renderCombinedTile(gallery, visible[0])}${renderCombinedTile(gallery, visible[1])}</div>`;
    } else if (visible.length === 3) {
      html = `<div class="${gridClass} grid-cols-3 h-48 sm:h-60 md:h-72"><div class="relative h-full col-span-2">${renderCombinedTile(gallery, visible[0])}</div><div class="relative h-full col-span-1 grid grid-rows-2 gap-1.5">${renderCombinedTile(gallery, visible[1], 0, 'rounded-lg')}${renderCombinedTile(gallery, visible[2], 0, 'rounded-lg')}</div></div>`;
    } else if (visible.length === 4) {
      html = `<div class="${gridClass} grid-cols-2 md:grid-cols-4 gap-1.5 sm:gap-2 p-1 sm:p-1.5">${visible.map(item => `<div class="relative overflow-hidden rounded-xl sm:rounded-2xl" style="aspect-ratio:4/5">${renderCombinedTile(gallery, item, 0, 'rounded-xl sm:rounded-2xl')}</div>`).join('')}</div>`;
    } else {
      html = `<div class="${gridClass} grid-cols-2 h-56 sm:h-64 md:h-80">${renderCombinedTile(gallery, visible[0])}<div class="grid grid-cols-2 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-1.5 h-full min-h-0">${renderCombinedTile(gallery, visible[1], 0, 'rounded-lg')}${renderCombinedTile(gallery, visible[2], 0, 'rounded-lg')}${renderCombinedTile(gallery, visible[3], 0, 'rounded-lg')}${renderCombinedTile(gallery, visible[4], remainingCount, 'rounded-lg')}</div></div>`;
    }

    wrapper.innerHTML = html;
  }

  function ensureViewer() {
    let modal = document.getElementById('jdjMediaViewer');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'jdjMediaViewer';
    modal.className = 'fixed inset-0 z-[120] hidden flex-col justify-between p-4 md:p-8 bg-black/95';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'תצוגת מדיה');
    modal.innerHTML = `
      <button type="button" data-jdj-viewer-close class="absolute inset-0 w-full h-full cursor-default" aria-label="סגור תצוגת מדיה"></button>
      <div class="relative z-10 flex items-center justify-between text-white max-w-5xl mx-auto w-full gap-3 pointer-events-none">
        <span id="jdjViewerKind" class="hidden text-xs font-bold bg-white/10 px-3 py-1 rounded-full items-center gap-1.5 pointer-events-auto">
          <i class="fa-solid fa-play text-indigo-300 text-[10px]" aria-hidden="true"></i>
          <span>וידאו מהשטח</span>
        </span>
        <div class="mr-auto flex items-center gap-2 pointer-events-auto">
          <span id="jdjViewerCounter" dir="ltr" class="text-xs font-mono font-bold bg-white/10 px-3 py-1 rounded-full">1 / 1</span>
          <button type="button" data-jdj-viewer-close aria-label="סגור" class="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"><i class="fa-solid fa-xmark text-lg" aria-hidden="true"></i></button>
        </div>
      </div>

      <div class="relative z-10 max-w-5xl mx-auto w-full flex-grow flex items-center justify-center my-4 pointer-events-none min-h-0">
        <button id="jdjViewerPrev" type="button" data-jdj-viewer-prev aria-label="הפריט הקודם" class="absolute right-2 md:right-4 z-20 w-11 h-11 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition border border-white/20 pointer-events-auto"><i class="fa-solid fa-chevron-right text-lg" aria-hidden="true"></i></button>
        <img id="jdjViewerImage" src="" alt="" class="hidden max-h-[76vh] max-w-[95vw] object-contain rounded-xl shadow-2xl pointer-events-auto">
        <video id="jdjViewerVideo" class="hidden max-h-[76vh] max-w-[95vw] rounded-2xl shadow-2xl bg-black object-contain focus:outline-none pointer-events-auto" controls playsinline></video>
        <button id="jdjViewerNext" type="button" data-jdj-viewer-next aria-label="הפריט הבא" class="absolute left-2 md:left-4 z-20 w-11 h-11 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition border border-white/20 pointer-events-auto"><i class="fa-solid fa-chevron-left text-lg" aria-hidden="true"></i></button>
      </div>

      <div id="jdjViewerCreditWrap" class="relative z-10 hidden max-w-5xl mx-auto w-full mb-3 pointer-events-none">
        <div class="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-4 py-2.5 text-white text-sm md:text-base font-black text-center shadow-lg pointer-events-auto">
          <i id="jdjViewerCreditIcon" class="fa-solid fa-camera text-indigo-300 ml-1.5" aria-hidden="true"></i><a id="jdjViewerCreditLink" href="#" target="_blank" rel="noopener noreferrer" class="hover:underline"></a>
        </div>
      </div>

      <div id="jdjViewerHint" class="relative z-10 text-center text-white/60 text-xs pointer-events-none">ניתן לנווט במקשי החצים במקלדת</div>`;

    document.body.appendChild(modal);

    modal.addEventListener('click', event => {
      if (event.target.closest('[data-jdj-viewer-close]')) closeViewer();
      if (event.target.closest('[data-jdj-viewer-prev]')) prevViewerItem();
      if (event.target.closest('[data-jdj-viewer-next]')) nextViewerItem();
    });

    return modal;
  }

  function lockScroll() {
    if (scrollLockState) return;
    const body = document.body;
    const html = document.documentElement;
    const scrollY = window.scrollY || window.pageYOffset || 0;

    scrollLockState = {
      scrollY,
      htmlOverflow: html.style.overflow,
      htmlOverscrollBehavior: html.style.overscrollBehavior,
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyLeft: body.style.left,
      bodyRight: body.style.right,
      bodyWidth: body.style.width,
      bodyOverscrollBehavior: body.style.overscrollBehavior
    };

    html.style.overflow = 'hidden';
    html.style.overscrollBehavior = 'none';
    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.overscrollBehavior = 'none';
  }

  function unlockScroll() {
    if (!scrollLockState) return;
    const body = document.body;
    const html = document.documentElement;
    const state = scrollLockState;
    scrollLockState = null;

    html.style.overflow = state.htmlOverflow;
    html.style.overscrollBehavior = state.htmlOverscrollBehavior;
    body.style.overflow = state.bodyOverflow;
    body.style.position = state.bodyPosition;
    body.style.top = state.bodyTop;
    body.style.left = state.bodyLeft;
    body.style.right = state.bodyRight;
    body.style.width = state.bodyWidth;
    body.style.overscrollBehavior = state.bodyOverscrollBehavior;
    window.scrollTo(0, state.scrollY);
  }

  function setCredit(item, type) {
    const wrap = document.getElementById('jdjViewerCreditWrap');
    const link = document.getElementById('jdjViewerCreditLink');
    const icon = document.getElementById('jdjViewerCreditIcon');
    if (!wrap || !link || !icon) return;

    const credit = String(item?.credit || '').trim();
    const url = String(item?.credit_url || '').trim();
    wrap.classList.toggle('hidden', !credit);
    icon.className = `fa-solid ${type === 'video' ? 'fa-video' : 'fa-camera'} text-indigo-300 ml-1.5`;

    if (!credit) {
      link.textContent = '';
      link.removeAttribute('href');
      return;
    }

    link.textContent = `${type === 'video' ? 'וידאו' : 'צילום'}: ${credit}`;
    if (url) {
      link.href = url;
      link.classList.add('cursor-pointer');
    } else {
      link.removeAttribute('href');
      link.classList.remove('cursor-pointer');
    }
  }

  function updateViewer() {
    if (!activeViewer) return;
    const modal = ensureViewer();
    const gallery = getGallery(activeViewer.galleryId);
    if (!gallery) return closeViewer();

    const items = activeViewer.kind === 'video' ? gallery.videos : gallery.viewerImages;
    if (!items.length) return closeViewer();

    activeViewer.index = Math.max(0, Math.min(activeViewer.index, items.length - 1));
    const item = items[activeViewer.index];
    const image = modal.querySelector('#jdjViewerImage');
    const video = modal.querySelector('#jdjViewerVideo');
    const kind = modal.querySelector('#jdjViewerKind');
    const counter = modal.querySelector('#jdjViewerCounter');
    const prev = modal.querySelector('#jdjViewerPrev');
    const next = modal.querySelector('#jdjViewerNext');
    const hint = modal.querySelector('#jdjViewerHint');

    counter.textContent = `${activeViewer.index + 1} / ${items.length}`;
    prev.classList.toggle('hidden', items.length <= 1);
    next.classList.toggle('hidden', items.length <= 1);

    if (activeViewer.kind === 'video') {
      image.classList.add('hidden');
      image.removeAttribute('src');
      video.pause();
      video.classList.remove('hidden');
      if (video.src !== item.url) {
        video.src = item.url;
        video.load();
      }
      video.setAttribute('aria-label', `${gallery.altBase}, וידאו ${activeViewer.index + 1}`);
      kind.classList.remove('hidden');
      kind.classList.add('flex');
      hint.textContent = 'לחצו מחוץ למדיה או על ESC לסגירה';
      setCredit(item, 'video');
      video.play().catch(() => {});
    } else {
      video.pause();
      video.removeAttribute('src');
      video.load();
      video.classList.add('hidden');
      image.classList.remove('hidden');
      image.src = item.url;
      image.alt = `${gallery.altBase}, תמונה ${activeViewer.index + 1}`;
      kind.classList.add('hidden');
      kind.classList.remove('flex');
      hint.textContent = 'ניתן לנווט במקשי החצים במקלדת';
      setCredit(item, 'image');
    }
  }

  function openViewer(galleryOrId, kind, index = 0) {
    const gallery = getGallery(galleryOrId);
    if (!gallery) return false;
    const items = kind === 'video' ? gallery.videos : gallery.viewerImages;
    if (!items.length) return false;

    const modal = ensureViewer();
    activeViewer = {
      galleryId: gallery.id,
      kind: kind === 'video' ? 'video' : 'image',
      index: Math.max(0, Math.min(Number(index || 0), items.length - 1)),
      focusReturn: document.activeElement instanceof HTMLElement ? document.activeElement : null
    };

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    lockScroll();
    updateViewer();
    gallery.onOpen?.({ kind: activeViewer.kind, index: activeViewer.index, galleryId: gallery.id });
    modal.querySelector('[data-jdj-viewer-close]')?.focus({ preventScroll: true });
    return true;
  }

  function openImage(galleryOrId, index = 0) {
    return openViewer(galleryOrId, 'image', index);
  }

  function openVideo(galleryOrId, index = 0) {
    return openViewer(galleryOrId, 'video', index);
  }

  function nextViewerItem() {
    if (!activeViewer) return;
    const gallery = getGallery(activeViewer.galleryId);
    if (!gallery) return;
    const items = activeViewer.kind === 'video' ? gallery.videos : gallery.viewerImages;
    if (items.length <= 1) return;
    activeViewer.index = (activeViewer.index + 1) % items.length;
    updateViewer();
  }

  function prevViewerItem() {
    if (!activeViewer) return;
    const gallery = getGallery(activeViewer.galleryId);
    if (!gallery) return;
    const items = activeViewer.kind === 'video' ? gallery.videos : gallery.viewerImages;
    if (items.length <= 1) return;
    activeViewer.index = (activeViewer.index - 1 + items.length) % items.length;
    updateViewer();
  }

  function closeViewer() {
    if (!activeViewer) return;
    const modal = document.getElementById('jdjMediaViewer');
    const gallery = getGallery(activeViewer.galleryId);
    const returnFocus = activeViewer.focusReturn;
    const closePayload = { kind: activeViewer.kind, index: activeViewer.index, galleryId: activeViewer.galleryId };

    const video = modal?.querySelector('#jdjViewerVideo');
    if (video) {
      video.pause();
      video.removeAttribute('src');
      video.load();
    }
    const image = modal?.querySelector('#jdjViewerImage');
    if (image) image.removeAttribute('src');

    modal?.classList.add('hidden');
    modal?.classList.remove('flex');
    activeViewer = null;
    unlockScroll();
    gallery?.onClose?.(closePayload);
    returnFocus?.focus?.({ preventScroll: true });
  }

  function handleKeyboard(event) {
    if (!activeViewer) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeViewer();
      return;
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      nextViewerItem();
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      prevViewerItem();
    }
  }

  function render(options = {}) {
    const gallery = buildGalleryState(options);
    galleries.set(gallery.id, gallery);
    renderMosaic(gallery);
    return gallery.id;
  }

  function remove(galleryOrId) {
    const gallery = getGallery(galleryOrId);
    if (!gallery) return false;
    if (activeViewer?.galleryId === gallery.id) closeViewer();
    gallery.container.innerHTML = '';
    gallery.container.removeAttribute('data-jdj-media-gallery-bound');
    galleries.delete(gallery.id);
    return true;
  }

  function getState(galleryOrId) {
    const gallery = getGallery(galleryOrId);
    if (!gallery) return null;
    return {
      id: gallery.id,
      imageCount: gallery.viewerImages.length,
      videoCount: gallery.videos.length,
      mosaicItemCount: gallery.combined.length,
      includeMainInMosaic: gallery.includeMainInMosaic,
      includeMainInViewer: gallery.includeMainInViewer
    };
  }

  document.addEventListener('keydown', handleKeyboard);

  window.JDJMediaGallery = Object.freeze({
    version: VERSION,
    render,
    remove,
    openImage,
    openVideo,
    close: closeViewer,
    next: nextViewerItem,
    prev: prevViewerItem,
    getState,
    resolveAssetUrl
  });
})();
