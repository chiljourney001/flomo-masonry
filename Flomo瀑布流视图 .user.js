// ==UserScript==
// @name         Flomo 瀑布流视图 
// @namespace    https://github.com/chiljourney001
// @version      22.0
// @description  瀑布流视图，根据窗口宽度自动调整列数
// @author       @山形依旧
// @match        https://v.flomoapp.com/*
// @match        https://flomoapp.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const MAX_COLUMNS = 3;
    const MIN_COL_WIDTH = 300;
    const GAP = 16;
    const SIDEBAR_WIDTH = 200;

    let lastCardCount = 0;
    let layoutTimer = null;

    function calculateColumns() {
        const containerWidth = window.innerWidth;
        const availableWidth = containerWidth - SIDEBAR_WIDTH;

        for (let cols = MAX_COLUMNS; cols >= 1; cols--) {
            const requiredWidth = cols * MIN_COL_WIDTH + (cols - 1) * GAP;
            if (availableWidth >= requiredWidth) {
                return cols;
            }
        }
        return 1;
    }

    function applyMasonryLayout() {
        const container = document.querySelector('.memos');
        const scrollContainer = document.querySelector('.container');
        if (!container || !scrollContainer) return;

        const cards = Array.from(container.querySelectorAll('.memo:not(.loading)'));
        if (cards.length === 0) return;

        const currentCount = cards.length;
        if (currentCount !== lastCardCount) {
            console.log(`🎨 布局: ${lastCardCount} → ${currentCount} 个卡片`);
            lastCardCount = currentCount;
        }

        const cols = calculateColumns();
        const containerWidth = container.offsetWidth;
        const colWidth = (containerWidth - (cols - 1) * GAP) / cols;
        const colHeights = new Array(cols).fill(0);

        container.style.position = 'relative';
        container.style.width = '100%';

        cards.forEach((card) => {
            card.style.position = 'absolute';
            card.style.visibility = 'visible';
            card.style.width = `${colWidth}px`;
            card.style.boxSizing = 'border-box';

            const shortestCol = colHeights.indexOf(Math.min(...colHeights));
            const left = shortestCol * (colWidth + GAP);
            const top = colHeights[shortestCol];

            card.style.left = `${left}px`;
            card.style.top = `${top}px`;

            const cardHeight = card.getBoundingClientRect().height;
            colHeights[shortestCol] += cardHeight + GAP;
        });

        const maxHeight = Math.max(...colHeights);

        // 用 CSS 变量 + ::after 伪元素撑开高度
        container.style.setProperty('--masonry-height', `${maxHeight}px`);

        // loading 元素放在最高列底部
        const loader = container.querySelector('.loading');
        if (loader) {
            loader.style.position = 'absolute';
            loader.style.top = `${maxHeight}px`;
            loader.style.width = '100%';
            loader.style.left = '0';
        }

        // 检查是否完全加载
        const text = container.innerText || '';
        const fullyLoaded = text.includes('已全部加载笔记') || text.includes('已全部加載筆記');

        if (fullyLoaded) {
            console.log(`✅ 完全加载，共 ${currentCount} 条笔记`);
        } else {
            console.log(`📊 当前 ${currentCount} 条，继续加载中...`);
        }
    }

    function addBaseStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* 强制所有父容器占满视窗 */
            .web-container,
            .pc,
            .gpEWy,
            .hwnvay,
            .main-container {
                height: 100vh !important;
                max-height: 100vh !important;
                min-height: 100vh !important;
            }

            /* .container 固定为视窗高度 */
            .container {
                overflow-y: auto !important;
                overflow-x: hidden !important;
                height: 100vh !important;
                max-height: 100vh !important;
                min-height: 100vh !important;
            }

            /* 🔑 memo自然高度 */
            .memos {
                height: none !important;
                min-height: none !important;
                max-height: none !important;
            }

            .memo:not(.loading) {
                transition: none !important;
                box-sizing: border-box !important;
            }

            /* 用伪元素撑开容器高度 */
            .memos::after {
                content: '' !important;
                display: block !important;
                height: var(--masonry-height, auto) !important;
                width: 1px !important;
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                pointer-events: none !important;
                visibility: hidden !important;
            }
        `;
        document.head.appendChild(style);
    }

    function init() {
        addBaseStyles();

        const container = document.querySelector('.memos');
        if (!container) {
            setTimeout(init, 500);
            return;
        }

        console.log('🌊 Flomo 瀑布流 v22.0 FINAL 已加载');
        console.log('💡 完美配置：全屏 + 自动加载 + 流畅滚动');

        // 监听内容变化
        const observer = new MutationObserver(() => {
            clearTimeout(layoutTimer);
            layoutTimer = setTimeout(applyMasonryLayout, 100);
        });

        observer.observe(container, {
            childList: true,
            subtree: true
        });

        // 初始布局
        setTimeout(applyMasonryLayout, 1000);

        // 窗口大小变化
        let lastScrollRatio = 0;
        window.addEventListener('resize', () => {
            const scrollContainer = document.querySelector('.container');
            if (scrollContainer) {
                const scrollTop = scrollContainer.scrollTop;
                const scrollHeight = scrollContainer.scrollHeight;
                lastScrollRatio = scrollHeight > 0 ? scrollTop / scrollHeight : 0;
            }

            clearTimeout(layoutTimer);
            layoutTimer = setTimeout(() => {
                applyMasonryLayout();

                setTimeout(() => {
                    const scrollContainer = document.querySelector('.container');
                    if (scrollContainer && lastScrollRatio > 0) {
                        const newScrollHeight = scrollContainer.scrollHeight;
                        scrollContainer.scrollTop = newScrollHeight * lastScrollRatio;
                    }
                }, 100);
            }, 300);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
