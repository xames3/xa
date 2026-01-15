document.addEventListener('DOMContentLoaded', () => {
    const wordsPerMinute = 225;
    const root = document.getElementById('content') || document.querySelector('[role="main"]') || document.querySelector('section');
    if (!root) return;
    const candidates = Array.from(root.querySelectorAll('p'));
    const totalWordCount = candidates.reduce((acc, p) => {
        if (p.closest('pre, code, figure, figcaption, .literal-block-wrapper, .highlight, .code-block-caption, .math, .sidebar, .site-sidebar, .sphinxsidebar, .admonition, nav, header, footer')) {
            return acc;
        }
        const clone = p.cloneNode(true);
        clone.querySelectorAll('code, pre, kbd, samp, .linenos, .copybtn, .headerlink, svg, i.fa, .fa').forEach(n => n.remove());
        const text = (clone.textContent || '').replace(/\s+/g, ' ').trim();
        if (!text || text.length < 20) return acc;
        const words = text.split(/\s+/).filter(tok => /[\p{L}\p{N}]/u.test(tok)).length;
        return acc + words;
    }, 0);
    if (totalWordCount > 0) {
        const readingTime = Math.ceil(totalWordCount / wordsPerMinute);
        const rt = document.getElementById('readingTime');
        if (rt) rt.innerHTML = `<i class='fa-regular fa-stopwatch' style='margin-right: 8px;'></i>${readingTime} min read`;
    }
});

// Header search: expand on click/tap
(function () {
    const search = document.querySelector('.site-header__search .site-search');
    if (!search) return;
    const input = search.querySelector('.site-search__input');
    const submit = search.querySelector('.site-search__submit');

    function open() {
        search.classList.add('is-open');
        if (input) {
            input.focus();
            input.setAttribute('aria-expanded', 'true');
        }
    }
    function close() {
        if (input && input.value.trim()) return;
        search.classList.remove('is-open');
        if (input) input.setAttribute('aria-expanded', 'false');
    }
    if (submit) {
        submit.addEventListener('click', (e) => {
            if (!search.classList.contains('is-open')) {
                e.preventDefault();
                open();
            }
        });
    }
    if (input) {
        input.addEventListener('focus', () => {
            search.classList.add('is-open');
            input.setAttribute('aria-expanded', 'true');
        });
        input.addEventListener('blur', () => {
            setTimeout(close, 0);
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                close();
                input.blur();
            }
        });
    }

    document.addEventListener('click', (e) => {
        if (!search.contains(e.target)) close();
    });
})();

// Eased anchor scrolling (fast start, slow end)
(function () {
    function getCssVarRaw(name) {
        try { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); } catch { return ''; }
    }
    function toPx(val, basePx) {
        if (!val) return basePx;
        if (val.endsWith('px')) return parseFloat(val) || basePx;
        if (val.endsWith('rem')) {
            const fs = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
            return (parseFloat(val) || 0) * fs;
        }
        if (val.endsWith('em')) {
            const fs = parseFloat(getComputedStyle(document.body).fontSize) || 16;
            return (parseFloat(val) || 0) * fs;
        }
        const n = parseFloat(val);
        return isNaN(n) ? basePx : n;
    }
    function getHeaderOffsetPx() {
        const raw = getCssVarRaw('--header-offset');
        const extraRaw = getCssVarRaw('--anchor-offset-extra');
        const cssPx = toPx(raw, 40) + toPx(extraRaw, 12);
        const header = document.querySelector('header');
        const headerPx = header ? Math.ceil(header.getBoundingClientRect().height) : 0;
        return Math.max(0, cssPx, headerPx);
    }
    function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
    function simpleScrollTo(targetY, duration) {
        const startY = window.pageYOffset || document.documentElement.scrollTop || 0;
        const maxY = Math.max(0, (document.documentElement.scrollHeight - window.innerHeight));
        const clampedTarget = Math.min(maxY, Math.max(0, targetY));
        const distance = clampedTarget - startY;
        if (Math.abs(distance) < 1) { window.scrollTo(0, clampedTarget); return Promise.resolve(); }
        const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduce) { window.scrollTo(0, clampedTarget); return Promise.resolve(); }
        const start = performance.now();
        const dur = Math.max(300, Math.min(duration, 1800));
        const root = document.documentElement;
        const prevBehavior = root.style.scrollBehavior;
        root.style.scrollBehavior = 'auto';
        return new Promise(resolve => {
            function step(now) {
                const t = Math.min(1, (now - start) / dur);
                const eased = easeOutCubic(t);
                window.scrollTo(0, startY - 20 + distance * eased);
                if (t < 1) requestAnimationFrame(step); else {
                    root.style.scrollBehavior = prevBehavior || '';
                    resolve();
                }
            }
            requestAnimationFrame(step);
        });
    }
    function onAnchorClick(e) {
        const href = this.getAttribute('href') || '';
        if (href === '#' || !href.startsWith('#')) return;
        // Allow both sidebars' in-page links to use eased scrolling
        const id = href.slice(1);
        const el = document.getElementById(id);
        if (!el) return;
        e.preventDefault();
        const rect = el.getBoundingClientRect();
        const headerOffset = getHeaderOffsetPx();
        const targetY = (window.pageYOffset || document.documentElement.scrollTop || 0) + rect.top - headerOffset;
        const base = (window.simpleGetDurationMs ? simpleGetDurationMs('--duration-slow', 2500) : 2500);
        const dist = Math.abs((window.pageYOffset || 0) - targetY);
        const duration = Math.max(1500, Math.min(4000, base + Math.min(1000, dist * 1.5)));
        simpleScrollTo(targetY, duration).then(() => {
            try { history.pushState(null, '', '#' + id); } catch { /* noop */ }
        });
    }
    document.addEventListener('DOMContentLoaded', function () {
        const links = document.querySelectorAll('a[href^="#"]');
        for (const link of links) {
            link.addEventListener('click', onAnchorClick, { passive: false });
        }
        // Correct initial hash position to avoid clipping under the header
        if (location.hash && location.hash.length > 1) {
            const id = decodeURIComponent(location.hash.slice(1));
            const el = document.getElementById(id);
            if (el) {
                requestAnimationFrame(() => {
                    const root = document.documentElement;
                    const prevBehavior = root.style.scrollBehavior;
                    root.style.scrollBehavior = 'auto';
                    const rect = el.getBoundingClientRect();
                    const headerOffset = getHeaderOffsetPx();
                    const y = (window.pageYOffset || document.documentElement.scrollTop || 0) + rect.top - headerOffset;
                    window.scrollTo(0, Math.max(0, y));
                    root.style.scrollBehavior = prevBehavior || '';
                });
            }
        }
    });
})();

// Mobile-friendly copy URL handler with fallback and tooltip feedback
(function () {
    function showTooltip(el, text) {
        try {
            if (text) el.setAttribute('data-tooltip', text);
            el.classList.add('show-tooltip');
            setTimeout(() => { el.classList.remove('show-tooltip'); }, 1800);
        } catch { }
    }

    async function copyTextLegacy(text) {
        return new Promise((resolve, reject) => {
            try {
                const ta = document.createElement('textarea');
                ta.value = text;
                ta.setAttribute('readonly', '');
                ta.style.position = 'absolute';
                ta.style.left = '-9999px';
                ta.style.fontSize = '12pt';
                document.body.appendChild(ta);
                const selection = document.getSelection();
                const selected = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
                ta.select();
                ta.setSelectionRange(0, ta.value.length);
                const ok = document.execCommand && document.execCommand('copy');
                document.body.removeChild(ta);
                if (selected && selection) {
                    selection.removeAllRanges();
                    selection.addRange(selected);
                }
                if (!ok) return reject(new Error('execCommand copy failed'));
                resolve();
            } catch (e) { reject(e); }
        });
    }

    async function copyToClipboard(text) {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
                return true;
            }
        } catch (_) { }
        try {
            await copyTextLegacy(text);
            return true;
        } catch (_) {
            return false;
        }
    }

    function getCanonicalUrl() {
        const c = document.querySelector('link[rel="canonical"]');
        if (c && c.href) return c.href;
        return window.location.href;
    }

    function initCopyUrl() {
        const links = document.querySelectorAll('a.copy-url');
        if (!links.length) return;
        links.forEach(link => {
            link.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const url = getCanonicalUrl();
                const ok = await copyToClipboard(url);
                showTooltip(link, ok ? 'Copied!' : 'Copy failed');
            }, { passive: false });
            link.addEventListener('touchend', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const url = getCanonicalUrl();
                const ok = await copyToClipboard(url);
                showTooltip(link, ok ? 'Copied!' : 'Copy failed');
            }, { passive: false });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCopyUrl);
    } else {
        initCopyUrl();
    }
})();

(function () {
    function onScroll() {
        const sc = window.scrollY || document.documentElement.scrollTop;
        const header = document.querySelector('.site-header');
        if (!header) return;
        if (sc > 250) header.classList.add('site-header--with-border');
        else header.classList.remove('site-header--with-border');
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
})();

// Read CSS duration variables in ms
(function () {
    if (window.simpleGetDurationMs) return;
    window.simpleGetDurationMs = function (cssVar = '--duration-normal', fallback = 500) {
        try {
            const cs = getComputedStyle(document.documentElement);
            const raw = (cs.getPropertyValue(cssVar) || '').toString().trim();
            if (!raw) return fallback;
            if (raw.endsWith('ms')) return Math.max(0, parseFloat(raw));
            if (raw.endsWith('s')) return Math.max(0, parseFloat(raw) * 1000);
            const n = Number(raw);
            return isNaN(n) ? fallback : n;
        } catch { return fallback; }
    };
})();

// Theme transition helper to ensure color changes fade smoothly
(function () {
    if (window.simpleApplyTheme) return;
    window.simpleApplyTheme = function (mode, maxWait) {
        const root = document.documentElement;
        const dur = (window.simpleGetDurationMs ? simpleGetDurationMs('--duration-normal', 500) : 500);
        const debounce = Math.max(60, Math.round(dur * 0.25));
        const fallback = maxWait ?? Math.max(dur * 3, dur + 500);
        root.classList.add('theme-transition');
        requestAnimationFrame(() => {
            root.setAttribute('data-theme', mode);
            let doneTimer;
            function cleanup() {
                root.classList.remove('theme-transition');
                root.removeEventListener('transitionend', onEnd, true);
                if (doneTimer) clearTimeout(doneTimer);
            }
            function onEnd(e) {
                if (!e || !e.propertyName) return;
                if (e.propertyName === 'color' || e.propertyName === 'background-color' || e.propertyName === 'fill' || e.propertyName === 'stroke' || e.propertyName === 'box-shadow' || e.propertyName === 'text-decoration-color') {
                    if (doneTimer) clearTimeout(doneTimer);
                    doneTimer = setTimeout(cleanup, debounce);
                }
            }
            root.addEventListener('transitionend', onEnd, true);
            doneTimer = setTimeout(cleanup, fallback);
        });
    };
})();

(function () {
    const interactives = document.querySelectorAll('.sd-card, .admonition, a:not(.headerlink), button');
    for (const el of interactives) {
        el.addEventListener('pointerdown', () => el.classList.add('is-active'), { passive: true });
        el.addEventListener('pointerup', () => el.classList.remove('is-active'), { passive: true });
        el.addEventListener('pointerleave', () => el.classList.remove('is-active'), { passive: true });
        el.addEventListener('blur', () => el.classList.remove('is-active'), { passive: true });
    }
})();

(function () {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    const figures = document.querySelectorAll('#content figure.zoom:not([data-zoom-ready]) > :is(img, .face-tag-wrap)');
    for (const el of figures) {
        const figure = el.parentElement;
        if (!figure || figure.dataset.zoomReady === 'true') continue;
        const isFaceWrap = el.classList && el.classList.contains('face-tag-wrap');
        const img = isFaceWrap ? el.querySelector('img') : el;
        if (!img) { figure.dataset.zoomReady = 'true'; continue; }
        if (img.classList.contains('no-zoom')) { figure.dataset.zoomReady = 'true'; continue; }
        const wrapper = document.createElement('div');
        wrapper.className = 'zoom-inner';
        wrapper.style.position = 'relative';
        wrapper.style.overflow = 'hidden';
        wrapper.style.borderRadius = 'var(--radius)';
        wrapper.style.lineHeight = '0';
        wrapper.style.display = 'block';
        if (isFaceWrap) {
            el.style.display = 'block';
            el.style.lineHeight = '0';
        } else if (img instanceof HTMLImageElement) {
            img.style.borderRadius = '0';
            img.style.display = 'block';
            img.style.width = '100%';
            img.style.height = 'auto';
        }
        const scale = document.createElement('div');
        scale.className = 'zoom-scale';
        scale.style.transformOrigin = 'center';
        scale.style.transition = 'transform var(--duration-slow) var(--ease-in-out)';
        scale.style.display = 'block';
        scale.style.lineHeight = '0';
        figure.insertBefore(wrapper, el);
        wrapper.appendChild(scale);
        scale.appendChild(el);
        wrapper.addEventListener('pointerenter', () => { scale.style.transform = 'scale(1.02)'; }, { passive: true });
        wrapper.addEventListener('pointerleave', () => { scale.style.transform = 'scale(1)'; }, { passive: true });
        figure.dataset.zoomReady = 'true';
    }
    const singles = document.querySelectorAll('#content img.zoom:not(figure img):not(.no-zoom):not([data-zoom-ready])');
    for (const img of singles) {
        if (img.dataset.zoomReady === 'true') continue;
        const wrapper = document.createElement('div');
        wrapper.className = 'zoom-inner';
        wrapper.style.position = 'relative';
        wrapper.style.overflow = 'hidden';
        wrapper.style.borderRadius = 'var(--radius)';
        wrapper.style.lineHeight = '0';
        wrapper.style.display = 'block';

        wrapper.style.margin = '4rem auto';

        img.style.margin = '0';
        img.style.borderRadius = '0';
        img.style.display = 'block';
        img.style.width = '100%';
        img.style.height = 'auto';

        const scale = document.createElement('div');
        scale.className = 'zoom-scale';
        scale.style.transformOrigin = 'center';
        scale.style.transition = 'transform var(--duration-slow) var(--ease-in-out)';
        scale.style.display = 'block';
        scale.style.lineHeight = '0';

        const parent = img.parentElement;
        parent.insertBefore(wrapper, img);
        wrapper.appendChild(scale);
        scale.appendChild(img);

        wrapper.addEventListener('pointerenter', () => { scale.style.transform = 'scale(1.02)'; }, { passive: true });
        wrapper.addEventListener('pointerleave', () => { scale.style.transform = 'scale(1)'; }, { passive: true });

        img.dataset.zoomReady = 'true';
    }
})();

function initLeftSidebarAccordion() {
    const sidebars = document.querySelectorAll('.site-sidebar--primary');
    if (!sidebars.length) return;
    sidebars.forEach((sidebar) => {
        let uid = 0;
        function setExpanded(li, expanded) {
            li.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        }
        function collapseOthers(except) {
            const open = sidebar.querySelectorAll('li.has-children[aria-expanded="true"]');
            for (const o of open) {
                if (o !== except) setExpanded(o, false);
            }
        }
        function toggle(li) {
            const isOpen = li.getAttribute('aria-expanded') === 'true';
            if (isOpen) setExpanded(li, false); else { collapseOthers(li); setExpanded(li, true); }
        }
        const listItems = sidebar.querySelectorAll('li');
        for (const li of listItems) {
            const childList = li.querySelector(':scope > ul');
            const anchor = li.querySelector(':scope > a, :scope > p > a');
            if (!childList || !anchor) continue;
            childList.removeAttribute('hidden');
            childList.style.removeProperty('display');
            li.classList.add('has-children');
            const controlId = childList.id || `nav-branch-${++uid}`;
            childList.id = controlId;
            const btn = li.querySelector(':scope > button.nav-toggle, :scope > a > button.nav-toggle');
            if (btn) btn.setAttribute('aria-controls', controlId);
            const branchIsCurrent = li.classList.contains('current') || anchor.classList.contains('current') || !!li.querySelector(':scope > ul .current');
            if (branchIsCurrent) {
                setExpanded(li, false);
                requestAnimationFrame(() => setExpanded(li, true));
            } else {
                setExpanded(li, false);
            }
            // Allow link to navigate; only the chevron button toggles
            if (btn) btn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); toggle(li); }, { passive: false });
            anchor.addEventListener('click', (e) => {
                const href = anchor.getAttribute('href') || '';
                if (href && !href.startsWith('#')) {
                    e.preventDefault();
                    e.stopPropagation();
                    collapseOthers(li);
                    setExpanded(li, true);
                    const d = (window.simpleGetDurationMs ? simpleGetDurationMs('--duration-normal', 500) : 500);
                    setTimeout(() => { window.location.href = href; }, d);
                } else {
                    e.preventDefault();
                    e.stopPropagation();
                    toggle(li);
                }
            }, { passive: false });
            anchor.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); toggle(li); }
                if (e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); collapseOthers(li); setExpanded(li, true); }
                if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); setExpanded(li, false); }
            });
        }
        sidebar.addEventListener('click', (e) => {
            const toggleBtn = e.target.closest('button.nav-toggle');
            if (toggleBtn && sidebar.contains(toggleBtn)) {
                const li = toggleBtn.closest('li');
                if (li && li.classList.contains('has-children')) {
                    e.preventDefault();
                    e.stopPropagation();
                    toggle(li);
                    return;
                }
            }
        }, { passive: false });
        // Keyboard activation uses the button's native behavior (Enter/Space)
        const expanded = sidebar.querySelectorAll('li.has-children[aria-expanded="true"]');
        if (expanded.length > 1) {
            let keep = Array.from(expanded).find(li => li.querySelector(':scope .current')) || expanded[0];
            collapseOthers(keep);
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLeftSidebarAccordion);
} else {
    initLeftSidebarAccordion();
}

(function () {
    try {
        document.querySelectorAll('[x-cloak]').forEach(el => { el.removeAttribute('x-cloak'); el.style.removeProperty('display'); });
    } catch { }
    if (document.body.dataset.sidebarInit === '1') return;
    document.body.dataset.sidebarInit = '1';
    function qsAll(sel, root = document) {
        return Array.from(root.querySelectorAll(sel));
    }
    function initMobileSidebar() {
        const sidebar = document.querySelector('.site-sidebar--primary');
        if (!sidebar) return;

        let backdrop = document.querySelector('.site-sidebar__backdrop');
        if (!backdrop) {
            backdrop = document.createElement('div');
            backdrop.className = 'site-sidebar__backdrop';
            document.body.appendChild(backdrop);
        }
        const toggles = qsAll('[data-sidebar-toggle]');
        const closers = qsAll('[data-sidebar-close]');
        function open() {
            document.body.classList.add('site-body--sidebar-open');
            document.body.classList.add('site-body--locked');
        }
        function close() {
            document.body.classList.remove('site-body--sidebar-open');
            document.body.classList.remove('site-body--locked');
        }
        function toggle(e) {
            if (e) e.preventDefault();
            if (document.body.classList.contains('site-body--sidebar-open')) close();
            else open();
        }
        toggles.forEach(btn => btn.addEventListener('click', toggle, { passive: false }));
        backdrop.addEventListener('click', close);
        closers.forEach(btn => btn.addEventListener('click', (e) => { e.preventDefault(); close(); }));
        document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
        sidebar.addEventListener('click', e => { if (e.target.closest('a')) close(); });
        let lastW = window.innerWidth;
        window.addEventListener('resize', () => {
            const w = window.innerWidth;
            if (w !== lastW) {
                if (w >= 1024) close();
                lastW = w;
            }
        }, { passive: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMobileSidebar, { once: true });
    } else {
        initMobileSidebar();
    }
})();

// Promote sidebar captions into header nav dropdowns
(function () {
    function buildHeaderNavDropdowns() {
        const nav = document.querySelector('.site-header__nav-tree');
        if (!nav) return;
        const captions = Array.from(nav.querySelectorAll('p.caption'));
        if (!captions.length) return;
        let uid = 0;

        captions.forEach((caption) => {
            const list = caption.nextElementSibling;
            if (!list || list.tagName !== 'UL') return;

            const wrapper = document.createElement('div');
            wrapper.className = 'site-header__nav-group';
            caption.parentNode.insertBefore(wrapper, caption);
            wrapper.appendChild(caption);
            wrapper.appendChild(list);

            const listId = list.id || `nav-group-${uid += 1}`;
            list.id = listId;
            caption.setAttribute('tabindex', '0');
            caption.setAttribute('role', 'button');
            caption.setAttribute('aria-haspopup', 'true');
            caption.setAttribute('aria-controls', listId);
            caption.setAttribute('aria-expanded', 'false');

            let openTimer = null;
            let closeTimer = null;

            const open = () => {
                clearTimeout(closeTimer);
                openTimer = setTimeout(() => {
                    wrapper.classList.add('is-open');
                    caption.setAttribute('aria-expanded', 'true');
                }, 40);
            };

            const close = () => {
                clearTimeout(openTimer);
                closeTimer = setTimeout(() => {
                    wrapper.classList.remove('is-open');
                    caption.setAttribute('aria-expanded', 'false');
                }, 140);
            };

            caption.addEventListener('mouseenter', open, { passive: true });
            wrapper.addEventListener('mouseenter', open, { passive: true });
            wrapper.addEventListener('mouseleave', close, { passive: true });
            caption.addEventListener('focus', open, { passive: true });
            wrapper.addEventListener('focusout', (e) => {
                if (!wrapper.contains(e.relatedTarget)) {
                    close();
                }
            });

            caption.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (wrapper.classList.contains('is-open')) {
                        close();
                    } else {
                        open();
                    }
                }

                if (e.key === 'Escape') {
                    close();
                    caption.blur();
                }
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', buildHeaderNavDropdowns, { once: true });
    } else {
        buildHeaderNavDropdowns();
    }
})();

(function () {
    function initPlaceholderAnimation() {
        const input = document.querySelector('.DocSearch-Button-Placeholder');
        if (!input) {
            setTimeout(initPlaceholderAnimation, 100);
            return;
        }
        function generatePlaceholders() {
            const navLinks = document.querySelectorAll('#left-sidebar a, nav a, .toctree a');
            const pageNames = new Set();
            navLinks.forEach(link => {
                const href = link.getAttribute('href');
                if (href && !href.startsWith('#') && !href.startsWith('http')) {
                    const text = link.textContent.trim();
                    if (text && text.length > 2 &&
                        !text.match(/^(home|index|back|next|previous|toc|contents)$/i)) {
                        pageNames.add(text);
                    }
                }
            });
            if (pageNames.size < 3) {
                const headings = document.querySelectorAll('h1, h2, .document-title, .page-title');
                headings.forEach(heading => {
                    const text = heading.textContent.trim();
                    if (text && text.length > 2) {
                        pageNames.add(text);
                    }
                });
            }
            const titles = Array.from(pageNames).slice(0, 6);
            const prefixes = ['Search for', 'Read more about', 'Explore', 'Discover', 'Learn about'];
            const placeholders = [];
            titles.forEach((title, index) => {
                const prefix = prefixes[index % prefixes.length];
                placeholders.push(`${prefix} ${title}`);
            });
            if (placeholders.length === 0) {
                return [
                    'Search for content',
                    'Find documentation',
                    'Explore projects',
                    'Discover guides'
                ];
            }
            return placeholders;
        }
        const placeholders = generatePlaceholders();
        let currentText = '';
        let placeholderIndex = 0;
        let charIndex = 0;
        let typing = true;
        function typePlaceholder() {
            const fullText = placeholders[placeholderIndex];
            if (typing) {
                currentText = fullText.slice(0, charIndex++);
                input.textContent = currentText;
                if (charIndex > fullText.length) {
                    typing = false;
                    setTimeout(typePlaceholder, 5500);
                    return;
                }
            } else {
                currentText = fullText.slice(0, --charIndex);
                input.textContent = currentText;
                if (charIndex === 0) {
                    typing = true;
                    placeholderIndex = (placeholderIndex + 1) % placeholders.length;
                }
            }
            const delay = typing ? 100 : 50;
            setTimeout(typePlaceholder, delay);
        }
        typePlaceholder();
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPlaceholderAnimation);
    }
})();

document.addEventListener('DOMContentLoaded', function () {
    const h1Elements = document.querySelectorAll('h1');
    h1Elements.forEach(h1 => {
        const originalText = h1.textContent;
        const trimmedText = originalText.replace(/^\s+/, '');
        if (originalText !== trimmedText) {
            h1.textContent = trimmedText;
        }
    });
});

(function () {
    function intersectOnce(nodes, onEnter) {
        const list = Array.from(nodes);
        if (!list.length) return;
        if (!('IntersectionObserver' in window)) {
            list.forEach(onEnter);
            return;
        }
        const io = new IntersectionObserver((entries) => {
            for (const e of entries) {
                if (e.isIntersecting) {
                    io.unobserve(e.target);
                    onEnter(e.target);
                }
            }
        }, { rootMargin: '200px' });
        list.forEach(n => io.observe(n));
    }

    function withTimeout(promise, ms) {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), ms);
        return Promise.race([
            fetch(promise, { signal: ctrl.signal }),
            new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms + 10))
        ]).finally(() => clearTimeout(t));
    }

    function resolveYouTubeTargets(card) {
        if (!card) return { host: null, titleEl: null, channelEl: null };
        const host = card.matches('[data-youtube-id]') ? card : card.closest('[data-youtube-id]');
        if (!host) return { host: null, titleEl: null, channelEl: null };
        const titleEl = host.querySelector('.site-youtube-card__title');
        const channelEl = host.querySelector('.site-youtube-card__channel');
        return { host, titleEl, channelEl };
    }

    async function enrichYouTubeCard(card) {
        const { host, titleEl, channelEl } = resolveYouTubeTargets(card);
        if (!host || host.dataset.youtubeEnriched === '1') return;
        const vid = host.getAttribute('data-youtube-id');
        if (!vid) { host.dataset.youtubeEnriched = '1'; return; }
        const url = 'https://www.youtube.com/oembed?url=' + encodeURIComponent('https://www.youtube.com/watch?v=' + vid) + '&format=json';
        try {
            const res = await withTimeout(url, 8000);
            if (!res.ok) throw new Error(String(res.status));
            const data = await res.json();
            if (titleEl && data.title) titleEl.textContent = data.title;
            if (channelEl && data.author_name) channelEl.textContent = data.author_name;
        } catch (_) {
        } finally {
            host.dataset.youtubeEnriched = '1';
        }
    }

    function bootYouTubeOEmbed() {
        const cards = document.querySelectorAll('.site-youtube-card[data-youtube-id], .youtube-card-container[data-youtube-id]');
        if (!cards.length) return;
        intersectOnce(cards, enrichYouTubeCard);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootYouTubeOEmbed);
    } else {
        bootYouTubeOEmbed();
    }
})();

function formatNumber(num) {
    if (num >= 1000) {
        return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    }
    return num;
}

(function (C, A, L) {
    let p = function (a, ar) { a.q.push(ar); };
    let d = C.document;
    C.Cal = C.Cal || function () {
        let cal = C.Cal;
        let ar = arguments;
        if (!cal.loaded) {
            cal.ns = {};
            cal.q = cal.q || [];
            d.head.appendChild(d.createElement('script')).src = A;
            cal.loaded = true;
        } if (ar[0] === L) {
            const api = function () {
                p(api, arguments);

            };
            const namespace = ar[1];
            api.q = api.q || [];
            if (typeof namespace === 'string') {
                cal.ns[namespace] = cal.ns[namespace] || api;
                p(cal.ns[namespace], ar);
                p(cal, ['initNamespace', namespace]);

            } else p(cal, ar);
            return;
        } p(cal, ar);
    };
})(window, 'https://app.cal.com/embed/embed.js', 'init');
Cal('init', 'quick-chat', { origin: 'https://app.cal.com' });
Cal.ns['quick-chat']('ui',
    {
        'hideEventTypeDetails': false,
        'layout': 'month_view'
    });

// Based on this tutorial: https://www.youtube.com/watch?v=W5oawMJaXbU
const SUPPORTED = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 ,.';
/**
 * Scramble text effect for elements
 * @param {string | NodeList | HTMLElement[]} target
 * @param {number} speed
 */
function scrambleText(target, speed = 30) {
    let elements;
    if (typeof target === 'string') {
        elements = document.querySelectorAll(target);
    } else if (target instanceof NodeList || Array.isArray(target)) {
        elements = target;
    } else {
        elements = [target];
    }

    elements.forEach(element => {
        const originalText = element.innerText;
        let iteration = 0;

        const interval = setInterval(() => {
            element.innerText = originalText
                .split('')
                .map((char, index) => {
                    if (index < iteration) return originalText[index];
                    if (!SUPPORTED.includes(char)) return char;

                    return SUPPORTED[
                        Math.floor(Math.random() * SUPPORTED.length)
                    ];
                })
                .join('');

            if (iteration >= originalText.length) {
                clearInterval(interval);
                element.innerText = originalText;
            }

            iteration += 1 / 3;
        }, speed);
    });
}
// To use this effect:
// scrambleText('.scramble');
// scrambleText(document.querySelector('h1'), 20);
// scrambleText(document.querySelectorAll('.scramble'), 40);
