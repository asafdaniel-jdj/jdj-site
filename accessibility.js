/**
 * ♿ רכיב נגישות מודרני ועצמאי - מסלולי הג'יפים של מדבר יהודה
 */
(function () {
    if (window.__JDJ_ACCESSIBILITY_LOADED__) return;
    window.__JDJ_ACCESSIBILITY_LOADED__ = true;

    const style = document.createElement('style');
    style.id = 'jdj-accessibility-styles';
    style.textContent = `
        #jdj-acc-btn {
            position: fixed;
            bottom: 24px;
            left: 24px;
            z-index: 99999;
            width: 48px;
            height: 48px;
            background-color: #1e1b4b;
            color: #ffffff;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 22px;
            box-shadow: 0 4px 14px rgba(0,0,0,0.25);
            cursor: pointer;
            border: 2px solid #818cf8;
            transition: transform 0.2s, background-color 0.2s;
        }
        #jdj-acc-btn:hover {
            transform: scale(1.08);
            background-color: #312e81;
        }
        @media (max-width: 1023px) {
            #jdj-acc-btn {
                bottom: 80px;
                left: 16px;
                width: 44px;
                height: 44px;
                font-size: 20px;
            }
        }
        #jdj-acc-modal {
            position: fixed;
            bottom: 84px;
            left: 24px;
            z-index: 99999;
            width: 320px;
            max-width: calc(100vw - 32px);
            background: #ffffff;
            border-radius: 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.25);
            border: 1px solid #e2e8f0;
            padding: 16px;
            display: none;
            flex-direction: column;
            gap: 12px;
            font-family: 'Heebo', sans-serif;
            text-align: right;
            direction: rtl;
        }
        @media (max-width: 1023px) {
            #jdj-acc-modal {
                bottom: 136px;
                left: 16px;
            }
        }
        #jdj-acc-modal.active {
            display: flex;
        }
        .jdj-acc-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
        }
        .jdj-acc-opt-btn {
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 12px;
            padding: 10px 8px;
            font-size: 13px;
            font-weight: 700;
            color: #0f172a;
            cursor: pointer;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 6px;
            transition: all 0.15s ease;
        }
        .jdj-acc-opt-btn:hover {
            background: #e0e7ff;
            border-color: #6366f1;
            color: #312e81;
        }
        .jdj-acc-opt-btn.active {
            background: #312e81;
            border-color: #312e81;
            color: #ffffff;
        }
        .jdj-acc-opt-btn.active i {
            color: #ffffff !important;
        }
        body.acc-high-contrast {
            filter: contrast(140%) !important;
            background-color: #ffffff !important;
        }
        body.acc-invert {
            filter: invert(100%) hue-rotate(180deg) !important;
            background-color: #000000 !important;
        }
        body.acc-invert img, body.acc-invert video, body.acc-invert picture {
            filter: invert(100%) hue-rotate(180deg) !important;
        }
        body.acc-grayscale {
            filter: grayscale(100%) !important;
        }
        body.acc-highlight-links a {
            text-decoration: underline !important;
            background-color: #fef08a !important;
            color: #000000 !important;
            font-weight: 900 !important;
        }
        body.acc-readable-font * {
            font-family: Arial, sans-serif !important;
            letter-spacing: 0.03em !important;
        }
    `;
    document.head.appendChild(style);

    const container = document.createElement('div');
    container.id = 'jdj-accessibility-container';
    container.innerHTML = `
        <button id="jdj-acc-btn" aria-label="פתח תפריט נגישות" title="תפריט נגישות">
            <i class="fa-solid fa-universal-access"></i>
        </button>
        <div id="jdj-acc-modal" role="dialog" aria-label="תפריט נגישות">
            <div style="display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid #f1f5f9; padding-bottom:8px;">
                <div style="font-weight:900; font-size:15px; color:#0f172a; display:flex; align-items:center; gap:6px;">
                    <i class="fa-solid fa-universal-access" style="color:#4f46e5;"></i>
                    <span>התאמת נגישות</span>
                </div>
                <button id="jdj-acc-close" style="background:none; border:none; font-size:16px; color:#64748b; cursor:pointer;" aria-label="סגור תפריט">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
            <div class="jdj-acc-grid">
                <button class="jdj-acc-opt-btn" id="acc-btn-inc-font">
                    <i class="fa-solid fa-magnifying-glass-plus" style="color:#4f46e5; font-size:16px;"></i>
                    <span>הגדל טקסט</span>
                </button>
                <button class="jdj-acc-opt-btn" id="acc-btn-dec-font">
                    <i class="fa-solid fa-magnifying-glass-minus" style="color:#4f46e5; font-size:16px;"></i>
                    <span>הקטן טקסט</span>
                </button>
                <button class="jdj-acc-opt-btn" id="acc-btn-contrast">
                    <i class="fa-solid fa-circle-half-stroke" style="color:#4f46e5; font-size:16px;"></i>
                    <span>ניגודיות גבוהה</span>
                </button>
                <button class="jdj-acc-opt-btn" id="acc-btn-invert">
                    <i class="fa-solid fa-moon" style="color:#4f46e5; font-size:16px;"></i>
                    <span>ניגודיות הפוכה</span>
                </button>
                <button class="jdj-acc-opt-btn" id="acc-btn-gray">
                    <i class="fa-solid fa-eye-slash" style="color:#4f46e5; font-size:16px;"></i>
                    <span>גווני אפור</span>
                </button>
                <button class="jdj-acc-opt-btn" id="acc-btn-links">
                    <i class="fa-solid fa-link" style="color:#4f46e5; font-size:16px;"></i>
                    <span>הדגש קישורים</span>
                </button>
                <button class="jdj-acc-opt-btn" id="acc-btn-font" style="grid-column: span 2;">
                    <i class="fa-solid fa-font" style="color:#4f46e5; font-size:16px;"></i>
                    <span>גופן קריא</span>
                </button>
            </div>
            <button id="acc-btn-reset" style="background:#f1f5f9; border:none; border-radius:12px; padding:8px; font-weight:800; font-size:12px; color:#475569; cursor:pointer; width:100%; transition:background 0.2s;">
                <i class="fa-solid fa-rotate-right" style="margin-left:4px;"></i> איפוס הגדרות נגישות
            </button>
        </div>
    `;
    document.body.appendChild(container);

    let state = { zoomLevel: 100, contrast: false, invert: false, gray: false, links: false, font: false };
    try {
        const saved = localStorage.getItem('jdj_acc_state');
        if (saved) state = Object.assign(state, JSON.parse(saved));
    } catch (e) {}

    function saveAndApply() {
        try { localStorage.setItem('jdj_acc_state', JSON.stringify(state)); } catch (e) {}
        document.documentElement.style.fontSize = state.zoomLevel === 100 ? '' : `${state.zoomLevel}%`;
        document.body.classList.toggle('acc-high-contrast', state.contrast);
        document.body.classList.toggle('acc-invert', state.invert);
        document.body.classList.toggle('acc-grayscale', state.gray);
        document.body.classList.toggle('acc-highlight-links', state.links);
        document.body.classList.toggle('acc-readable-font', state.font);

        document.getElementById('acc-btn-contrast').classList.toggle('active', state.contrast);
        document.getElementById('acc-btn-invert').classList.toggle('active', state.invert);
        document.getElementById('acc-btn-gray').classList.toggle('active', state.gray);
        document.getElementById('acc-btn-links').classList.toggle('active', state.links);
        document.getElementById('acc-btn-font').classList.toggle('active', state.font);
        document.getElementById('acc-btn-inc-font').classList.toggle('active', state.zoomLevel > 100);
        document.getElementById('acc-btn-dec-font').classList.toggle('active', state.zoomLevel < 100);
    }

    const modal = document.getElementById('jdj-acc-modal');
    document.getElementById('jdj-acc-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        modal.classList.toggle('active');
    });
    document.getElementById('jdj-acc-close').addEventListener('click', () => {
        modal.classList.remove('active');
    });
    document.addEventListener('click', (e) => {
        if (!container.contains(e.target)) modal.classList.remove('active');
    });

    document.getElementById('acc-btn-inc-font').addEventListener('click', () => {
        if (state.zoomLevel < 130) state.zoomLevel += 10;
        saveAndApply();
    });
    document.getElementById('acc-btn-dec-font').addEventListener('click', () => {
        if (state.zoomLevel > 80) state.zoomLevel -= 10;
        saveAndApply();
    });
    document.getElementById('acc-btn-contrast').addEventListener('click', () => {
        state.contrast = !state.contrast;
        if (state.contrast) state.invert = false;
        saveAndApply();
    });
    document.getElementById('acc-btn-invert').addEventListener('click', () => {
        state.invert = !state.invert;
        if (state.invert) state.contrast = false;
        saveAndApply();
    });
    document.getElementById('acc-btn-gray').addEventListener('click', () => {
        state.gray = !state.gray;
        saveAndApply();
    });
    document.getElementById('acc-btn-links').addEventListener('click', () => {
        state.links = !state.links;
        saveAndApply();
    });
    document.getElementById('acc-btn-font').addEventListener('click', () => {
        state.font = !state.font;
        saveAndApply();
    });
    document.getElementById('acc-btn-reset').addEventListener('click', () => {
        state = { zoomLevel: 100, contrast: false, invert: false, gray: false, links: false, font: false };
        saveAndApply();
    });

    saveAndApply();
})();