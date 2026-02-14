// ==UserScript==
// @name         Flomo 瀑布流视图（卡片宽度自适应版）
// @namespace    https://github.com/chiljourney001
// @version      22.3
// @description  移除宽度限制，充分利用屏幕空间
// @author       @山形依旧
// @match        https://v.flomoapp.com/*
// @match        https://flomoapp.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // ============= 🎛️ 可自定义参数 =============
    const MAX_COLUMNS = 3;        // 最多显示几列（1-6）
    const MIN_COL_WIDTH = 300;    // 每列最小宽度（px），低于此值减少列数
    const GAP = 16;               // 卡片间距（px）
    const SIDEBAR_WIDTH = 250;    // 左侧边栏宽度（px）
    // =========================================

    let lastCardCount = 0;
    let layoutTimer = null;
    let currentCols = MAX_COLUMNS;

    // 🔢 根据窗口宽度计算最佳列数
    function calculateColumns() {
        const containerWidth = window.innerWidth;
        const availableWidth = containerWidth - SIDEBAR_WIDTH;

        // 从最大列数开始，找到能容纳的最大列数
        for (let cols = MAX_COLUMNS; cols >= 1; cols--) {
            const requiredWidth = cols * MIN_COL_WIDTH + (cols - 1) * GAP;
            if (availableWidth >= requiredWidth) {
                return cols;
            }
        }
        return 1; // 至少1列
    }

    function applyMasonryLayout() {
        const container = document.querySelector('.memos');
        const scrollContainer = document.querySelector('.container');
        if (!container || !scrollContainer) return;

        const cards = Array.from(container.querySelectorAll('.memo:not(.loading)'));
        if (cards.length === 0) return;

        const currentCount = cards.length;
        const cols = calculateColumns();

        // 检测列数变化
        if (cols !== currentCols) {
            console.log(`📐 列数调整: ${currentCols} → ${cols} 列`);
            currentCols = cols;
        }

        if (currentCount !== lastCardCount) {
            console.log(`🎨 布局: ${currentCount} 个卡片 (${cols}列)`);
            lastCardCount = currentCount;
        }

        // 🔑 获取容器实际宽度，平均分配给各列
        const containerWidth = container.offsetWidth;
        const colWidth = (containerWidth - (cols - 1) * GAP) / cols;

        console.log(`📏 容器宽度: ${Math.round(containerWidth)}px, 每列宽度: ${Math.round(colWidth)}px`);

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
        container.style.setProperty('--masonry-height', `${maxHeight}px`);

        const loader = container.querySelector('.loading');
        if (loader) {
            loader.style.position = 'absolute';
            loader.style.top = `${maxHeight}px`;
            loader.style.width = '100%';
            loader.style.left = '0';
        }

        const text = container.innerText || '';
        const fullyLoaded = text.includes('已全部加载笔记') || text.includes('已全部加載筆記');

        if (fullyLoaded && currentCount !== lastCardCount) {
            console.log(`✅ 完全加载，共 ${currentCount} 条笔记`);
        }
    }

    function addBaseStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* 🔑 v2.2 的核心：移除所有父容器的宽度限制 */
            main,
            .main-content,
            .content,
            [class*="main"],
            [class*="content-wrapper"],
            [class*="container"] {
                max-width: none !important;
                width: 100% !important;
            }
            /* 强制所有父容器占满视窗 */
            .web-container,
            .pc,
            .gpEWy,
            .hwnvay,
            .main-container {
                height: 100vh !important;
                max-height: 100vh !important;
                min-height: 100vh !important;
                max-width: none !important;  /* 🔑 移除宽度限制 */
                width: 100% !important;
            }
            /* .container 固定为视窗高度 */
            .container {
                overflow-y: auto !important;
                overflow-x: hidden !important;
                height: 100vh !important;
                max-height: 100vh !important;
                min-height: 100vh !important;
                max-width: none !important;  /* 🔑 移除宽度限制 */
                width: 100% !important;
            }
            /* 🔑 关键设置：height: none */
            .memos {
                height: none !important;
                min-height: none !important;
                max-height: none !important;
                max-width: none !important;  /* 🔑 移除宽度限制 */
                width: 100% !important;
            }
            .memo:not(.loading) {
                transition: none !important;
                box-sizing: border-box !important;
                max-width: none !important;  /* 🔑 移除宽度限制 */
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

        const cols = calculateColumns();
        console.log('🌊 Flomo 瀑布流 v22.3 已加载');
        console.log(`📐 宽度自适应: 最多${MAX_COLUMNS}列, 每列最小${MIN_COL_WIDTH}px`);
        console.log(`📊 当前窗口: ${cols}列 (列宽自动拉伸)`);

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
        let resizeTimer = null;

        window.addEventListener('resize', () => {
            const scrollContainer = document.querySelector('.container');
            if (scrollContainer) {
                const scrollTop = scrollContainer.scrollTop;
                const scrollHeight = scrollContainer.scrollHeight;
                lastScrollRatio = scrollHeight > 0 ? scrollTop / scrollHeight : 0;
            }

            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                const newCols = calculateColumns();
                if (newCols !== currentCols) {
                    console.log(`📐 窗口变化: ${currentCols} → ${newCols} 列`);
                }

                applyMasonryLayout();

                setTimeout(() => {
                    const scrollContainer = document.querySelector('.container');
                    if (scrollContainer && lastScrollRatio > 0) {
                        const newScrollHeight = scrollContainer.scrollHeight;
                        scrollContainer.scrollTop = newScrollHeight * lastScrollRatio;
                    }
                }, 100);
            }, 250);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
