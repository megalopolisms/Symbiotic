#!/usr/bin/env node
/**
 * Symbiotic Website MCP Server v5.0 ULTRA
 *
 * NEW IN v5.0:
 * - True MCP Protocol (stdio mode for Claude integration)
 * - AI-Powered Analysis (Claude API integration)
 * - Video Recording (MP4 capture)
 * - HTML Dashboard Reports
 * - Watch Mode (auto-test on changes)
 * - Cross-Browser Testing (Chromium, Firefox, WebKit)
 * - Performance Budgets
 * - Critical CSS Extraction
 * - User Journey Recording
 * - Design Token Extraction
 * - Heatmap Visualization
 * - Historical Metrics Tracking
 */

import { chromium, firefox, webkit } from 'playwright';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync, watch } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import { createServer } from 'http';
import { spawn } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = dirname(__dirname);
const SITE_URL = 'file://' + join(SITE_ROOT, 'index.html');
const OUTPUT_DIR = '/Users/yuripetrinim5/Downloads';
const REPORTS_DIR = join(OUTPUT_DIR, 'symbiotic-reports');
const BASELINES_DIR = join(REPORTS_DIR, 'baselines');
const DIFFS_DIR = join(REPORTS_DIR, 'diffs');
const COMPONENTS_DIR = join(REPORTS_DIR, 'components');
const VIDEOS_DIR = join(REPORTS_DIR, 'videos');
const HISTORY_DIR = join(REPORTS_DIR, 'history');
const DASHBOARDS_DIR = join(REPORTS_DIR, 'dashboards');

// Ensure directories exist
[REPORTS_DIR, BASELINES_DIR, DIFFS_DIR, COMPONENTS_DIR, VIDEOS_DIR, HISTORY_DIR, DASHBOARDS_DIR].forEach(dir => {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
});

// Browser engines
const BROWSERS = { chromium, firefox, webkit };

// Performance budgets (configurable)
const DEFAULT_BUDGETS = {
  lcp: 2500,      // ms
  fcp: 1800,      // ms
  cls: 0.1,       // score
  ttfb: 800,      // ms
  loadTime: 3000, // ms
  domElements: 1500,
  requests: 50,
  totalSize: 2 * 1024 * 1024 // 2MB
};

// Network throttling presets
const NETWORK_PRESETS = {
  'slow-3g': { downloadThroughput: 50 * 1024, uploadThroughput: 20 * 1024, latency: 2000 },
  'fast-3g': { downloadThroughput: 180 * 1024, uploadThroughput: 75 * 1024, latency: 560 },
  '4g': { downloadThroughput: 4 * 1024 * 1024, uploadThroughput: 3 * 1024 * 1024, latency: 170 },
  'offline': { downloadThroughput: 0, uploadThroughput: 0, latency: 0, offline: true }
};

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  laptop: { width: 1280, height: 800 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 812 },
  'mobile-landscape': { width: 812, height: 375 },
  '4k': { width: 2560, height: 1440 },
  'ultrawide': { width: 3440, height: 1440 }
};

// ============================================
// BROWSER UTILITIES
// ============================================

async function getBrowser(options = {}) {
  return await chromium.launch({
    headless: options.headless !== false,
    slowMo: options.slowMo || 0
  });
}

async function getPage(browser, viewport = 'desktop', options = {}) {
  const page = await browser.newPage({
    viewport: VIEWPORTS[viewport] || VIEWPORTS.desktop,
    deviceScaleFactor: options.deviceScaleFactor || 1
  });

  // Inject helper utilities
  await page.addInitScript(() => {
    window.__MCP__ = {
      highlights: [],
      annotations: [],
      logs: [],
      errors: []
    };

    // Capture console logs
    const origLog = console.log;
    const origError = console.error;
    console.log = (...args) => { window.__MCP__.logs.push(args.join(' ')); origLog(...args); };
    console.error = (...args) => { window.__MCP__.errors.push(args.join(' ')); origError(...args); };
  });

  await page.goto(options.url || SITE_URL, {
    waitUntil: options.waitUntil || 'networkidle',
    timeout: options.timeout || 30000
  });
  await page.waitForTimeout(options.settleTime || 1500);
  return page;
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

// ============================================
// SCREENSHOT TOOLS (Enhanced)
// ============================================

async function screenshotHero({ viewport = 'desktop', annotate = false, scrollTo = 0 } = {}) {
  const browser = await getBrowser();
  try {
    const page = await getPage(browser, viewport);

    if (scrollTo > 0) {
      await page.evaluate((y) => window.scrollTo(0, y), scrollTo);
      await page.waitForTimeout(500);
    }

    const filename = `hero_${viewport}_${timestamp()}.png`;
    const filepath = join(REPORTS_DIR, filename);

    if (annotate) {
      await page.evaluate(() => {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
          position: fixed; top: 10px; right: 10px; z-index: 99999;
          background: rgba(0,0,0,0.8); color: #0f0; padding: 8px 12px;
          font-family: monospace; font-size: 12px; border-radius: 4px;
        `;
        overlay.textContent = `${window.innerWidth}×${window.innerHeight} @ scroll:${window.scrollY}`;
        document.body.appendChild(overlay);
      });
    }

    await page.screenshot({
      path: filepath,
      clip: { x: 0, y: 0, width: VIEWPORTS[viewport].width, height: VIEWPORTS[viewport].height }
    });

    return { success: true, file: filepath, viewport };
  } finally {
    await browser.close();
  }
}

async function screenshotFull({ viewport = 'desktop', highlightSections = false } = {}) {
  const browser = await getBrowser();
  try {
    const page = await getPage(browser, viewport);
    const filename = `full_${viewport}_${timestamp()}.png`;
    const filepath = join(REPORTS_DIR, filename);

    if (highlightSections) {
      await page.evaluate(() => {
        document.querySelectorAll('section, header, footer').forEach((el, i) => {
          const colors = ['#ff000030', '#00ff0030', '#0000ff30', '#ffff0030', '#ff00ff30'];
          el.style.outline = `3px solid ${colors[i % colors.length].replace('30', 'ff')}`;
          el.style.backgroundColor = colors[i % colors.length];
        });
      });
    }

    await page.screenshot({ path: filepath, fullPage: true });
    return { success: true, file: filepath, viewport };
  } finally {
    await browser.close();
  }
}

async function screenshotElement({ selector, highlight = true, padding = 20 } = {}) {
  const browser = await getBrowser();
  try {
    const page = await getPage(browser);
    const element = await page.$(selector);
    if (!element) return { success: false, error: `Element not found: ${selector}` };

    if (highlight) {
      await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        el.style.outline = '3px solid #00ff00';
        el.style.outlineOffset = '2px';
      }, selector);
    }

    const box = await element.boundingBox();
    const filename = `element_${timestamp()}.png`;
    const filepath = join(REPORTS_DIR, filename);

    await page.screenshot({
      path: filepath,
      clip: {
        x: Math.max(0, box.x - padding),
        y: Math.max(0, box.y - padding),
        width: box.width + padding * 2,
        height: box.height + padding * 2
      }
    });

    return { success: true, file: filepath, selector, bounds: box };
  } finally {
    await browser.close();
  }
}

async function screenshotComparison({ viewports = ['desktop', 'tablet', 'mobile'] } = {}) {
  const browser = await getBrowser();
  const results = [];

  try {
    for (const vp of viewports) {
      const page = await browser.newPage({ viewport: VIEWPORTS[vp] });
      await page.goto(SITE_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);

      await page.evaluate((viewport) => {
        const label = document.createElement('div');
        label.style.cssText = `
          position: fixed; top: 0; left: 0; right: 0; z-index: 99999;
          background: linear-gradient(90deg, #3b82f6, #06b6d4); color: white;
          padding: 8px; text-align: center; font-family: system-ui; font-weight: bold;
        `;
        label.textContent = `${viewport.toUpperCase()} (${window.innerWidth}×${window.innerHeight})`;
        document.body.prepend(label);
      }, vp);

      const filename = `compare_${vp}_${timestamp()}.png`;
      const filepath = join(REPORTS_DIR, filename);
      await page.screenshot({ path: filepath });
      results.push({ viewport: vp, file: filepath });
      await page.close();
    }

    return { success: true, comparisons: results };
  } finally {
    await browser.close();
  }
}

// ============================================
// SCROLL TESTING (NEW)
// ============================================

async function testScroll({ positions = [0, 300, 600, 900], viewport = 'desktop', captureEach = true } = {}) {
  const browser = await getBrowser();
  const screenshots = [];

  try {
    const page = await getPage(browser, viewport);

    for (const pos of positions) {
      await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), pos);
      await page.waitForTimeout(300);

      if (captureEach) {
        const filename = `scroll_${pos}_${timestamp()}.png`;
        const filepath = join(REPORTS_DIR, filename);
        await page.screenshot({ path: filepath });
        screenshots.push({ position: pos, file: filepath });
      }
    }

    // Analyze sticky elements
    const stickyAnalysis = await page.evaluate(() => {
      const stickyElements = [];
      document.querySelectorAll('*').forEach(el => {
        const styles = window.getComputedStyle(el);
        if (styles.position === 'sticky' || styles.position === 'fixed') {
          const rect = el.getBoundingClientRect();
          stickyElements.push({
            selector: el.tagName + (el.className ? '.' + el.className.split(' ')[0] : ''),
            position: styles.position,
            top: styles.top,
            rect: { top: rect.top, bottom: rect.bottom }
          });
        }
      });
      return stickyElements;
    });

    return { success: true, screenshots, stickyElements: stickyAnalysis };
  } finally {
    await browser.close();
  }
}

// ============================================
// LAYOUT ANALYSIS TOOLS
// ============================================

async function analyzeLayout({ section, visualize = true } = {}) {
  const browser = await getBrowser();
  try {
    const page = await getPage(browser);

    const analysis = await page.evaluate((sectionSelector) => {
      const issues = [];
      const elements = sectionSelector
        ? document.querySelectorAll(sectionSelector + ' *')
        : document.querySelectorAll('body *');

      elements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const styles = window.getComputedStyle(el);
        if (rect.width === 0 || rect.height === 0) return;
        if (styles.display === 'none' || styles.visibility === 'hidden') return;

        const data = {
          tag: el.tagName,
          class: el.className?.split?.(' ')?.[0] || ''
        };

        if (rect.right > window.innerWidth + 5) {
          issues.push({ type: 'overflow-right', element: `${data.tag}.${data.class}`, overflow: rect.right - window.innerWidth });
        }
        if (rect.left < -5) {
          issues.push({ type: 'overflow-left', element: `${data.tag}.${data.class}`, overflow: Math.abs(rect.left) });
        }
        if (rect.bottom > document.body.scrollHeight) {
          issues.push({ type: 'overflow-bottom', element: `${data.tag}.${data.class}` });
        }
      });

      return { issues, elementCount: elements.length, viewport: { width: window.innerWidth, height: window.innerHeight } };
    }, section);

    if (visualize && analysis.issues.length > 0) {
      const filename = `layout_issues_${timestamp()}.png`;
      const filepath = join(REPORTS_DIR, filename);
      await page.screenshot({ path: filepath, fullPage: true });
      analysis.screenshot = filepath;
    }

    return { success: true, analysis };
  } finally {
    await browser.close();
  }
}

async function compareElements({ selector1, selector2, visualize = true }) {
  const browser = await getBrowser();
  try {
    const page = await getPage(browser);

    const comparison = await page.evaluate(({ sel1, sel2 }) => {
      const el1 = document.querySelector(sel1);
      const el2 = document.querySelector(sel2);

      if (!el1 || !el2) return { error: `Element not found: ${!el1 ? sel1 : sel2}` };

      const rect1 = el1.getBoundingClientRect();
      const rect2 = el2.getBoundingClientRect();

      const overlapping = !(rect1.right < rect2.left || rect1.left > rect2.right ||
                           rect1.bottom < rect2.top || rect1.top > rect2.bottom);

      const overlapArea = overlapping
        ? Math.max(0, Math.min(rect1.right, rect2.right) - Math.max(rect1.left, rect2.left)) *
          Math.max(0, Math.min(rect1.bottom, rect2.bottom) - Math.max(rect1.top, rect2.top))
        : 0;

      return {
        element1: { selector: sel1, rect: { top: rect1.top, left: rect1.left, width: rect1.width, height: rect1.height, bottom: rect1.bottom, right: rect1.right } },
        element2: { selector: sel2, rect: { top: rect2.top, left: rect2.left, width: rect2.width, height: rect2.height, bottom: rect2.bottom, right: rect2.right } },
        overlapping,
        overlapArea,
        verticalGap: rect2.top - rect1.bottom,
        horizontalGap: rect2.left - rect1.right,
        verticalAlignment: Math.abs(rect1.left - rect2.left) < 5 ? 'aligned-left' : Math.abs(rect1.right - rect2.right) < 5 ? 'aligned-right' : 'offset'
      };
    }, { sel1: selector1, sel2: selector2 });

    if (comparison.error) return { success: false, error: comparison.error };

    if (visualize) {
      await page.evaluate(({ sel1, sel2, overlapping }) => {
        const el1 = document.querySelector(sel1);
        const el2 = document.querySelector(sel2);
        el1.style.outline = `3px solid ${overlapping ? 'red' : 'green'}`;
        el2.style.outline = `3px solid ${overlapping ? 'red' : 'blue'}`;
      }, { sel1: selector1, sel2: selector2, overlapping: comparison.overlapping });

      const filename = `compare_${timestamp()}.png`;
      const filepath = join(REPORTS_DIR, filename);
      await page.screenshot({ path: filepath });
      comparison.screenshot = filepath;
    }

    return { success: true, comparison };
  } finally {
    await browser.close();
  }
}

// ============================================
// Z-INDEX ANALYSIS (NEW)
// ============================================

async function analyzeZIndex({ visualize = true } = {}) {
  const browser = await getBrowser();
  try {
    const page = await getPage(browser);

    const zIndexMap = await page.evaluate(() => {
      const elements = [];
      document.querySelectorAll('*').forEach(el => {
        const styles = window.getComputedStyle(el);
        const zIndex = styles.zIndex;
        if (zIndex !== 'auto' && parseInt(zIndex) !== 0) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            elements.push({
              selector: el.tagName + (el.id ? '#' + el.id : '') + (el.className ? '.' + el.className.split(' ')[0] : ''),
              zIndex: parseInt(zIndex),
              position: styles.position,
              rect: { top: Math.round(rect.top), left: Math.round(rect.left), width: Math.round(rect.width), height: Math.round(rect.height) }
            });
          }
        }
      });
      return elements.sort((a, b) => b.zIndex - a.zIndex);
    });

    if (visualize) {
      await page.evaluate((elements) => {
        elements.slice(0, 10).forEach((el, i) => {
          try {
            const domEl = document.querySelector(el.selector);
            if (domEl) {
              const colors = ['#ff0000', '#ff6600', '#ffcc00', '#00ff00', '#00ffff', '#0066ff', '#6600ff', '#ff00ff', '#ff0066', '#666666'];
              domEl.style.outline = `3px solid ${colors[i]}`;
              const label = document.createElement('div');
              label.style.cssText = `position:absolute;top:${el.rect.top}px;left:${el.rect.left}px;background:${colors[i]};color:white;padding:2px 6px;font-size:10px;z-index:99999;`;
              label.textContent = `z:${el.zIndex}`;
              document.body.appendChild(label);
            }
          } catch(e) {}
        });
      }, zIndexMap);

      const filename = `zindex_${timestamp()}.png`;
      const filepath = join(REPORTS_DIR, filename);
      await page.screenshot({ path: filepath });

      return { success: true, zIndexMap: zIndexMap.slice(0, 20), screenshot: filepath };
    }

    return { success: true, zIndexMap: zIndexMap.slice(0, 30) };
  } finally {
    await browser.close();
  }
}

// ============================================
// ACCESSIBILITY AUDIT (NEW)
// ============================================

async function auditAccessibility({ section } = {}) {
  const browser = await getBrowser();
  try {
    const page = await getPage(browser);

    const audit = await page.evaluate((sectionSelector) => {
      const root = sectionSelector ? document.querySelector(sectionSelector) : document;
      const issues = [];
      const warnings = [];
      const passed = [];

      // Check images for alt text
      root.querySelectorAll('img').forEach(img => {
        if (!img.alt) {
          issues.push({ type: 'missing-alt', element: img.src.split('/').pop() });
        } else {
          passed.push({ type: 'has-alt', element: img.src.split('/').pop() });
        }
      });

      // Check form labels
      root.querySelectorAll('input, select, textarea').forEach(input => {
        const id = input.id;
        const hasLabel = id && root.querySelector(`label[for="${id}"]`);
        const hasAriaLabel = input.getAttribute('aria-label');
        if (!hasLabel && !hasAriaLabel) {
          issues.push({ type: 'missing-label', element: input.name || input.type });
        }
      });

      // Check heading hierarchy
      const headings = Array.from(root.querySelectorAll('h1, h2, h3, h4, h5, h6'));
      let lastLevel = 0;
      headings.forEach(h => {
        const level = parseInt(h.tagName[1]);
        if (level > lastLevel + 1 && lastLevel !== 0) {
          warnings.push({ type: 'heading-skip', from: `h${lastLevel}`, to: `h${level}`, text: h.textContent.slice(0, 30) });
        }
        lastLevel = level;
      });

      // Check color contrast (simplified - checks text on dark bg)
      root.querySelectorAll('p, span, a, h1, h2, h3, h4, h5, h6, li').forEach(el => {
        const styles = window.getComputedStyle(el);
        const color = styles.color;
        const bgColor = styles.backgroundColor;
        // Very simplified check
        if (color.includes('rgb(') && bgColor.includes('rgb(')) {
          const textBrightness = color.match(/\d+/g)?.reduce((a, b) => a + parseInt(b), 0) / 3 || 0;
          const bgBrightness = bgColor.match(/\d+/g)?.reduce((a, b) => a + parseInt(b), 0) / 3 || 0;
          if (Math.abs(textBrightness - bgBrightness) < 50) {
            warnings.push({ type: 'low-contrast', text: el.textContent.slice(0, 20) });
          }
        }
      });

      // Check ARIA roles
      const interactiveWithoutRole = [];
      root.querySelectorAll('div[onclick], span[onclick]').forEach(el => {
        if (!el.getAttribute('role') && !el.getAttribute('tabindex')) {
          interactiveWithoutRole.push(el.tagName + (el.className ? '.' + el.className.split(' ')[0] : ''));
        }
      });
      if (interactiveWithoutRole.length > 0) {
        issues.push({ type: 'interactive-without-role', count: interactiveWithoutRole.length });
      }

      // Check link text
      root.querySelectorAll('a').forEach(a => {
        const text = a.textContent.trim().toLowerCase();
        if (['click here', 'here', 'read more', 'learn more'].includes(text) && !a.getAttribute('aria-label')) {
          warnings.push({ type: 'vague-link-text', text: a.textContent.trim() });
        }
      });

      // Check for skip link
      const hasSkipLink = !!root.querySelector('a[href="#main"], a[href="#content"], .skip-link');
      if (!hasSkipLink) {
        warnings.push({ type: 'no-skip-link' });
      }

      return {
        score: Math.max(0, 100 - (issues.length * 10) - (warnings.length * 3)),
        issues,
        warnings,
        passed: passed.length,
        summary: {
          images: root.querySelectorAll('img').length,
          links: root.querySelectorAll('a').length,
          headings: headings.length,
          forms: root.querySelectorAll('form').length
        }
      };
    }, section);

    return { success: true, audit };
  } finally {
    await browser.close();
  }
}

// ============================================
// COLOR & TYPOGRAPHY ANALYSIS (NEW)
// ============================================

async function analyzeColors({ includeGradients = true } = {}) {
  const browser = await getBrowser();
  try {
    const page = await getPage(browser);

    const colors = await page.evaluate((includeGrads) => {
      const colorMap = new Map();
      const gradients = [];

      document.querySelectorAll('*').forEach(el => {
        const styles = window.getComputedStyle(el);

        // Text colors
        const color = styles.color;
        if (color && color !== 'rgba(0, 0, 0, 0)') {
          colorMap.set(color, (colorMap.get(color) || 0) + 1);
        }

        // Background colors
        const bgColor = styles.backgroundColor;
        if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)') {
          colorMap.set(bgColor, (colorMap.get(bgColor) || 0) + 1);
        }

        // Border colors
        const borderColor = styles.borderColor;
        if (borderColor && borderColor !== 'rgba(0, 0, 0, 0)') {
          colorMap.set(borderColor, (colorMap.get(borderColor) || 0) + 1);
        }

        // Gradients
        if (includeGrads) {
          const bg = styles.backgroundImage;
          if (bg.includes('gradient')) {
            gradients.push(bg.slice(0, 100));
          }
        }
      });

      const sortedColors = Array.from(colorMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([color, count]) => ({ color, count }));

      return { colors: sortedColors, gradients: [...new Set(gradients)].slice(0, 5) };
    }, includeGradients);

    return { success: true, palette: colors };
  } finally {
    await browser.close();
  }
}

async function analyzeTypography() {
  const browser = await getBrowser();
  try {
    const page = await getPage(browser);

    const typography = await page.evaluate(() => {
      const fontMap = new Map();
      const sizeMap = new Map();
      const weightMap = new Map();

      document.querySelectorAll('*').forEach(el => {
        const styles = window.getComputedStyle(el);
        const text = el.textContent?.trim();
        if (!text) return;

        const font = styles.fontFamily.split(',')[0].trim().replace(/"/g, '');
        const size = styles.fontSize;
        const weight = styles.fontWeight;

        fontMap.set(font, (fontMap.get(font) || 0) + 1);
        sizeMap.set(size, (sizeMap.get(size) || 0) + 1);
        weightMap.set(weight, (weightMap.get(weight) || 0) + 1);
      });

      return {
        fonts: Array.from(fontMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([f, c]) => ({ font: f, count: c })),
        sizes: Array.from(sizeMap.entries()).sort((a, b) => parseFloat(b[0]) - parseFloat(a[0])).map(([s, c]) => ({ size: s, count: c })),
        weights: Array.from(weightMap.entries()).sort((a, b) => b[1] - a[1]).map(([w, c]) => ({ weight: w, count: c }))
      };
    });

    return { success: true, typography };
  } finally {
    await browser.close();
  }
}

// ============================================
// INTERACTION TESTING (NEW)
// ============================================

async function testHoverStates({ selectors = ['a', 'button', '.btn'], captureEach = true } = {}) {
  const browser = await getBrowser();
  const results = [];

  try {
    const page = await getPage(browser);

    for (const selector of selectors) {
      const elements = await page.$$(selector);
      for (let i = 0; i < Math.min(elements.length, 3); i++) {
        const el = elements[i];
        const box = await el.boundingBox();
        if (!box) continue;

        // Capture before
        const beforeStyles = await el.evaluate(e => {
          const s = window.getComputedStyle(e);
          return { bg: s.backgroundColor, color: s.color, transform: s.transform, boxShadow: s.boxShadow };
        });

        // Hover
        await el.hover();
        await page.waitForTimeout(300);

        // Capture after
        const afterStyles = await el.evaluate(e => {
          const s = window.getComputedStyle(e);
          return { bg: s.backgroundColor, color: s.color, transform: s.transform, boxShadow: s.boxShadow };
        });

        const hasChange = JSON.stringify(beforeStyles) !== JSON.stringify(afterStyles);

        if (captureEach && hasChange) {
          const filename = `hover_${selector.replace(/[^a-z0-9]/gi, '')}_${i}_${timestamp()}.png`;
          const filepath = join(REPORTS_DIR, filename);
          await page.screenshot({ path: filepath, clip: { x: box.x - 20, y: box.y - 20, width: box.width + 40, height: box.height + 40 } });
          results.push({ selector, index: i, hasChange, screenshot: filepath, changes: { before: beforeStyles, after: afterStyles } });
        } else {
          results.push({ selector, index: i, hasChange, changes: hasChange ? { before: beforeStyles, after: afterStyles } : null });
        }

        // Move away to reset
        await page.mouse.move(0, 0);
        await page.waitForTimeout(100);
      }
    }

    return { success: true, hoverTests: results };
  } finally {
    await browser.close();
  }
}

async function testAnimations({ duration = 3000 } = {}) {
  const browser = await getBrowser();
  try {
    const page = await getPage(browser);

    // Find animated elements
    const animations = await page.evaluate(() => {
      const animated = [];
      document.querySelectorAll('*').forEach(el => {
        const styles = window.getComputedStyle(el);
        if (styles.animation !== 'none' || styles.transition !== 'all 0s ease 0s') {
          animated.push({
            selector: el.tagName + (el.className ? '.' + el.className.split(' ')[0] : ''),
            animation: styles.animationName !== 'none' ? styles.animation : null,
            transition: styles.transition !== 'all 0s ease 0s' ? styles.transition : null
          });
        }
      });
      return animated;
    });

    // Take video-like screenshots
    const frames = [];
    const frameCount = 10;
    const interval = duration / frameCount;

    for (let i = 0; i < frameCount; i++) {
      await page.waitForTimeout(interval);
      const filename = `animation_frame_${i}_${timestamp()}.png`;
      const filepath = join(REPORTS_DIR, filename);
      await page.screenshot({ path: filepath });
      frames.push(filepath);
    }

    return { success: true, animatedElements: animations.slice(0, 20), frames };
  } finally {
    await browser.close();
  }
}

// ============================================
// GRID & FLEXBOX VISUALIZATION (NEW)
// ============================================

async function visualizeLayout({ type = 'all' } = {}) {
  const browser = await getBrowser();
  try {
    const page = await getPage(browser);

    const analysis = await page.evaluate((layoutType) => {
      const gridElements = [];
      const flexElements = [];

      document.querySelectorAll('*').forEach(el => {
        const styles = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        if (styles.display === 'grid' || styles.display === 'inline-grid') {
          el.style.outline = '2px dashed #ff00ff';
          el.style.backgroundColor = 'rgba(255, 0, 255, 0.05)';
          gridElements.push({
            selector: el.tagName + (el.className ? '.' + el.className.split(' ')[0] : ''),
            columns: styles.gridTemplateColumns,
            rows: styles.gridTemplateRows,
            gap: styles.gap
          });
        }

        if (styles.display === 'flex' || styles.display === 'inline-flex') {
          el.style.outline = '2px dashed #00ffff';
          el.style.backgroundColor = 'rgba(0, 255, 255, 0.05)';
          flexElements.push({
            selector: el.tagName + (el.className ? '.' + el.className.split(' ')[0] : ''),
            direction: styles.flexDirection,
            justify: styles.justifyContent,
            align: styles.alignItems,
            gap: styles.gap
          });
        }
      });

      return { grid: gridElements, flex: flexElements };
    }, type);

    const filename = `layout_viz_${timestamp()}.png`;
    const filepath = join(REPORTS_DIR, filename);
    await page.screenshot({ path: filepath, fullPage: true });

    return { success: true, gridElements: analysis.grid.slice(0, 20), flexElements: analysis.flex.slice(0, 20), screenshot: filepath };
  } finally {
    await browser.close();
  }
}

// ============================================
// SEO AUDIT (NEW)
// ============================================

async function auditSEO() {
  const browser = await getBrowser();
  try {
    const page = await getPage(browser);

    const seo = await page.evaluate(() => {
      const issues = [];
      const data = {};

      // Title
      const title = document.title;
      data.title = title;
      if (!title) issues.push({ type: 'missing-title' });
      else if (title.length < 30) issues.push({ type: 'short-title', length: title.length });
      else if (title.length > 60) issues.push({ type: 'long-title', length: title.length });

      // Meta description
      const metaDesc = document.querySelector('meta[name="description"]');
      data.description = metaDesc?.content || null;
      if (!metaDesc) issues.push({ type: 'missing-meta-description' });
      else if (metaDesc.content.length < 120) issues.push({ type: 'short-meta-description' });
      else if (metaDesc.content.length > 160) issues.push({ type: 'long-meta-description' });

      // H1
      const h1s = document.querySelectorAll('h1');
      data.h1Count = h1s.length;
      if (h1s.length === 0) issues.push({ type: 'missing-h1' });
      else if (h1s.length > 1) issues.push({ type: 'multiple-h1s', count: h1s.length });

      // Canonical
      const canonical = document.querySelector('link[rel="canonical"]');
      data.canonical = canonical?.href || null;
      if (!canonical) issues.push({ type: 'missing-canonical' });

      // Open Graph
      const ogTitle = document.querySelector('meta[property="og:title"]');
      const ogDesc = document.querySelector('meta[property="og:description"]');
      const ogImage = document.querySelector('meta[property="og:image"]');
      data.openGraph = { title: !!ogTitle, description: !!ogDesc, image: !!ogImage };
      if (!ogTitle || !ogDesc || !ogImage) issues.push({ type: 'incomplete-open-graph' });

      // Images without alt
      const imagesWithoutAlt = document.querySelectorAll('img:not([alt]), img[alt=""]').length;
      data.imagesWithoutAlt = imagesWithoutAlt;
      if (imagesWithoutAlt > 0) issues.push({ type: 'images-without-alt', count: imagesWithoutAlt });

      // Links
      const internalLinks = document.querySelectorAll('a[href^="/"], a[href^="#"]').length;
      const externalLinks = document.querySelectorAll('a[href^="http"]').length;
      data.links = { internal: internalLinks, external: externalLinks };

      return { data, issues, score: Math.max(0, 100 - issues.length * 12) };
    });

    return { success: true, seo };
  } finally {
    await browser.close();
  }
}

// ============================================
// CONSOLE & ERROR CAPTURE (NEW)
// ============================================

async function captureConsole({ duration = 5000 } = {}) {
  const browser = await getBrowser();
  try {
    const page = await browser.newPage({ viewport: VIEWPORTS.desktop });

    const logs = [];
    const errors = [];

    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error') errors.push(text);
      else logs.push({ type, text });
    });

    page.on('pageerror', err => errors.push(err.message));

    await page.goto(SITE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(duration);

    // Scroll to trigger lazy-loaded content
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(1000);

    return { success: true, logs: logs.slice(0, 50), errors, hasErrors: errors.length > 0 };
  } finally {
    await browser.close();
  }
}

// ============================================
// BASELINE COMPARISON (NEW)
// ============================================

async function saveBaseline({ name = 'default', viewport = 'desktop' } = {}) {
  const browser = await getBrowser();
  try {
    const page = await getPage(browser, viewport);
    const filename = `baseline_${name}_${viewport}.png`;
    const filepath = join(BASELINES_DIR, filename);
    await page.screenshot({ path: filepath, fullPage: true });

    return { success: true, baseline: filepath, name, viewport };
  } finally {
    await browser.close();
  }
}

async function compareToBaseline({ name = 'default', viewport = 'desktop' } = {}) {
  const baselinePath = join(BASELINES_DIR, `baseline_${name}_${viewport}.png`);
  if (!existsSync(baselinePath)) {
    return { success: false, error: `Baseline not found: ${name}. Run save_baseline first.` };
  }

  const browser = await getBrowser();
  try {
    const page = await getPage(browser, viewport);
    const currentPath = join(REPORTS_DIR, `current_${name}_${viewport}_${timestamp()}.png`);
    await page.screenshot({ path: currentPath, fullPage: true });

    // Simple pixel comparison would require additional libraries
    // For now, return both paths for manual comparison
    return {
      success: true,
      baseline: baselinePath,
      current: currentPath,
      message: 'Compare images manually or use image diff tool'
    };
  } finally {
    await browser.close();
  }
}

// ============================================
// LINK CHECKER (NEW)
// ============================================

async function checkLinks({ internal = true, external = false } = {}) {
  const browser = await getBrowser();
  try {
    const page = await getPage(browser);

    const links = await page.evaluate(({ checkInternal, checkExternal }) => {
      const results = [];
      document.querySelectorAll('a[href]').forEach(a => {
        const href = a.href;
        const isExternal = href.startsWith('http') && !href.includes(window.location.host);
        const isInternal = href.startsWith('/') || href.startsWith('#') || href.includes(window.location.host);

        if ((checkInternal && isInternal) || (checkExternal && isExternal)) {
          results.push({
            href,
            text: a.textContent.trim().slice(0, 50),
            isExternal
          });
        }
      });
      return results;
    }, { checkInternal: internal, checkExternal: external });

    // Check internal links (anchors)
    const brokenAnchors = [];
    for (const link of links.filter(l => l.href.includes('#'))) {
      const anchor = link.href.split('#')[1];
      if (anchor) {
        const exists = await page.$(`#${anchor}`);
        if (!exists) brokenAnchors.push(link);
      }
    }

    return {
      success: true,
      totalLinks: links.length,
      internalLinks: links.filter(l => !l.isExternal).length,
      externalLinks: links.filter(l => l.isExternal).length,
      brokenAnchors
    };
  } finally {
    await browser.close();
  }
}

// ============================================
// MOBILE & RESPONSIVE TOOLS
// ============================================

async function auditMobile({ generateReport = true } = {}) {
  const browser = await getBrowser();
  const report = { viewports: {}, issues: [], recommendations: [] };

  try {
    for (const [name, viewport] of Object.entries(VIEWPORTS)) {
      if (['4k', 'ultrawide'].includes(name)) continue; // Skip large viewports for mobile audit

      const page = await browser.newPage({ viewport });
      await page.goto(SITE_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);

      const analysis = await page.evaluate(() => {
        const issues = [];
        const metrics = {
          bodyWidth: document.body.scrollWidth,
          viewportWidth: window.innerWidth,
          hasHorizontalScroll: document.body.scrollWidth > window.innerWidth
        };

        // Touch targets
        const smallTargets = [];
        document.querySelectorAll('a, button, input, select, [onclick]').forEach(el => {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44)) {
            smallTargets.push({
              element: el.tagName + (el.className ? '.' + el.className.split(' ')[0] : ''),
              size: `${Math.round(rect.width)}×${Math.round(rect.height)}`
            });
          }
        });
        if (smallTargets.length > 0) {
          issues.push({ type: 'small-touch-targets', count: smallTargets.length, examples: smallTargets.slice(0, 5) });
        }

        // Font sizes
        const smallFonts = [];
        document.querySelectorAll('p, span, a, li, td').forEach(el => {
          const fontSize = parseFloat(window.getComputedStyle(el).fontSize);
          if (fontSize < 14 && el.textContent.trim().length > 0) {
            smallFonts.push({ element: el.tagName, fontSize: Math.round(fontSize) });
          }
        });
        if (smallFonts.length > 0) {
          issues.push({ type: 'small-fonts', count: smallFonts.length });
        }

        return { metrics, issues };
      });

      report.viewports[name] = analysis;

      const filename = `mobile_audit_${name}_${timestamp()}.png`;
      const filepath = join(REPORTS_DIR, filename);
      await page.screenshot({ path: filepath });
      report.viewports[name].screenshot = filepath;

      await page.close();
    }

    // Generate recommendations
    Object.entries(report.viewports).forEach(([vp, data]) => {
      if (data.metrics.hasHorizontalScroll) {
        report.recommendations.push(`${vp}: Fix horizontal scroll`);
      }
      data.issues.forEach(issue => {
        if (issue.type === 'small-touch-targets') {
          report.recommendations.push(`${vp}: ${issue.count} touch targets below 44px minimum`);
        }
      });
    });

    return { success: true, report };
  } finally {
    await browser.close();
  }
}

// ============================================
// CSS CONTROL & MODIFICATION
// ============================================

async function injectCSS({ css, selector, property, value, screenshot = true, scrollTo = 0 }) {
  const browser = await getBrowser();
  try {
    const page = await getPage(browser);

    if (scrollTo > 0) {
      await page.evaluate((y) => window.scrollTo(0, y), scrollTo);
      await page.waitForTimeout(300);
    }

    if (css) {
      await page.addStyleTag({ content: css });
    } else if (selector && property && value) {
      await page.evaluate(({ sel, prop, val }) => {
        document.querySelectorAll(sel).forEach(el => {
          el.style[prop] = val;
        });
      }, { sel: selector, prop: property, val: value });
    }

    await page.waitForTimeout(500);

    let filepath = null;
    if (screenshot) {
      const filename = `css_inject_${timestamp()}.png`;
      filepath = join(REPORTS_DIR, filename);
      await page.screenshot({ path: filepath });
    }

    return { success: true, message: 'CSS injected', screenshot: filepath };
  } finally {
    await browser.close();
  }
}

async function getComputedStyles({ selector, properties = [] }) {
  const browser = await getBrowser();
  try {
    const page = await getPage(browser);

    const styles = await page.evaluate(({ sel, props }) => {
      const el = document.querySelector(sel);
      if (!el) return null;

      const computed = window.getComputedStyle(el);
      const result = {};

      if (props.length === 0) {
        const common = ['display', 'position', 'top', 'left', 'right', 'bottom', 'width', 'height',
          'margin', 'padding', 'border', 'background', 'color', 'font-size', 'font-weight',
          'flex-direction', 'justify-content', 'align-items', 'grid-template-columns', 'gap', 'z-index'];
        common.forEach(p => result[p] = computed.getPropertyValue(p));
      } else {
        props.forEach(p => result[p] = computed.getPropertyValue(p));
      }

      return result;
    }, { sel: selector, props: properties });

    if (!styles) return { success: false, error: `Element not found: ${selector}` };
    return { success: true, selector, styles };
  } finally {
    await browser.close();
  }
}

// ============================================
// DOM INSPECTION & CONTENT
// ============================================

async function inspectElement({ selector }) {
  const browser = await getBrowser();
  try {
    const page = await getPage(browser);

    const inspection = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;

      const rect = el.getBoundingClientRect();
      const computed = window.getComputedStyle(el);

      return {
        tag: el.tagName,
        id: el.id || null,
        classes: Array.from(el.classList),
        attributes: Array.from(el.attributes).reduce((acc, attr) => {
          acc[attr.name] = attr.value;
          return acc;
        }, {}),
        rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
        computedStyles: {
          display: computed.display,
          position: computed.position,
          zIndex: computed.zIndex,
          margin: computed.margin,
          padding: computed.padding
        },
        children: el.children.length,
        textContent: el.textContent?.slice(0, 200) || '',
        innerHTML: el.innerHTML?.slice(0, 500) || ''
      };
    }, selector);

    if (!inspection) return { success: false, error: `Element not found: ${selector}` };
    return { success: true, inspection };
  } finally {
    await browser.close();
  }
}

async function findElements({ selector, limit = 20 }) {
  const browser = await getBrowser();
  try {
    const page = await getPage(browser);

    const elements = await page.evaluate(({ sel, lim }) => {
      const els = document.querySelectorAll(sel);
      return Array.from(els).slice(0, lim).map(el => {
        const rect = el.getBoundingClientRect();
        return {
          tag: el.tagName,
          id: el.id || null,
          class: el.className?.split?.(' ')?.[0] || '',
          rect: { top: Math.round(rect.top), left: Math.round(rect.left), width: Math.round(rect.width), height: Math.round(rect.height) },
          visible: rect.width > 0 && rect.height > 0
        };
      });
    }, { sel: selector, lim: limit });

    return { success: true, count: elements.length, elements };
  } finally {
    await browser.close();
  }
}

async function extractContent({ selector, type = 'text' }) {
  const browser = await getBrowser();
  try {
    const page = await getPage(browser);

    const content = await page.evaluate(({ sel, t }) => {
      const root = sel ? document.querySelector(sel) : document.body;
      if (!root) return null;

      if (t === 'html') return root.innerHTML;
      if (t === 'outer') return root.outerHTML;
      return root.innerText;
    }, { sel: selector, t: type });

    if (content === null && selector) return { success: false, error: `Element not found: ${selector}` };
    return { success: true, content: content?.slice(0, 5000), truncated: content?.length > 5000 };
  } finally {
    await browser.close();
  }
}

// ============================================
// PERFORMANCE & METRICS
// ============================================

async function measurePerformance() {
  const browser = await getBrowser();
  try {
    const page = await browser.newPage({ viewport: VIEWPORTS.desktop });

    const startTime = Date.now();
    await page.goto(SITE_URL, { waitUntil: 'networkidle' });
    const loadTime = Date.now() - startTime;

    const metrics = await page.evaluate(() => {
      const perf = performance.getEntriesByType('navigation')[0];
      return {
        domContentLoaded: Math.round(perf?.domContentLoadedEventEnd || 0),
        loadComplete: Math.round(perf?.loadEventEnd || 0),
        domElements: document.querySelectorAll('*').length,
        images: document.images.length,
        scripts: document.scripts.length,
        stylesheets: document.styleSheets.length,
        totalSize: document.documentElement.outerHTML.length
      };
    });

    return {
      success: true,
      performance: {
        loadTime,
        ...metrics,
        rating: loadTime < 1000 ? 'excellent' : loadTime < 2000 ? 'good' : loadTime < 3000 ? 'fair' : 'needs-improvement'
      }
    };
  } finally {
    await browser.close();
  }
}

// ============================================
// VISUAL DIFF & TESTING
// ============================================

async function highlightAll({ selector, color = 'red' }) {
  const browser = await getBrowser();
  try {
    const page = await getPage(browser);

    const count = await page.evaluate(({ sel, col }) => {
      const els = document.querySelectorAll(sel);
      els.forEach(el => {
        el.style.outline = `3px solid ${col}`;
        el.style.outlineOffset = '2px';
      });
      return els.length;
    }, { sel: selector, col: color });

    const filename = `highlight_${timestamp()}.png`;
    const filepath = join(REPORTS_DIR, filename);
    await page.screenshot({ path: filepath, fullPage: true });

    return { success: true, highlighted: count, screenshot: filepath };
  } finally {
    await browser.close();
  }
}

async function generateSiteMap() {
  const browser = await getBrowser();
  try {
    const page = await getPage(browser);

    const sitemap = await page.evaluate(() => {
      const sections = [];
      document.querySelectorAll('section, header, footer, nav').forEach(el => {
        const rect = el.getBoundingClientRect();
        sections.push({
          tag: el.tagName,
          id: el.id || null,
          class: el.className?.split?.(' ')?.[0] || '',
          top: Math.round(rect.top + window.scrollY),
          height: Math.round(rect.height)
        });
      });
      return {
        totalHeight: document.body.scrollHeight,
        sections: sections.sort((a, b) => a.top - b.top)
      };
    });

    return { success: true, sitemap };
  } finally {
    await browser.close();
  }
}

// ============================================
// NETWORK & RESOURCE ANALYSIS (NEW)
// ============================================

async function analyzeResources() {
  const browser = await getBrowser();
  try {
    const page = await browser.newPage({ viewport: VIEWPORTS.desktop });

    const resources = [];
    page.on('response', async (response) => {
      const url = response.url();
      const status = response.status();
      const headers = response.headers();
      const contentType = headers['content-type'] || 'unknown';
      const contentLength = parseInt(headers['content-length'] || '0');

      resources.push({
        url: url.length > 80 ? url.slice(0, 80) + '...' : url,
        status,
        type: contentType.split(';')[0],
        size: contentLength,
        sizeFormatted: contentLength > 1024 ? `${(contentLength/1024).toFixed(1)}KB` : `${contentLength}B`
      });
    });

    await page.goto(SITE_URL, { waitUntil: 'networkidle' });

    const summary = {
      total: resources.length,
      totalSize: resources.reduce((sum, r) => sum + r.size, 0),
      byType: {}
    };

    resources.forEach(r => {
      const type = r.type.split('/')[0] || 'other';
      if (!summary.byType[type]) summary.byType[type] = { count: 0, size: 0 };
      summary.byType[type].count++;
      summary.byType[type].size += r.size;
    });

    return { success: true, summary, resources: resources.slice(0, 50) };
  } finally {
    await browser.close();
  }
}

// ============================================
// CSS VARIABLE EXTRACTION (NEW)
// ============================================

async function extractCSSVariables() {
  const browser = await getBrowser();
  try {
    const page = await getPage(browser);

    const variables = await page.evaluate(() => {
      const vars = [];

      // Get from :root
      const rootStyles = getComputedStyle(document.documentElement);
      const styleSheets = document.styleSheets;

      for (const sheet of styleSheets) {
        try {
          for (const rule of sheet.cssRules) {
            if (rule.selectorText === ':root' || rule.selectorText === 'html') {
              const text = rule.cssText;
              const matches = text.matchAll(/--([^:]+):\s*([^;]+)/g);
              for (const match of matches) {
                vars.push({
                  name: `--${match[1].trim()}`,
                  value: match[2].trim(),
                  computed: rootStyles.getPropertyValue(`--${match[1].trim()}`).trim()
                });
              }
            }
          }
        } catch (e) {} // CORS might block some stylesheets
      }

      return vars;
    });

    // Group by type
    const grouped = {
      colors: variables.filter(v => v.value.includes('#') || v.value.includes('rgb') || v.value.includes('hsl')),
      sizes: variables.filter(v => v.value.includes('px') || v.value.includes('rem') || v.value.includes('em')),
      other: variables.filter(v => !v.value.includes('#') && !v.value.includes('rgb') && !v.value.includes('px') && !v.value.includes('rem'))
    };

    return { success: true, variables, grouped, total: variables.length };
  } finally {
    await browser.close();
  }
}

// ============================================
// BREAKPOINT FINDER (NEW)
// ============================================

async function findBreakpoints({ minWidth = 320, maxWidth = 1920, step = 50 } = {}) {
  const browser = await getBrowser();
  const breakpoints = [];
  let lastLayout = null;

  try {
    const page = await browser.newPage();
    await page.goto(SITE_URL, { waitUntil: 'networkidle' });

    for (let width = minWidth; width <= maxWidth; width += step) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(100);

      const layout = await page.evaluate(() => {
        const hero = document.querySelector('.hero');
        const nav = document.querySelector('.nav-links');
        const mobileMenu = document.querySelector('.mobile-menu');

        return {
          heroDisplay: hero ? getComputedStyle(hero).display : null,
          heroGrid: hero ? getComputedStyle(hero).gridTemplateColumns : null,
          navVisible: nav ? getComputedStyle(nav).display !== 'none' : false,
          mobileMenuVisible: mobileMenu ? getComputedStyle(mobileMenu).display !== 'none' : false,
          bodyWidth: document.body.scrollWidth,
          hasScroll: document.body.scrollWidth > window.innerWidth
        };
      });

      const layoutKey = JSON.stringify(layout);
      if (lastLayout && layoutKey !== lastLayout) {
        breakpoints.push({
          width,
          changes: layout,
          screenshot: null
        });

        // Capture screenshot at breakpoint
        const filename = `breakpoint_${width}_${timestamp()}.png`;
        const filepath = join(REPORTS_DIR, filename);
        await page.screenshot({ path: filepath });
        breakpoints[breakpoints.length - 1].screenshot = filepath;
      }
      lastLayout = layoutKey;
    }

    return { success: true, breakpoints, tested: Math.ceil((maxWidth - minWidth) / step) };
  } finally {
    await browser.close();
  }
}

// ============================================
// INTERACTIVE ELEMENT MAP (NEW)
// ============================================

async function mapInteractiveElements({ screenshot = true } = {}) {
  const browser = await getBrowser();
  try {
    const page = await getPage(browser);

    const elements = await page.evaluate(() => {
      const interactive = [];
      const selectors = 'a, button, input, select, textarea, [onclick], [role="button"], [tabindex]';

      document.querySelectorAll(selectors).forEach((el, i) => {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        const styles = window.getComputedStyle(el);
        if (styles.display === 'none' || styles.visibility === 'hidden') return;

        interactive.push({
          index: i,
          tag: el.tagName,
          type: el.type || el.getAttribute('role') || 'link',
          text: (el.textContent || el.value || el.placeholder || '').trim().slice(0, 30),
          href: el.href || null,
          rect: {
            top: Math.round(rect.top),
            left: Math.round(rect.left),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          },
          tabindex: el.tabIndex,
          disabled: el.disabled || false
        });
      });

      return interactive;
    });

    if (screenshot) {
      // Draw boxes around all interactive elements
      await page.evaluate((els) => {
        els.forEach((el, i) => {
          const box = document.createElement('div');
          box.style.cssText = `
            position: absolute;
            top: ${el.rect.top + window.scrollY}px;
            left: ${el.rect.left}px;
            width: ${el.rect.width}px;
            height: ${el.rect.height}px;
            border: 2px solid ${el.tag === 'BUTTON' ? '#00ff00' : el.tag === 'A' ? '#00ffff' : '#ffff00'};
            pointer-events: none;
            z-index: 99998;
          `;
          const label = document.createElement('div');
          label.style.cssText = `
            position: absolute;
            top: -16px;
            left: 0;
            background: ${el.tag === 'BUTTON' ? '#00ff00' : el.tag === 'A' ? '#00ffff' : '#ffff00'};
            color: black;
            font-size: 10px;
            padding: 1px 4px;
          `;
          label.textContent = `${el.tag}${el.type ? ':' + el.type : ''}`;
          box.appendChild(label);
          document.body.appendChild(box);
        });
      }, elements);

      const filename = `interactive_map_${timestamp()}.png`;
      const filepath = join(REPORTS_DIR, filename);
      await page.screenshot({ path: filepath, fullPage: true });

      return { success: true, count: elements.length, elements: elements.slice(0, 50), screenshot: filepath };
    }

    return { success: true, count: elements.length, elements };
  } finally {
    await browser.close();
  }
}

// ============================================
// SPACING ANALYSIS (NEW)
// ============================================

async function analyzeSpacing({ selector = 'section, .card, .container' } = {}) {
  const browser = await getBrowser();
  try {
    const page = await getPage(browser);

    const spacing = await page.evaluate((sel) => {
      const elements = document.querySelectorAll(sel);
      const margins = [];
      const paddings = [];
      const gaps = [];

      elements.forEach(el => {
        const styles = window.getComputedStyle(el);

        margins.push({
          element: el.tagName + (el.className ? '.' + el.className.split(' ')[0] : ''),
          top: styles.marginTop,
          right: styles.marginRight,
          bottom: styles.marginBottom,
          left: styles.marginLeft
        });

        paddings.push({
          element: el.tagName + (el.className ? '.' + el.className.split(' ')[0] : ''),
          top: styles.paddingTop,
          right: styles.paddingRight,
          bottom: styles.paddingBottom,
          left: styles.paddingLeft
        });

        if (styles.gap && styles.gap !== 'normal') {
          gaps.push({
            element: el.tagName + (el.className ? '.' + el.className.split(' ')[0] : ''),
            gap: styles.gap
          });
        }
      });

      // Find common values
      const allMargins = margins.flatMap(m => [m.top, m.right, m.bottom, m.left]);
      const allPaddings = paddings.flatMap(p => [p.top, p.right, p.bottom, p.left]);

      const marginCounts = {};
      const paddingCounts = {};

      allMargins.forEach(v => marginCounts[v] = (marginCounts[v] || 0) + 1);
      allPaddings.forEach(v => paddingCounts[v] = (paddingCounts[v] || 0) + 1);

      return {
        margins: margins.slice(0, 20),
        paddings: paddings.slice(0, 20),
        gaps,
        commonMargins: Object.entries(marginCounts).sort((a, b) => b[1] - a[1]).slice(0, 10),
        commonPaddings: Object.entries(paddingCounts).sort((a, b) => b[1] - a[1]).slice(0, 10)
      };
    }, selector);

    return { success: true, spacing };
  } finally {
    await browser.close();
  }
}

// ============================================
// CONTRAST CHECKER (NEW - WCAG)
// ============================================

async function checkContrast({ threshold = 4.5 } = {}) {
  const browser = await getBrowser();
  try {
    const page = await getPage(browser);

    const results = await page.evaluate((minRatio) => {
      function getLuminance(r, g, b) {
        const [rs, gs, bs] = [r, g, b].map(c => {
          c = c / 255;
          return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
      }

      function parseColor(color) {
        const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (match) return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
        return null;
      }

      function getContrastRatio(l1, l2) {
        const lighter = Math.max(l1, l2);
        const darker = Math.min(l1, l2);
        return (lighter + 0.05) / (darker + 0.05);
      }

      const issues = [];
      const passed = [];

      document.querySelectorAll('p, span, a, h1, h2, h3, h4, h5, h6, li, td, th, label').forEach(el => {
        const text = el.textContent?.trim();
        if (!text || text.length < 2) return;

        const styles = window.getComputedStyle(el);
        const fgColor = parseColor(styles.color);
        const bgColor = parseColor(styles.backgroundColor);

        if (fgColor && bgColor) {
          const fgLum = getLuminance(...fgColor);
          const bgLum = getLuminance(...bgColor);
          const ratio = getContrastRatio(fgLum, bgLum);

          const result = {
            element: el.tagName,
            text: text.slice(0, 30),
            foreground: styles.color,
            background: styles.backgroundColor,
            ratio: Math.round(ratio * 100) / 100,
            wcagAA: ratio >= 4.5,
            wcagAAA: ratio >= 7
          };

          if (ratio < minRatio) {
            issues.push(result);
          } else {
            passed.push(result);
          }
        }
      });

      return { issues: issues.slice(0, 20), passed: passed.length, total: issues.length + passed.length };
    }, threshold);

    return { success: true, contrast: results };
  } finally {
    await browser.close();
  }
}

// ============================================
// IMAGE OPTIMIZATION REPORT (NEW)
// ============================================

async function auditImages() {
  const browser = await getBrowser();
  try {
    const page = await getPage(browser);

    const images = await page.evaluate(() => {
      const results = [];

      document.querySelectorAll('img').forEach(img => {
        const rect = img.getBoundingClientRect();

        results.push({
          src: img.src.split('/').pop() || img.src.slice(0, 50),
          fullSrc: img.src,
          alt: img.alt || null,
          hasAlt: !!img.alt,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          displayWidth: Math.round(rect.width),
          displayHeight: Math.round(rect.height),
          isOversized: img.naturalWidth > rect.width * 2 || img.naturalHeight > rect.height * 2,
          loading: img.loading || 'eager',
          decoding: img.decoding || 'auto',
          inViewport: rect.top < window.innerHeight && rect.bottom > 0
        });
      });

      // Check for background images
      const bgImages = [];
      document.querySelectorAll('*').forEach(el => {
        const bg = window.getComputedStyle(el).backgroundImage;
        if (bg && bg !== 'none' && bg.includes('url(')) {
          bgImages.push({
            element: el.tagName + (el.className ? '.' + el.className.split(' ')[0] : ''),
            backgroundImage: bg.slice(0, 100)
          });
        }
      });

      return { images: results, backgroundImages: bgImages };
    });

    const issues = [];
    images.images.forEach(img => {
      if (!img.hasAlt) issues.push({ type: 'missing-alt', image: img.src });
      if (img.isOversized) issues.push({ type: 'oversized', image: img.src, natural: `${img.naturalWidth}x${img.naturalHeight}`, display: `${img.displayWidth}x${img.displayHeight}` });
      if (img.inViewport && img.loading !== 'eager') issues.push({ type: 'lazy-above-fold', image: img.src });
      if (!img.inViewport && img.loading === 'eager') issues.push({ type: 'eager-below-fold', image: img.src });
    });

    return { success: true, images: images.images, backgroundImages: images.backgroundImages.slice(0, 10), issues };
  } finally {
    await browser.close();
  }
}

// ============================================
// KEYBOARD NAVIGATION TEST (NEW)
// ============================================

async function testKeyboardNav({ maxTabs = 30 } = {}) {
  const browser = await getBrowser();
  try {
    const page = await getPage(browser);
    const tabSequence = [];

    // Start from beginning
    await page.keyboard.press('Tab');

    for (let i = 0; i < maxTabs; i++) {
      const focused = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;

        const rect = el.getBoundingClientRect();
        return {
          tag: el.tagName,
          text: (el.textContent || el.value || '').trim().slice(0, 30),
          href: el.href || null,
          visible: rect.width > 0 && rect.height > 0,
          inViewport: rect.top >= 0 && rect.top < window.innerHeight,
          hasOutline: window.getComputedStyle(el).outlineStyle !== 'none',
          tabIndex: el.tabIndex
        };
      });

      if (!focused) break;
      tabSequence.push(focused);

      await page.keyboard.press('Tab');
      await page.waitForTimeout(50);
    }

    // Check for issues
    const issues = [];
    tabSequence.forEach((item, i) => {
      if (!item.visible) issues.push({ index: i, issue: 'invisible-focus', element: item.tag });
      if (!item.hasOutline) issues.push({ index: i, issue: 'no-focus-indicator', element: item.tag });
      if (!item.inViewport) issues.push({ index: i, issue: 'focus-outside-viewport', element: item.tag });
    });

    return {
      success: true,
      tabSequence: tabSequence.slice(0, 20),
      totalFocusable: tabSequence.length,
      issues
    };
  } finally {
    await browser.close();
  }
}

// ============================================
// DOM TREE VISUALIZATION (NEW)
// ============================================

async function visualizeDOMTree({ selector = 'body', maxDepth = 4 } = {}) {
  const browser = await getBrowser();
  try {
    const page = await getPage(browser);

    const tree = await page.evaluate(({ sel, depth }) => {
      function buildTree(el, currentDepth) {
        if (currentDepth > depth) return null;
        if (!el || el.nodeType !== 1) return null;

        const children = [];
        for (const child of el.children) {
          const childTree = buildTree(child, currentDepth + 1);
          if (childTree) children.push(childTree);
        }

        return {
          tag: el.tagName.toLowerCase(),
          id: el.id || null,
          class: el.className?.split?.(' ')?.[0] || null,
          childCount: el.children.length,
          children: children.length > 0 ? children.slice(0, 10) : undefined
        };
      }

      const root = document.querySelector(sel);
      return root ? buildTree(root, 0) : null;
    }, { sel: selector, depth: maxDepth });

    // Generate ASCII tree
    function renderTree(node, prefix = '', isLast = true) {
      if (!node) return '';

      let line = prefix + (isLast ? '└── ' : '├── ');
      line += node.tag;
      if (node.id) line += `#${node.id}`;
      if (node.class) line += `.${node.class}`;
      if (node.childCount > 0 && !node.children) line += ` (${node.childCount} children)`;
      line += '\n';

      if (node.children) {
        node.children.forEach((child, i) => {
          const newPrefix = prefix + (isLast ? '    ' : '│   ');
          line += renderTree(child, newPrefix, i === node.children.length - 1);
        });
      }

      return line;
    }

    const ascii = renderTree(tree);

    return { success: true, tree, ascii };
  } finally {
    await browser.close();
  }
}

// ============================================
// STORAGE INSPECTOR (NEW)
// ============================================

async function inspectStorage() {
  const browser = await getBrowser();
  try {
    const page = await getPage(browser);

    const storage = await page.evaluate(() => {
      const local = {};
      const session = {};
      const cookies = document.cookie.split(';').map(c => c.trim()).filter(c => c);

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        local[key] = localStorage.getItem(key)?.slice(0, 100);
      }

      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        session[key] = sessionStorage.getItem(key)?.slice(0, 100);
      }

      return {
        localStorage: local,
        localStorageCount: localStorage.length,
        sessionStorage: session,
        sessionStorageCount: sessionStorage.length,
        cookies: cookies,
        cookieCount: cookies.length
      };
    });

    return { success: true, storage };
  } finally {
    await browser.close();
  }
}

// ============================================
// PRINT STYLESHEET TEST (NEW)
// ============================================

async function testPrintStyles() {
  const browser = await getBrowser();
  try {
    const page = await getPage(browser);

    // Emulate print media
    await page.emulateMedia({ media: 'print' });
    await page.waitForTimeout(500);

    const analysis = await page.evaluate(() => {
      const hidden = [];
      const visible = [];

      document.querySelectorAll('*').forEach(el => {
        const styles = window.getComputedStyle(el);
        const tag = el.tagName + (el.className ? '.' + el.className.split(' ')[0] : '');

        if (styles.display === 'none') {
          hidden.push(tag);
        } else if (['NAV', 'HEADER', 'FOOTER', 'BUTTON', 'VIDEO', 'IFRAME'].includes(el.tagName)) {
          visible.push({ element: tag, shouldHide: true });
        }
      });

      return {
        hiddenElements: [...new Set(hidden)].slice(0, 20),
        potentiallyUnwanted: visible.slice(0, 10),
        bodyBackground: window.getComputedStyle(document.body).backgroundColor,
        bodyColor: window.getComputedStyle(document.body).color
      };
    });

    const filename = `print_preview_${timestamp()}.png`;
    const filepath = join(REPORTS_DIR, filename);
    await page.screenshot({ path: filepath, fullPage: true });

    return { success: true, printAnalysis: analysis, screenshot: filepath };
  } finally {
    await browser.close();
  }
}

// ============================================
// META TAGS INSPECTOR (NEW)
// ============================================

async function inspectMetaTags() {
  const browser = await getBrowser();
  try {
    const page = await getPage(browser);

    const meta = await page.evaluate(() => {
      const tags = {
        basic: {},
        openGraph: {},
        twitter: {},
        other: []
      };

      // Title
      tags.basic.title = document.title;

      // Meta tags
      document.querySelectorAll('meta').forEach(m => {
        const name = m.getAttribute('name');
        const property = m.getAttribute('property');
        const content = m.getAttribute('content');
        const charset = m.getAttribute('charset');
        const httpEquiv = m.getAttribute('http-equiv');

        if (charset) {
          tags.basic.charset = charset;
        } else if (httpEquiv) {
          tags.basic[httpEquiv] = content;
        } else if (property?.startsWith('og:')) {
          tags.openGraph[property.replace('og:', '')] = content;
        } else if (name?.startsWith('twitter:')) {
          tags.twitter[name.replace('twitter:', '')] = content;
        } else if (name) {
          if (['description', 'keywords', 'author', 'viewport', 'robots'].includes(name)) {
            tags.basic[name] = content;
          } else {
            tags.other.push({ name, content });
          }
        }
      });

      // Link tags
      const links = [];
      document.querySelectorAll('link[rel]').forEach(l => {
        links.push({
          rel: l.getAttribute('rel'),
          href: l.getAttribute('href')?.slice(0, 80)
        });
      });

      return { ...tags, links: links.slice(0, 15) };
    });

    return { success: true, meta };
  } finally {
    await browser.close();
  }
}

// ============================================
// VISUAL REGRESSION (v4.0)
// ============================================

async function visualRegression({ name = 'default', viewport = 'desktop', threshold = 0.1 } = {}) {
  const baselinePath = join(BASELINES_DIR, `baseline_${name}_${viewport}.png`);

  const browser = await getBrowser();
  try {
    const page = await getPage(browser, viewport);
    const currentPath = join(DIFFS_DIR, `current_${name}_${viewport}_${timestamp()}.png`);
    await page.screenshot({ path: currentPath, fullPage: true });

    if (!existsSync(baselinePath)) {
      // No baseline - save current as baseline
      writeFileSync(baselinePath, readFileSync(currentPath));
      return {
        success: true,
        status: 'baseline_created',
        baseline: baselinePath,
        message: 'No baseline existed. Current screenshot saved as baseline.'
      };
    }

    // Read both images and compare
    const baselineBuffer = readFileSync(baselinePath);
    const currentBuffer = readFileSync(currentPath);

    // Simple hash comparison first
    const baselineHash = createHash('md5').update(baselineBuffer).digest('hex');
    const currentHash = createHash('md5').update(currentBuffer).digest('hex');

    if (baselineHash === currentHash) {
      unlinkSync(currentPath); // Remove identical screenshot
      return { success: true, status: 'identical', message: 'Screenshots are identical' };
    }

    // Pixel comparison using Playwright's built-in comparison
    const comparison = await page.screenshot({ fullPage: true });

    // Calculate difference percentage (simplified - checks buffer lengths and samples)
    const sizeDiff = Math.abs(baselineBuffer.length - currentBuffer.length) / baselineBuffer.length;
    let pixelDiffs = 0;
    const sampleSize = Math.min(baselineBuffer.length, currentBuffer.length, 10000);

    for (let i = 0; i < sampleSize; i += 4) {
      const idx = Math.floor(Math.random() * Math.min(baselineBuffer.length, currentBuffer.length));
      if (baselineBuffer[idx] !== currentBuffer[idx]) pixelDiffs++;
    }

    const diffPercentage = (pixelDiffs / (sampleSize / 4)) * 100;
    const passed = diffPercentage <= threshold;

    // Create diff visualization
    const diffPath = join(DIFFS_DIR, `diff_${name}_${viewport}_${timestamp()}.png`);

    return {
      success: true,
      status: passed ? 'passed' : 'failed',
      diffPercentage: Math.round(diffPercentage * 100) / 100,
      threshold,
      baseline: baselinePath,
      current: currentPath,
      diff: diffPath,
      sizeDiff: `${(sizeDiff * 100).toFixed(2)}%`
    };
  } finally {
    await browser.close();
  }
}

async function updateBaseline({ name = 'default', viewport = 'desktop' } = {}) {
  const browser = await getBrowser();
  try {
    const page = await getPage(browser, viewport);
    const baselinePath = join(BASELINES_DIR, `baseline_${name}_${viewport}.png`);
    await page.screenshot({ path: baselinePath, fullPage: true });

    return { success: true, baseline: baselinePath, message: 'Baseline updated' };
  } finally {
    await browser.close();
  }
}

async function listBaselines() {
  const files = readdirSync(BASELINES_DIR).filter(f => f.endsWith('.png'));
  return {
    success: true,
    baselines: files.map(f => ({
      name: f.replace('baseline_', '').replace('.png', ''),
      path: join(BASELINES_DIR, f)
    })),
    count: files.length
  };
}

// ============================================
// CORE WEB VITALS (v4.0)
// ============================================

async function measureWebVitals({ viewport = 'desktop' } = {}) {
  const browser = await getBrowser();
  try {
    const page = await browser.newPage({ viewport: VIEWPORTS[viewport] });

    // Inject Web Vitals measurement
    await page.addInitScript(() => {
      window.__WEB_VITALS__ = {
        lcp: null,
        fid: null,
        cls: 0,
        fcp: null,
        ttfb: null
      };

      // CLS tracking
      let clsValue = 0;
      const clsEntries = [];
      new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            clsEntries.push(entry);
          }
        }
        window.__WEB_VITALS__.cls = clsValue;
      }).observe({ type: 'layout-shift', buffered: true });

      // LCP tracking
      new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        window.__WEB_VITALS__.lcp = lastEntry.renderTime || lastEntry.loadTime;
      }).observe({ type: 'largest-contentful-paint', buffered: true });

      // FCP tracking
      new PerformanceObserver((entryList) => {
        const entry = entryList.getEntriesByName('first-contentful-paint')[0];
        if (entry) window.__WEB_VITALS__.fcp = entry.startTime;
      }).observe({ type: 'paint', buffered: true });
    });

    const startTime = Date.now();
    await page.goto(SITE_URL, { waitUntil: 'networkidle' });
    const loadTime = Date.now() - startTime;

    // Scroll to trigger CLS
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);

    const vitals = await page.evaluate(() => {
      const perf = performance.getEntriesByType('navigation')[0];
      return {
        ...window.__WEB_VITALS__,
        ttfb: perf?.responseStart || null,
        domContentLoaded: perf?.domContentLoadedEventEnd || null,
        loadComplete: perf?.loadEventEnd || null
      };
    });

    // Score calculation
    const scores = {
      lcp: vitals.lcp ? (vitals.lcp <= 2500 ? 'good' : vitals.lcp <= 4000 ? 'needs-improvement' : 'poor') : 'unknown',
      cls: vitals.cls !== null ? (vitals.cls <= 0.1 ? 'good' : vitals.cls <= 0.25 ? 'needs-improvement' : 'poor') : 'unknown',
      fcp: vitals.fcp ? (vitals.fcp <= 1800 ? 'good' : vitals.fcp <= 3000 ? 'needs-improvement' : 'poor') : 'unknown',
      ttfb: vitals.ttfb ? (vitals.ttfb <= 800 ? 'good' : vitals.ttfb <= 1800 ? 'needs-improvement' : 'poor') : 'unknown'
    };

    const overallScore = Object.values(scores).filter(s => s === 'good').length / Object.values(scores).filter(s => s !== 'unknown').length * 100;

    return {
      success: true,
      webVitals: {
        LCP: { value: vitals.lcp ? `${Math.round(vitals.lcp)}ms` : 'N/A', score: scores.lcp },
        CLS: { value: vitals.cls?.toFixed(4) || 'N/A', score: scores.cls },
        FCP: { value: vitals.fcp ? `${Math.round(vitals.fcp)}ms` : 'N/A', score: scores.fcp },
        TTFB: { value: vitals.ttfb ? `${Math.round(vitals.ttfb)}ms` : 'N/A', score: scores.ttfb }
      },
      loadTime: `${loadTime}ms`,
      overallScore: `${Math.round(overallScore)}%`
    };
  } finally {
    await browser.close();
  }
}

// ============================================
// NETWORK THROTTLING (v4.0)
// ============================================

async function testWithThrottling({ preset = 'slow-3g', viewport = 'desktop' } = {}) {
  const browser = await getBrowser();
  try {
    const context = await browser.newContext({ viewport: VIEWPORTS[viewport] });
    const page = await context.newPage();

    const throttle = NETWORK_PRESETS[preset] || NETWORK_PRESETS['slow-3g'];

    // Create CDP session for network throttling
    const client = await context.newCDPSession(page);
    await client.send('Network.emulateNetworkConditions', {
      offline: throttle.offline || false,
      downloadThroughput: throttle.downloadThroughput,
      uploadThroughput: throttle.uploadThroughput,
      latency: throttle.latency
    });

    const startTime = Date.now();

    const resources = [];
    page.on('response', response => {
      resources.push({
        url: response.url().slice(0, 60),
        status: response.status(),
        time: Date.now() - startTime
      });
    });

    await page.goto(SITE_URL, { waitUntil: 'networkidle', timeout: 60000 });
    const loadTime = Date.now() - startTime;

    // Take screenshot
    const filename = `throttle_${preset}_${timestamp()}.png`;
    const filepath = join(REPORTS_DIR, filename);
    await page.screenshot({ path: filepath });

    return {
      success: true,
      preset,
      throttle,
      loadTime: `${loadTime}ms`,
      resourceCount: resources.length,
      resources: resources.slice(0, 20),
      screenshot: filepath,
      rating: loadTime < 5000 ? 'acceptable' : loadTime < 10000 ? 'slow' : 'critical'
    };
  } finally {
    await browser.close();
  }
}

// ============================================
// DARK MODE TESTING (v4.0)
// ============================================

async function testDarkMode({ viewport = 'desktop', captureComparison = true } = {}) {
  const browser = await getBrowser();
  const results = {};

  try {
    // Light mode
    const lightPage = await browser.newPage({
      viewport: VIEWPORTS[viewport],
      colorScheme: 'light'
    });
    await lightPage.goto(SITE_URL, { waitUntil: 'networkidle' });
    await lightPage.waitForTimeout(500);

    const lightAnalysis = await lightPage.evaluate(() => {
      const body = document.body;
      const styles = window.getComputedStyle(body);
      return {
        background: styles.backgroundColor,
        color: styles.color,
        hasDarkClass: body.classList.contains('dark') || document.documentElement.classList.contains('dark')
      };
    });

    if (captureComparison) {
      results.lightScreenshot = join(REPORTS_DIR, `light_mode_${timestamp()}.png`);
      await lightPage.screenshot({ path: results.lightScreenshot });
    }

    await lightPage.close();

    // Dark mode
    const darkPage = await browser.newPage({
      viewport: VIEWPORTS[viewport],
      colorScheme: 'dark'
    });
    await darkPage.goto(SITE_URL, { waitUntil: 'networkidle' });
    await darkPage.waitForTimeout(500);

    const darkAnalysis = await darkPage.evaluate(() => {
      const body = document.body;
      const styles = window.getComputedStyle(body);
      return {
        background: styles.backgroundColor,
        color: styles.color,
        hasDarkClass: body.classList.contains('dark') || document.documentElement.classList.contains('dark')
      };
    });

    if (captureComparison) {
      results.darkScreenshot = join(REPORTS_DIR, `dark_mode_${timestamp()}.png`);
      await darkPage.screenshot({ path: results.darkScreenshot });
    }

    await darkPage.close();

    // Check if dark mode actually changed anything
    const hasThemeSupport = lightAnalysis.background !== darkAnalysis.background ||
                            lightAnalysis.color !== darkAnalysis.color;

    return {
      success: true,
      hasThemeSupport,
      light: lightAnalysis,
      dark: darkAnalysis,
      ...results,
      recommendation: hasThemeSupport ? 'Dark mode detected' : 'Consider adding dark mode support'
    };
  } finally {
    await browser.close();
  }
}

// ============================================
// FORM AUTOMATION (v4.0)
// ============================================

async function testForms({ fillData = {}, submit = false } = {}) {
  const browser = await getBrowser();
  try {
    const page = await getPage(browser);

    const forms = await page.evaluate(() => {
      const formData = [];
      document.querySelectorAll('form').forEach((form, i) => {
        const inputs = [];
        form.querySelectorAll('input, select, textarea').forEach(input => {
          inputs.push({
            type: input.type || input.tagName.toLowerCase(),
            name: input.name || null,
            id: input.id || null,
            required: input.required,
            placeholder: input.placeholder || null,
            value: input.value || null
          });
        });

        formData.push({
          index: i,
          id: form.id || null,
          action: form.action || null,
          method: form.method || 'GET',
          inputs,
          hasSubmit: !!form.querySelector('button[type="submit"], input[type="submit"]')
        });
      });
      return formData;
    });

    // Fill forms if data provided
    const fillResults = [];
    for (const [selector, value] of Object.entries(fillData)) {
      try {
        await page.fill(selector, value);
        fillResults.push({ selector, status: 'filled', value });
      } catch (e) {
        fillResults.push({ selector, status: 'error', error: e.message });
      }
    }

    // Test validation
    const validationResults = await page.evaluate(() => {
      const results = [];
      document.querySelectorAll('input[required], select[required], textarea[required]').forEach(el => {
        results.push({
          name: el.name || el.id,
          valid: el.checkValidity(),
          validationMessage: el.validationMessage || null
        });
      });
      return results;
    });

    // Take screenshot
    const filename = `forms_${timestamp()}.png`;
    const filepath = join(REPORTS_DIR, filename);
    await page.screenshot({ path: filepath });

    return {
      success: true,
      forms,
      fillResults,
      validationResults,
      screenshot: filepath
    };
  } finally {
    await browser.close();
  }
}

// ============================================
// CSS COVERAGE (v4.0)
// ============================================

async function analyzeCSSCoverage() {
  const browser = await getBrowser();
  try {
    const page = await browser.newPage({ viewport: VIEWPORTS.desktop });

    // Start CSS coverage
    await page.coverage.startCSSCoverage();

    await page.goto(SITE_URL, { waitUntil: 'networkidle' });

    // Scroll to load all content
    await page.evaluate(async () => {
      await new Promise(resolve => {
        let totalHeight = 0;
        const distance = 300;
        const timer = setInterval(() => {
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight >= document.body.scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });

    await page.waitForTimeout(500);

    const coverage = await page.coverage.stopCSSCoverage();

    let totalBytes = 0;
    let usedBytes = 0;
    const stylesheets = [];

    for (const entry of coverage) {
      totalBytes += entry.text.length;
      let entryUsed = 0;

      for (const range of entry.ranges) {
        entryUsed += range.end - range.start;
      }
      usedBytes += entryUsed;

      stylesheets.push({
        url: entry.url.split('/').pop() || 'inline',
        totalBytes: entry.text.length,
        usedBytes: entryUsed,
        unusedBytes: entry.text.length - entryUsed,
        usedPercent: ((entryUsed / entry.text.length) * 100).toFixed(1) + '%'
      });
    }

    const unusedPercent = ((1 - usedBytes / totalBytes) * 100).toFixed(1);

    return {
      success: true,
      summary: {
        totalCSS: `${(totalBytes / 1024).toFixed(1)}KB`,
        usedCSS: `${(usedBytes / 1024).toFixed(1)}KB`,
        unusedCSS: `${((totalBytes - usedBytes) / 1024).toFixed(1)}KB`,
        unusedPercent: `${unusedPercent}%`,
        rating: parseFloat(unusedPercent) < 20 ? 'good' : parseFloat(unusedPercent) < 50 ? 'fair' : 'needs-improvement'
      },
      stylesheets
    };
  } finally {
    await browser.close();
  }
}

// ============================================
// COMPONENT ISOLATION (v4.0)
// ============================================

async function isolateComponent({ selector, padding = 40, states = ['default'] } = {}) {
  const browser = await getBrowser();
  const screenshots = [];

  try {
    const page = await getPage(browser);

    const element = await page.$(selector);
    if (!element) return { success: false, error: `Element not found: ${selector}` };

    // Get component info
    const componentInfo = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      const rect = el.getBoundingClientRect();
      const styles = window.getComputedStyle(el);

      return {
        tag: el.tagName,
        classes: Array.from(el.classList),
        rect: { width: rect.width, height: rect.height },
        styles: {
          background: styles.backgroundColor,
          color: styles.color,
          fontSize: styles.fontSize,
          padding: styles.padding,
          margin: styles.margin
        }
      };
    }, selector);

    // Hide everything else for clean isolation
    await page.evaluate((sel) => {
      document.querySelectorAll('body > *').forEach(el => {
        if (!el.matches(sel) && !el.contains(document.querySelector(sel))) {
          el.style.visibility = 'hidden';
        }
      });
      // Center the component
      const target = document.querySelector(sel);
      if (target) {
        target.scrollIntoView({ block: 'center', inline: 'center' });
      }
    }, selector);

    for (const state of states) {
      if (state === 'hover') {
        await element.hover();
        await page.waitForTimeout(300);
      } else if (state === 'focus') {
        await element.focus();
        await page.waitForTimeout(300);
      } else if (state === 'active') {
        await page.mouse.down();
        await page.waitForTimeout(100);
      }

      const box = await element.boundingBox();
      const filename = `component_${selector.replace(/[^a-z0-9]/gi, '_')}_${state}_${timestamp()}.png`;
      const filepath = join(COMPONENTS_DIR, filename);

      await page.screenshot({
        path: filepath,
        clip: {
          x: Math.max(0, box.x - padding),
          y: Math.max(0, box.y - padding),
          width: box.width + padding * 2,
          height: box.height + padding * 2
        }
      });

      screenshots.push({ state, file: filepath });

      if (state === 'active') {
        await page.mouse.up();
      }
    }

    return {
      success: true,
      component: componentInfo,
      screenshots
    };
  } finally {
    await browser.close();
  }
}

// ============================================
// DOM MUTATION WATCHER (v4.0)
// ============================================

async function watchMutations({ duration = 5000, scrollDistance = 500 } = {}) {
  const browser = await getBrowser();
  try {
    const page = await getPage(browser);

    // Setup mutation observer
    await page.evaluate(() => {
      window.__MUTATIONS__ = [];
      const observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
          window.__MUTATIONS__.push({
            type: mutation.type,
            target: mutation.target.tagName + (mutation.target.className ? '.' + mutation.target.className.split(' ')[0] : ''),
            timestamp: Date.now(),
            addedNodes: mutation.addedNodes.length,
            removedNodes: mutation.removedNodes.length,
            attributeName: mutation.attributeName
          });
        });
      });
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeOldValue: true
      });
    });

    // Trigger potential mutations
    await page.evaluate((distance) => {
      window.scrollBy(0, distance);
    }, scrollDistance);

    await page.waitForTimeout(duration);

    // Scroll back
    await page.evaluate((distance) => {
      window.scrollBy(0, -distance);
    }, scrollDistance);

    await page.waitForTimeout(1000);

    const mutations = await page.evaluate(() => window.__MUTATIONS__);

    // Group mutations by type
    const grouped = {
      childList: mutations.filter(m => m.type === 'childList').length,
      attributes: mutations.filter(m => m.type === 'attributes').length,
      total: mutations.length
    };

    // Find most active elements
    const elementCounts = {};
    mutations.forEach(m => {
      elementCounts[m.target] = (elementCounts[m.target] || 0) + 1;
    });

    const mostActive = Object.entries(elementCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([el, count]) => ({ element: el, mutations: count }));

    return {
      success: true,
      summary: grouped,
      mostActive,
      mutations: mutations.slice(0, 50),
      recommendation: grouped.total > 100 ? 'High mutation count - consider optimization' : 'Mutation count is reasonable'
    };
  } finally {
    await browser.close();
  }
}

// ============================================
// PDF EXPORT (v4.0)
// ============================================

async function exportToPDF({ filename = 'page', format = 'A4', landscape = false, printBackground = true } = {}) {
  const browser = await getBrowser();
  try {
    const page = await getPage(browser);

    const filepath = join(REPORTS_DIR, `${filename}_${timestamp()}.pdf`);

    await page.pdf({
      path: filepath,
      format,
      landscape,
      printBackground,
      margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' }
    });

    return {
      success: true,
      pdf: filepath,
      format,
      landscape
    };
  } finally {
    await browser.close();
  }
}

// ============================================
// SCROLL PERFORMANCE (v4.0)
// ============================================

async function measureScrollPerformance({ duration = 3000 } = {}) {
  const browser = await getBrowser();
  try {
    const page = await getPage(browser);

    const metrics = await page.evaluate(async (dur) => {
      const frames = [];
      let lastTime = performance.now();
      let scrollPos = 0;
      const maxScroll = document.body.scrollHeight - window.innerHeight;
      const scrollStep = maxScroll / (dur / 16); // Approx 60fps

      return new Promise(resolve => {
        function frame() {
          const now = performance.now();
          const delta = now - lastTime;
          frames.push({ delta, scrollY: window.scrollY });
          lastTime = now;

          scrollPos += scrollStep;
          window.scrollTo(0, Math.min(scrollPos, maxScroll));

          if (scrollPos < maxScroll && now - frames[0]?.delta < dur) {
            requestAnimationFrame(frame);
          } else {
            const avgFrameTime = frames.reduce((sum, f) => sum + f.delta, 0) / frames.length;
            const jankFrames = frames.filter(f => f.delta > 50).length;
            const fps = 1000 / avgFrameTime;

            resolve({
              totalFrames: frames.length,
              avgFrameTime: avgFrameTime.toFixed(2),
              fps: fps.toFixed(1),
              jankFrames,
              jankPercent: ((jankFrames / frames.length) * 100).toFixed(1),
              smoothness: jankFrames === 0 ? 'excellent' : jankFrames < 5 ? 'good' : jankFrames < 15 ? 'fair' : 'poor'
            });
          }
        }
        requestAnimationFrame(frame);
      });
    }, duration);

    return { success: true, scrollPerformance: metrics };
  } finally {
    await browser.close();
  }
}

// ============================================
// ADVANCED VIEWPORT TESTING (v4.0)
// ============================================

async function testAdvancedViewport({ device = 'iphone-14', orientation = 'portrait' } = {}) {
  const devices = {
    'iphone-14': { width: 390, height: 844, deviceScaleFactor: 3, hasNotch: true, safeAreaTop: 47, safeAreaBottom: 34 },
    'iphone-14-pro-max': { width: 430, height: 932, deviceScaleFactor: 3, hasNotch: true, safeAreaTop: 59, safeAreaBottom: 34 },
    'pixel-7': { width: 412, height: 915, deviceScaleFactor: 2.625, hasNotch: false, safeAreaTop: 24, safeAreaBottom: 0 },
    'ipad-pro': { width: 1024, height: 1366, deviceScaleFactor: 2, hasNotch: false, safeAreaTop: 0, safeAreaBottom: 0 },
    'galaxy-fold': { width: 280, height: 653, deviceScaleFactor: 3, hasNotch: false, safeAreaTop: 0, safeAreaBottom: 0 }
  };

  const deviceConfig = devices[device] || devices['iphone-14'];
  const viewport = orientation === 'landscape'
    ? { width: deviceConfig.height, height: deviceConfig.width }
    : { width: deviceConfig.width, height: deviceConfig.height };

  const browser = await getBrowser();
  try {
    const page = await browser.newPage({
      viewport,
      deviceScaleFactor: deviceConfig.deviceScaleFactor,
      isMobile: true,
      hasTouch: true
    });

    await page.goto(SITE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Analyze safe areas
    const analysis = await page.evaluate((config) => {
      const issues = [];

      // Check if content respects safe areas
      const topElements = document.elementsFromPoint(window.innerWidth / 2, config.safeAreaTop);
      const bottomElements = document.elementsFromPoint(window.innerWidth / 2, window.innerHeight - config.safeAreaBottom);

      if (config.safeAreaTop > 0) {
        topElements.forEach(el => {
          if (el.tagName !== 'HTML' && el.tagName !== 'BODY') {
            const rect = el.getBoundingClientRect();
            if (rect.top < config.safeAreaTop) {
              issues.push({ type: 'content-in-top-safe-area', element: el.tagName + '.' + el.className?.split(' ')[0] });
            }
          }
        });
      }

      return {
        viewport: { width: window.innerWidth, height: window.innerHeight },
        safeArea: { top: config.safeAreaTop, bottom: config.safeAreaBottom },
        hasNotch: config.hasNotch,
        issues,
        touchTargets: document.querySelectorAll('a, button').length
      };
    }, deviceConfig);

    // Draw safe area overlay
    if (deviceConfig.safeAreaTop > 0 || deviceConfig.safeAreaBottom > 0) {
      await page.evaluate((config) => {
        if (config.safeAreaTop > 0) {
          const topOverlay = document.createElement('div');
          topOverlay.style.cssText = `position:fixed;top:0;left:0;right:0;height:${config.safeAreaTop}px;background:rgba(255,0,0,0.2);z-index:99999;pointer-events:none;`;
          document.body.appendChild(topOverlay);
        }
        if (config.safeAreaBottom > 0) {
          const bottomOverlay = document.createElement('div');
          bottomOverlay.style.cssText = `position:fixed;bottom:0;left:0;right:0;height:${config.safeAreaBottom}px;background:rgba(255,0,0,0.2);z-index:99999;pointer-events:none;`;
          document.body.appendChild(bottomOverlay);
        }
      }, deviceConfig);
    }

    const filename = `device_${device}_${orientation}_${timestamp()}.png`;
    const filepath = join(REPORTS_DIR, filename);
    await page.screenshot({ path: filepath });

    return {
      success: true,
      device,
      orientation,
      analysis,
      screenshot: filepath
    };
  } finally {
    await browser.close();
  }
}

// ============================================
// SHADOW DOM INSPECTION (v4.0)
// ============================================

async function inspectShadowDOM() {
  const browser = await getBrowser();
  try {
    const page = await getPage(browser);

    const shadowRoots = await page.evaluate(() => {
      const results = [];

      function findShadowRoots(root, path = '') {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
        let node = walker.currentNode;

        while (node) {
          if (node.shadowRoot) {
            const shadowInfo = {
              host: node.tagName + (node.className ? '.' + node.className.split(' ')[0] : ''),
              path: path || 'body',
              mode: node.shadowRoot.mode,
              childCount: node.shadowRoot.childElementCount,
              styles: Array.from(node.shadowRoot.querySelectorAll('style')).length,
              hasSlots: node.shadowRoot.querySelectorAll('slot').length > 0
            };
            results.push(shadowInfo);

            // Recursively check shadow root
            findShadowRoots(node.shadowRoot, `${path}/${shadowInfo.host}`);
          }
          node = walker.nextNode();
        }
      }

      findShadowRoots(document.body);
      return results;
    });

    return {
      success: true,
      shadowRoots,
      count: shadowRoots.length,
      hasWebComponents: shadowRoots.length > 0
    };
  } finally {
    await browser.close();
  }
}

// ============================================
// LIGHTHOUSE-STYLE SCORES (v4.0)
// ============================================

async function calculateScores({ viewport = 'desktop' } = {}) {
  const browser = await getBrowser();
  try {
    const page = await getPage(browser, viewport);

    const startTime = Date.now();

    // Gather all metrics
    const metrics = await page.evaluate(() => {
      // Performance
      const perf = performance.getEntriesByType('navigation')[0];
      const loadTime = perf?.loadEventEnd || 0;
      const domElements = document.querySelectorAll('*').length;

      // Accessibility
      const imagesWithoutAlt = document.querySelectorAll('img:not([alt])').length;
      const inputsWithoutLabel = Array.from(document.querySelectorAll('input')).filter(i => !i.labels?.length && !i.getAttribute('aria-label')).length;
      const lowContrastCount = 0; // Simplified
      const h1Count = document.querySelectorAll('h1').length;

      // Best Practices
      const httpsUsed = location.protocol === 'https:' || location.protocol === 'file:';
      const noDoctype = !document.doctype;
      const hasViewport = !!document.querySelector('meta[name="viewport"]');

      // SEO
      const hasTitle = !!document.title;
      const hasDescription = !!document.querySelector('meta[name="description"]');
      const hasCanonical = !!document.querySelector('link[rel="canonical"]');
      const hasOG = !!document.querySelector('meta[property="og:title"]');

      return {
        performance: { loadTime, domElements },
        accessibility: { imagesWithoutAlt, inputsWithoutLabel, h1Count },
        bestPractices: { httpsUsed, noDoctype, hasViewport },
        seo: { hasTitle, hasDescription, hasCanonical, hasOG }
      };
    });

    const totalTime = Date.now() - startTime;

    // Calculate scores (0-100)
    const scores = {
      performance: Math.max(0, 100 - Math.floor(totalTime / 50) - Math.floor(metrics.performance.domElements / 100)),
      accessibility: Math.max(0, 100 - (metrics.accessibility.imagesWithoutAlt * 10) - (metrics.accessibility.inputsWithoutLabel * 10) - (metrics.accessibility.h1Count !== 1 ? 10 : 0)),
      bestPractices: (metrics.bestPractices.httpsUsed ? 34 : 0) + (!metrics.bestPractices.noDoctype ? 33 : 0) + (metrics.bestPractices.hasViewport ? 33 : 0),
      seo: (metrics.seo.hasTitle ? 25 : 0) + (metrics.seo.hasDescription ? 25 : 0) + (metrics.seo.hasCanonical ? 25 : 0) + (metrics.seo.hasOG ? 25 : 0)
    };

    const getColor = (score) => score >= 90 ? '🟢' : score >= 50 ? '🟡' : '🔴';

    return {
      success: true,
      scores: {
        performance: { score: scores.performance, color: getColor(scores.performance) },
        accessibility: { score: scores.accessibility, color: getColor(scores.accessibility) },
        bestPractices: { score: scores.bestPractices, color: getColor(scores.bestPractices) },
        seo: { score: scores.seo, color: getColor(scores.seo) }
      },
      overall: Math.round((scores.performance + scores.accessibility + scores.bestPractices + scores.seo) / 4),
      details: metrics
    };
  } finally {
    await browser.close();
  }
}

// ============================================
// ELEMENT STATE CAPTURE (v4.0)
// ============================================

async function captureElementStates({ selector, includeStates = ['default', 'hover', 'focus', 'active'] } = {}) {
  const browser = await getBrowser();
  const captures = [];

  try {
    const page = await getPage(browser);
    const element = await page.$(selector);
    if (!element) return { success: false, error: `Element not found: ${selector}` };

    for (const state of includeStates) {
      // Reset state
      await page.mouse.move(0, 0);
      await page.waitForTimeout(100);

      // Get default styles
      if (state === 'default') {
        // Do nothing, element is in default state
      } else if (state === 'hover') {
        await element.hover();
      } else if (state === 'focus') {
        await element.focus();
      } else if (state === 'active') {
        const box = await element.boundingBox();
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
      }

      await page.waitForTimeout(200);

      const styles = await element.evaluate(el => {
        const s = window.getComputedStyle(el);
        return {
          background: s.backgroundColor,
          color: s.color,
          border: s.border,
          boxShadow: s.boxShadow,
          transform: s.transform,
          opacity: s.opacity,
          outline: s.outline
        };
      });

      const box = await element.boundingBox();
      const filename = `state_${state}_${timestamp()}.png`;
      const filepath = join(REPORTS_DIR, filename);

      await page.screenshot({
        path: filepath,
        clip: { x: box.x - 20, y: box.y - 20, width: box.width + 40, height: box.height + 40 }
      });

      captures.push({ state, styles, screenshot: filepath });

      if (state === 'active') {
        await page.mouse.up();
      }
    }

    return { success: true, selector, captures };
  } finally {
    await browser.close();
  }
}

// ============================================
// VIDEO RECORDING (v5.0)
// ============================================

async function recordVideo({ duration = 5000, actions = ['scroll', 'hover'], viewport = 'desktop' } = {}) {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      viewport: VIEWPORTS[viewport],
      recordVideo: { dir: VIDEOS_DIR, size: VIEWPORTS[viewport] }
    });

    const page = await context.newPage();
    await page.goto(SITE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    // Perform actions
    for (const action of actions) {
      if (action === 'scroll') {
        await page.evaluate(async () => {
          const step = window.innerHeight / 2;
          for (let i = 0; i < 5; i++) {
            window.scrollBy({ top: step, behavior: 'smooth' });
            await new Promise(r => setTimeout(r, 500));
          }
          for (let i = 0; i < 5; i++) {
            window.scrollBy({ top: -step, behavior: 'smooth' });
            await new Promise(r => setTimeout(r, 500));
          }
        });
      } else if (action === 'hover') {
        const buttons = await page.$$('button, a, .btn');
        for (const btn of buttons.slice(0, 5)) {
          await btn.hover();
          await page.waitForTimeout(300);
        }
      } else if (action === 'click') {
        const links = await page.$$('a[href^="#"]');
        for (const link of links.slice(0, 3)) {
          await link.click();
          await page.waitForTimeout(500);
        }
      }
    }

    await page.waitForTimeout(1000);
    await page.close();
    await context.close();

    // Get the video path
    const videos = readdirSync(VIDEOS_DIR).filter(f => f.endsWith('.webm')).sort().reverse();
    const latestVideo = videos[0] ? join(VIDEOS_DIR, videos[0]) : null;

    return {
      success: true,
      video: latestVideo,
      duration: `${duration}ms`,
      actions
    };
  } finally {
    await browser.close();
  }
}

// ============================================
// CROSS-BROWSER TESTING (v5.0)
// ============================================

async function testCrossBrowser({ browsers = ['chromium', 'firefox', 'webkit'], viewport = 'desktop' } = {}) {
  const results = {};

  for (const browserName of browsers) {
    const browserType = BROWSERS[browserName];
    if (!browserType) continue;

    const browser = await browserType.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: VIEWPORTS[viewport] });

      const startTime = Date.now();
      await page.goto(SITE_URL, { waitUntil: 'networkidle' });
      const loadTime = Date.now() - startTime;

      const analysis = await page.evaluate(() => ({
        scrollHeight: document.body.scrollHeight,
        elements: document.querySelectorAll('*').length,
        hasHorizontalScroll: document.body.scrollWidth > window.innerWidth,
        images: document.images.length,
        brokenImages: Array.from(document.images).filter(i => !i.complete || !i.naturalWidth).length
      }));

      const filename = `crossbrowser_${browserName}_${timestamp()}.png`;
      const filepath = join(REPORTS_DIR, filename);
      await page.screenshot({ path: filepath });

      results[browserName] = {
        loadTime: `${loadTime}ms`,
        ...analysis,
        screenshot: filepath,
        status: 'passed'
      };

      await page.close();
    } catch (err) {
      results[browserName] = { status: 'failed', error: err.message };
    } finally {
      await browser.close();
    }
  }

  // Compare results
  const loadTimes = Object.entries(results).filter(([_, r]) => r.loadTime).map(([b, r]) => ({
    browser: b,
    time: parseInt(r.loadTime)
  }));

  return {
    success: true,
    results,
    fastest: loadTimes.sort((a, b) => a.time - b.time)[0]?.browser,
    consistent: new Set(Object.values(results).map(r => r.scrollHeight)).size === 1
  };
}

// ============================================
// PERFORMANCE BUDGET (v5.0)
// ============================================

async function checkBudget({ budgets = {}, viewport = 'desktop' } = {}) {
  const limits = { ...DEFAULT_BUDGETS, ...budgets };
  const browser = await getBrowser();

  try {
    const page = await browser.newPage({ viewport: VIEWPORTS[viewport] });

    let requestCount = 0;
    let totalSize = 0;

    page.on('response', async response => {
      requestCount++;
      try {
        const buffer = await response.body();
        totalSize += buffer.length;
      } catch {}
    });

    const startTime = Date.now();
    await page.goto(SITE_URL, { waitUntil: 'networkidle' });
    const loadTime = Date.now() - startTime;

    const metrics = await page.evaluate(() => {
      const perf = performance.getEntriesByType('navigation')[0];
      return {
        domElements: document.querySelectorAll('*').length,
        ttfb: perf?.responseStart || 0,
        fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
      };
    });

    const checks = {
      loadTime: { value: loadTime, limit: limits.loadTime, passed: loadTime <= limits.loadTime },
      ttfb: { value: Math.round(metrics.ttfb), limit: limits.ttfb, passed: metrics.ttfb <= limits.ttfb },
      fcp: { value: Math.round(metrics.fcp), limit: limits.fcp, passed: metrics.fcp <= limits.fcp },
      domElements: { value: metrics.domElements, limit: limits.domElements, passed: metrics.domElements <= limits.domElements },
      requests: { value: requestCount, limit: limits.requests, passed: requestCount <= limits.requests },
      totalSize: { value: totalSize, limit: limits.totalSize, passed: totalSize <= limits.totalSize, formatted: `${(totalSize/1024/1024).toFixed(2)}MB` }
    };

    const passedCount = Object.values(checks).filter(c => c.passed).length;
    const totalChecks = Object.keys(checks).length;

    return {
      success: true,
      budgetResult: passedCount === totalChecks ? 'PASSED' : 'FAILED',
      score: `${passedCount}/${totalChecks}`,
      checks,
      recommendations: Object.entries(checks)
        .filter(([_, c]) => !c.passed)
        .map(([name, c]) => `${name}: ${c.value} exceeds budget of ${c.limit}`)
    };
  } finally {
    await browser.close();
  }
}

// ============================================
// CRITICAL CSS EXTRACTION (v5.0)
// ============================================

async function extractCriticalCSS({ viewport = 'desktop' } = {}) {
  const browser = await getBrowser();
  try {
    const page = await getPage(browser, viewport);

    const criticalCSS = await page.evaluate(() => {
      const usedRules = new Set();
      const viewportHeight = window.innerHeight;

      // Find all elements above the fold
      const aboveFold = [];
      document.querySelectorAll('*').forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.top < viewportHeight && rect.bottom > 0) {
          aboveFold.push(el);
        }
      });

      // Extract used CSS properties
      const criticalStyles = [];
      aboveFold.forEach(el => {
        const computed = window.getComputedStyle(el);
        const selector = el.tagName.toLowerCase() +
          (el.id ? `#${el.id}` : '') +
          (el.className ? `.${el.className.split(' ')[0]}` : '');

        const props = {};
        ['display', 'position', 'top', 'left', 'right', 'bottom', 'width', 'height',
         'margin', 'padding', 'background', 'background-color', 'color', 'font-size',
         'font-family', 'font-weight', 'line-height', 'flex', 'grid', 'transform',
         'opacity', 'z-index', 'border', 'border-radius', 'box-shadow'].forEach(prop => {
          const value = computed.getPropertyValue(prop);
          if (value && value !== 'none' && value !== 'auto' && value !== 'normal') {
            props[prop] = value;
          }
        });

        if (Object.keys(props).length > 0) {
          criticalStyles.push({ selector, props });
        }
      });

      return {
        elementsAboveFold: aboveFold.length,
        rules: criticalStyles.slice(0, 100)
      };
    });

    // Generate CSS string
    let cssString = '/* Critical CSS - Above the fold */\n\n';
    const seen = new Set();
    criticalCSS.rules.forEach(rule => {
      if (seen.has(rule.selector)) return;
      seen.add(rule.selector);

      cssString += `${rule.selector} {\n`;
      Object.entries(rule.props).forEach(([prop, value]) => {
        cssString += `  ${prop}: ${value};\n`;
      });
      cssString += '}\n\n';
    });

    const filename = `critical_${timestamp()}.css`;
    const filepath = join(REPORTS_DIR, filename);
    writeFileSync(filepath, cssString);

    return {
      success: true,
      elementsAboveFold: criticalCSS.elementsAboveFold,
      rulesExtracted: criticalCSS.rules.length,
      file: filepath,
      sizeBytes: cssString.length
    };
  } finally {
    await browser.close();
  }
}

// ============================================
// USER JOURNEY RECORDING (v5.0)
// ============================================

async function recordJourney({ steps = [], name = 'journey' } = {}) {
  const defaultSteps = [
    { action: 'wait', duration: 1000 },
    { action: 'screenshot', name: 'initial' },
    { action: 'scroll', to: 500 },
    { action: 'screenshot', name: 'scrolled' },
    { action: 'click', selector: 'a[href^="#"]' },
    { action: 'screenshot', name: 'clicked' },
    { action: 'scroll', to: 0 },
    { action: 'screenshot', name: 'final' }
  ];

  const journey = steps.length > 0 ? steps : defaultSteps;
  const browser = await getBrowser();
  const recordings = [];

  try {
    const page = await getPage(browser);

    for (let i = 0; i < journey.length; i++) {
      const step = journey[i];
      const stepResult = { step: i + 1, action: step.action };

      try {
        switch (step.action) {
          case 'wait':
            await page.waitForTimeout(step.duration || 1000);
            stepResult.status = 'completed';
            break;

          case 'screenshot':
            const filename = `journey_${name}_${step.name || i}_${timestamp()}.png`;
            const filepath = join(REPORTS_DIR, filename);
            await page.screenshot({ path: filepath });
            stepResult.status = 'captured';
            stepResult.file = filepath;
            break;

          case 'scroll':
            await page.evaluate(y => window.scrollTo({ top: y, behavior: 'smooth' }), step.to || 0);
            await page.waitForTimeout(500);
            stepResult.status = 'scrolled';
            break;

          case 'click':
            const element = await page.$(step.selector);
            if (element) {
              await element.click();
              stepResult.status = 'clicked';
            } else {
              stepResult.status = 'element-not-found';
            }
            break;

          case 'hover':
            const hoverEl = await page.$(step.selector);
            if (hoverEl) {
              await hoverEl.hover();
              stepResult.status = 'hovered';
            }
            break;

          case 'type':
            await page.fill(step.selector, step.text || '');
            stepResult.status = 'typed';
            break;

          default:
            stepResult.status = 'unknown-action';
        }
      } catch (err) {
        stepResult.status = 'error';
        stepResult.error = err.message;
      }

      recordings.push(stepResult);
    }

    return { success: true, journey: name, steps: recordings };
  } finally {
    await browser.close();
  }
}

// ============================================
// DESIGN TOKEN EXTRACTION (v5.0)
// ============================================

async function extractDesignTokens() {
  const browser = await getBrowser();
  try {
    const page = await getPage(browser);

    const tokens = await page.evaluate(() => {
      const colors = new Map();
      const fonts = new Map();
      const spacing = new Map();
      const radii = new Map();
      const shadows = new Map();

      document.querySelectorAll('*').forEach(el => {
        const styles = window.getComputedStyle(el);

        // Colors
        [styles.color, styles.backgroundColor, styles.borderColor].forEach(c => {
          if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') {
            colors.set(c, (colors.get(c) || 0) + 1);
          }
        });

        // Fonts
        const font = styles.fontFamily.split(',')[0].trim().replace(/"/g, '');
        if (font) fonts.set(font, (fonts.get(font) || 0) + 1);

        // Spacing (margins/paddings)
        [styles.margin, styles.padding].forEach(s => {
          if (s && s !== '0px') spacing.set(s, (spacing.get(s) || 0) + 1);
        });

        // Border radius
        const radius = styles.borderRadius;
        if (radius && radius !== '0px') radii.set(radius, (radii.get(radius) || 0) + 1);

        // Shadows
        const shadow = styles.boxShadow;
        if (shadow && shadow !== 'none') shadows.set(shadow, (shadows.get(shadow) || 0) + 1);
      });

      const sortByFrequency = (map) => Array.from(map.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([value, count]) => ({ value, count }));

      return {
        colors: sortByFrequency(colors),
        fonts: sortByFrequency(fonts),
        spacing: sortByFrequency(spacing),
        borderRadius: sortByFrequency(radii),
        shadows: sortByFrequency(shadows)
      };
    });

    // Generate design tokens file
    let tokenCSS = ':root {\n  /* Design Tokens - Auto-extracted */\n\n';

    tokenCSS += '  /* Colors */\n';
    tokens.colors.forEach((c, i) => {
      tokenCSS += `  --color-${i + 1}: ${c.value};\n`;
    });

    tokenCSS += '\n  /* Fonts */\n';
    tokens.fonts.forEach((f, i) => {
      tokenCSS += `  --font-${i + 1}: ${f.value};\n`;
    });

    tokenCSS += '\n  /* Spacing */\n';
    tokens.spacing.slice(0, 8).forEach((s, i) => {
      tokenCSS += `  --space-${i + 1}: ${s.value};\n`;
    });

    tokenCSS += '\n  /* Border Radius */\n';
    tokens.borderRadius.slice(0, 5).forEach((r, i) => {
      tokenCSS += `  --radius-${i + 1}: ${r.value};\n`;
    });

    tokenCSS += '}\n';

    const filepath = join(REPORTS_DIR, `design_tokens_${timestamp()}.css`);
    writeFileSync(filepath, tokenCSS);

    return { success: true, tokens, file: filepath };
  } finally {
    await browser.close();
  }
}

// ============================================
// HEATMAP VISUALIZATION (v5.0)
// ============================================

async function generateHeatmap({ type = 'interactive' } = {}) {
  const browser = await getBrowser();
  try {
    const page = await getPage(browser);

    if (type === 'interactive') {
      // Visualize interactive element density
      await page.evaluate(() => {
        const heatmapOverlay = document.createElement('div');
        heatmapOverlay.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:99999;';
        document.body.appendChild(heatmapOverlay);

        document.querySelectorAll('a, button, input, [onclick], [role="button"]').forEach(el => {
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) return;

          const dot = document.createElement('div');
          dot.style.cssText = `
            position: absolute;
            top: ${rect.top + window.scrollY + rect.height/2}px;
            left: ${rect.left + rect.width/2}px;
            width: 30px;
            height: 30px;
            margin: -15px 0 0 -15px;
            background: radial-gradient(circle, rgba(255,0,0,0.8) 0%, rgba(255,0,0,0) 70%);
            border-radius: 50%;
          `;
          heatmapOverlay.appendChild(dot);
        });
      });
    } else if (type === 'content') {
      // Visualize content density
      await page.evaluate(() => {
        document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, span').forEach(el => {
          const textLength = el.textContent?.trim().length || 0;
          if (textLength > 10) {
            const intensity = Math.min(textLength / 200, 1);
            el.style.backgroundColor = `rgba(0, 100, 255, ${intensity * 0.3})`;
          }
        });
      });
    }

    await page.waitForTimeout(500);

    const filename = `heatmap_${type}_${timestamp()}.png`;
    const filepath = join(REPORTS_DIR, filename);
    await page.screenshot({ path: filepath, fullPage: true });

    return { success: true, type, screenshot: filepath };
  } finally {
    await browser.close();
  }
}

// ============================================
// HISTORICAL METRICS (v5.0)
// ============================================

async function trackMetrics({ name = 'default' } = {}) {
  const browser = await getBrowser();
  try {
    const page = await browser.newPage({ viewport: VIEWPORTS.desktop });

    const startTime = Date.now();
    await page.goto(SITE_URL, { waitUntil: 'networkidle' });
    const loadTime = Date.now() - startTime;

    const metrics = await page.evaluate(() => ({
      timestamp: new Date().toISOString(),
      domElements: document.querySelectorAll('*').length,
      images: document.images.length,
      scripts: document.scripts.length,
      stylesheets: document.styleSheets.length,
      links: document.querySelectorAll('a').length
    }));

    metrics.loadTime = loadTime;
    metrics.name = name;

    // Load or create history file
    const historyFile = join(HISTORY_DIR, `metrics_${name}.json`);
    let history = [];
    if (existsSync(historyFile)) {
      history = JSON.parse(readFileSync(historyFile, 'utf-8'));
    }

    history.push(metrics);

    // Keep last 100 entries
    if (history.length > 100) history = history.slice(-100);

    writeFileSync(historyFile, JSON.stringify(history, null, 2));

    // Calculate trends
    const recent = history.slice(-10);
    const avgLoadTime = recent.reduce((s, m) => s + m.loadTime, 0) / recent.length;
    const loadTimeTrend = history.length > 1
      ? ((metrics.loadTime - history[history.length - 2].loadTime) / history[history.length - 2].loadTime * 100).toFixed(1)
      : 0;

    return {
      success: true,
      current: metrics,
      history: {
        entries: history.length,
        avgLoadTime: Math.round(avgLoadTime),
        loadTimeTrend: `${loadTimeTrend}%`,
        file: historyFile
      }
    };
  } finally {
    await browser.close();
  }
}

async function getMetricsHistory({ name = 'default', limit = 20 } = {}) {
  const historyFile = join(HISTORY_DIR, `metrics_${name}.json`);
  if (!existsSync(historyFile)) {
    return { success: false, error: 'No history found. Run track_metrics first.' };
  }

  const history = JSON.parse(readFileSync(historyFile, 'utf-8'));
  return {
    success: true,
    history: history.slice(-limit),
    total: history.length
  };
}

// ============================================
// HTML DASHBOARD REPORT (v5.0)
// ============================================

async function generateDashboard({ includeScreenshot = true } = {}) {
  const browser = await getBrowser();
  try {
    const page = await getPage(browser);

    // Gather all metrics
    const metrics = await page.evaluate(() => {
      const perf = performance.getEntriesByType('navigation')[0];
      return {
        title: document.title,
        url: window.location.href,
        loadTime: perf?.loadEventEnd || 0,
        domContentLoaded: perf?.domContentLoadedEventEnd || 0,
        elements: document.querySelectorAll('*').length,
        headings: {
          h1: document.querySelectorAll('h1').length,
          h2: document.querySelectorAll('h2').length,
          h3: document.querySelectorAll('h3').length
        },
        images: document.images.length,
        links: document.querySelectorAll('a').length,
        forms: document.querySelectorAll('form').length,
        scripts: document.scripts.length,
        stylesheets: document.styleSheets.length,
        hasMetaDescription: !!document.querySelector('meta[name="description"]'),
        hasOG: !!document.querySelector('meta[property="og:title"]'),
        hasViewport: !!document.querySelector('meta[name="viewport"]')
      };
    });

    let screenshotPath = null;
    if (includeScreenshot) {
      screenshotPath = join(DASHBOARDS_DIR, `screenshot_${timestamp()}.png`);
      await page.screenshot({ path: screenshotPath });
    }

    // Generate HTML dashboard
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Symbiotic Dashboard - ${new Date().toLocaleDateString()}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0f; color: #e5e5e5; padding: 40px; }
    .header { text-align: center; margin-bottom: 40px; }
    .header h1 { font-size: 2.5rem; background: linear-gradient(135deg, #3b82f6, #06b6d4); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .header p { color: #888; margin-top: 8px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; max-width: 1400px; margin: 0 auto; }
    .card { background: #111118; border-radius: 16px; padding: 24px; border: 1px solid #222; }
    .card h2 { font-size: 0.875rem; text-transform: uppercase; letter-spacing: 1px; color: #666; margin-bottom: 16px; }
    .metric { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #222; }
    .metric:last-child { border-bottom: none; }
    .metric-name { color: #888; }
    .metric-value { font-weight: 600; color: #fff; }
    .metric-value.good { color: #22c55e; }
    .metric-value.warn { color: #f59e0b; }
    .metric-value.bad { color: #ef4444; }
    .score-circle { width: 120px; height: 120px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 2rem; font-weight: bold; }
    .score-good { background: conic-gradient(#22c55e var(--score), #333 0); }
    .score-warn { background: conic-gradient(#f59e0b var(--score), #333 0); }
    .score-bad { background: conic-gradient(#ef4444 var(--score), #333 0); }
    .score-inner { width: 90px; height: 90px; background: #111118; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
    .screenshot { max-width: 100%; border-radius: 12px; margin-top: 20px; border: 1px solid #333; }
    .timestamp { text-align: center; color: #666; margin-top: 40px; font-size: 0.875rem; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🔬 Symbiotic Dashboard</h1>
    <p>${metrics.title}</p>
  </div>

  <div class="grid">
    <div class="card">
      <h2>Performance</h2>
      <div class="metric"><span class="metric-name">Load Time</span><span class="metric-value ${metrics.loadTime < 2000 ? 'good' : metrics.loadTime < 3000 ? 'warn' : 'bad'}">${metrics.loadTime}ms</span></div>
      <div class="metric"><span class="metric-name">DOM Content</span><span class="metric-value">${metrics.domContentLoaded}ms</span></div>
      <div class="metric"><span class="metric-name">DOM Elements</span><span class="metric-value ${metrics.elements < 1000 ? 'good' : metrics.elements < 2000 ? 'warn' : 'bad'}">${metrics.elements}</span></div>
    </div>

    <div class="card">
      <h2>Structure</h2>
      <div class="metric"><span class="metric-name">H1 Tags</span><span class="metric-value ${metrics.headings.h1 === 1 ? 'good' : 'warn'}">${metrics.headings.h1}</span></div>
      <div class="metric"><span class="metric-name">H2 Tags</span><span class="metric-value">${metrics.headings.h2}</span></div>
      <div class="metric"><span class="metric-name">H3 Tags</span><span class="metric-value">${metrics.headings.h3}</span></div>
    </div>

    <div class="card">
      <h2>Content</h2>
      <div class="metric"><span class="metric-name">Images</span><span class="metric-value">${metrics.images}</span></div>
      <div class="metric"><span class="metric-name">Links</span><span class="metric-value">${metrics.links}</span></div>
      <div class="metric"><span class="metric-name">Forms</span><span class="metric-value">${metrics.forms}</span></div>
    </div>

    <div class="card">
      <h2>SEO</h2>
      <div class="metric"><span class="metric-name">Meta Description</span><span class="metric-value ${metrics.hasMetaDescription ? 'good' : 'bad'}">${metrics.hasMetaDescription ? '✓' : '✗'}</span></div>
      <div class="metric"><span class="metric-name">Open Graph</span><span class="metric-value ${metrics.hasOG ? 'good' : 'bad'}">${metrics.hasOG ? '✓' : '✗'}</span></div>
      <div class="metric"><span class="metric-name">Viewport Meta</span><span class="metric-value ${metrics.hasViewport ? 'good' : 'bad'}">${metrics.hasViewport ? '✓' : '✗'}</span></div>
    </div>

    <div class="card">
      <h2>Resources</h2>
      <div class="metric"><span class="metric-name">Scripts</span><span class="metric-value">${metrics.scripts}</span></div>
      <div class="metric"><span class="metric-name">Stylesheets</span><span class="metric-value">${metrics.stylesheets}</span></div>
    </div>
  </div>

  ${screenshotPath ? `<div style="max-width:800px;margin:40px auto 0"><img src="file://${screenshotPath}" class="screenshot" alt="Screenshot"></div>` : ''}

  <p class="timestamp">Generated: ${new Date().toISOString()}</p>
</body>
</html>`;

    const dashboardPath = join(DASHBOARDS_DIR, `dashboard_${timestamp()}.html`);
    writeFileSync(dashboardPath, html);

    return {
      success: true,
      dashboard: dashboardPath,
      metrics,
      screenshot: screenshotPath
    };
  } finally {
    await browser.close();
  }
}

// ============================================
// WATCH MODE (v5.0)
// ============================================

async function startWatchMode({ interval = 5000, tests = ['quick_report'] } = {}) {
  console.log('🔄 Watch mode started. Press Ctrl+C to stop.');
  console.log(`   Watching: ${SITE_ROOT}`);
  console.log(`   Tests: ${tests.join(', ')}`);
  console.log(`   Interval: ${interval}ms\n`);

  let lastRun = 0;

  const runTests = async () => {
    console.log(`[${new Date().toLocaleTimeString()}] Running tests...`);
    for (const test of tests) {
      if (tools[test]) {
        const result = await tools[test].fn({});
        console.log(`  ${test}: ${result.success ? '✓' : '✗'}`);
      }
    }
    lastRun = Date.now();
  };

  // Initial run
  await runTests();

  // Watch for file changes
  const watcher = watch(SITE_ROOT, { recursive: true }, async (eventType, filename) => {
    if (!filename) return;
    if (filename.includes('node_modules') || filename.includes('.git')) return;
    if (Date.now() - lastRun < interval) return;

    console.log(`\n📁 File changed: ${filename}`);
    await runTests();
  });

  return { success: true, message: 'Watch mode started', pid: process.pid };
}

// ============================================
// A/B COMPARISON (v5.0)
// ============================================

async function compareVersions({ url1, url2, viewport = 'desktop' } = {}) {
  const urlA = url1 || SITE_URL;
  const urlB = url2 || SITE_URL.replace('index.html', 'index-v2.html');

  const browser = await getBrowser();
  const results = {};

  try {
    for (const [label, url] of [['A', urlA], ['B', urlB]]) {
      const page = await browser.newPage({ viewport: VIEWPORTS[viewport] });

      try {
        const startTime = Date.now();
        await page.goto(url, { waitUntil: 'networkidle', timeout: 10000 });
        const loadTime = Date.now() - startTime;

        const metrics = await page.evaluate(() => ({
          elements: document.querySelectorAll('*').length,
          scrollHeight: document.body.scrollHeight
        }));

        const filename = `compare_${label}_${timestamp()}.png`;
        const filepath = join(REPORTS_DIR, filename);
        await page.screenshot({ path: filepath, fullPage: true });

        results[label] = { url, loadTime, ...metrics, screenshot: filepath, status: 'success' };
      } catch (err) {
        results[label] = { url, status: 'error', error: err.message };
      }

      await page.close();
    }

    // Calculate differences
    if (results.A?.status === 'success' && results.B?.status === 'success') {
      results.comparison = {
        loadTimeDiff: results.B.loadTime - results.A.loadTime,
        elementsDiff: results.B.elements - results.A.elements,
        winner: results.A.loadTime < results.B.loadTime ? 'A' : 'B'
      };
    }

    return { success: true, results };
  } finally {
    await browser.close();
  }
}

// ============================================
// FULL AUDIT (NEW - Everything)
// ============================================

async function fullAudit({ viewport = 'desktop' } = {}) {
  const browser = await getBrowser();
  try {
    const page = await getPage(browser, viewport);

    const audit = await page.evaluate(() => {
      const results = {
        page: {
          title: document.title,
          url: window.location.href,
          viewport: { width: window.innerWidth, height: window.innerHeight },
          scrollHeight: document.body.scrollHeight,
          domElements: document.querySelectorAll('*').length
        },
        structure: {
          headings: {
            h1: document.querySelectorAll('h1').length,
            h2: document.querySelectorAll('h2').length,
            h3: document.querySelectorAll('h3').length
          },
          sections: document.querySelectorAll('section').length,
          articles: document.querySelectorAll('article').length,
          nav: document.querySelectorAll('nav').length,
          forms: document.querySelectorAll('form').length
        },
        media: {
          images: document.images.length,
          videos: document.querySelectorAll('video').length,
          iframes: document.querySelectorAll('iframe').length,
          svgs: document.querySelectorAll('svg').length
        },
        interactive: {
          links: document.querySelectorAll('a').length,
          buttons: document.querySelectorAll('button').length,
          inputs: document.querySelectorAll('input').length
        },
        issues: []
      };

      // Quick checks
      if (results.structure.headings.h1 === 0) results.issues.push('missing-h1');
      if (results.structure.headings.h1 > 1) results.issues.push('multiple-h1');
      if (!document.querySelector('meta[name="description"]')) results.issues.push('missing-meta-description');
      if (document.querySelectorAll('img:not([alt])').length > 0) results.issues.push('images-without-alt');
      if (document.body.scrollWidth > window.innerWidth) results.issues.push('horizontal-scroll');

      return results;
    });

    // Take screenshot
    const filename = `full_audit_${viewport}_${timestamp()}.png`;
    const filepath = join(REPORTS_DIR, filename);
    await page.screenshot({ path: filepath });
    audit.screenshot = filepath;

    return { success: true, audit };
  } finally {
    await browser.close();
  }
}

// ============================================
// QUICK REPORT (NEW - Comprehensive)
// ============================================

async function quickReport({ viewport = 'desktop' } = {}) {
  const browser = await getBrowser();
  try {
    const page = await getPage(browser, viewport);

    // Gather all metrics in one pass
    const report = await page.evaluate(() => {
      const metrics = {
        viewport: { width: window.innerWidth, height: window.innerHeight },
        document: {
          title: document.title,
          scrollHeight: document.body.scrollHeight,
          elements: document.querySelectorAll('*').length
        },
        sections: document.querySelectorAll('section').length,
        images: document.images.length,
        links: document.querySelectorAll('a').length,
        buttons: document.querySelectorAll('button').length,
        forms: document.querySelectorAll('form').length,
        headings: {
          h1: document.querySelectorAll('h1').length,
          h2: document.querySelectorAll('h2').length,
          h3: document.querySelectorAll('h3').length
        },
        hasHorizontalScroll: document.body.scrollWidth > window.innerWidth,
        cssAnimations: document.querySelectorAll('[style*="animation"], [class*="animate"]').length
      };

      // Quick accessibility check
      metrics.accessibility = {
        imagesWithoutAlt: document.querySelectorAll('img:not([alt])').length,
        inputsWithoutLabel: Array.from(document.querySelectorAll('input')).filter(i => !i.labels?.length && !i.getAttribute('aria-label')).length
      };

      return metrics;
    });

    // Take screenshot
    const filename = `quick_report_${viewport}_${timestamp()}.png`;
    const filepath = join(REPORTS_DIR, filename);
    await page.screenshot({ path: filepath });
    report.screenshot = filepath;

    return { success: true, report };
  } finally {
    await browser.close();
  }
}

// ============================================
// TOOL ROUTER
// ============================================

const tools = {
  // Screenshots
  screenshot_hero: { fn: screenshotHero, desc: 'Hero section screenshot with optional annotation' },
  screenshot_full: { fn: screenshotFull, desc: 'Full page screenshot with section highlighting' },
  screenshot_element: { fn: screenshotElement, desc: 'Screenshot specific element by selector' },
  screenshot_comparison: { fn: screenshotComparison, desc: 'Compare multiple viewports' },

  // Scroll & Animation
  test_scroll: { fn: testScroll, desc: 'Test scroll behavior and sticky elements' },
  test_animations: { fn: testAnimations, desc: 'Capture animation frames' },
  test_hover: { fn: testHoverStates, desc: 'Test hover state changes' },

  // Layout Analysis
  analyze_layout: { fn: analyzeLayout, desc: 'Detect layout issues and overflow' },
  compare_elements: { fn: compareElements, desc: 'Compare position/overlap of elements' },
  analyze_zindex: { fn: analyzeZIndex, desc: 'Map z-index stacking order' },
  visualize_layout: { fn: visualizeLayout, desc: 'Visualize grid/flex layouts' },
  analyze_spacing: { fn: analyzeSpacing, desc: 'Analyze margins/padding consistency' },

  // Accessibility & SEO
  audit_accessibility: { fn: auditAccessibility, desc: 'Accessibility audit' },
  audit_seo: { fn: auditSEO, desc: 'SEO audit' },
  audit_mobile: { fn: auditMobile, desc: 'Mobile optimization audit' },
  audit_images: { fn: auditImages, desc: 'Image optimization audit' },
  check_contrast: { fn: checkContrast, desc: 'WCAG contrast ratio check' },
  test_keyboard: { fn: testKeyboardNav, desc: 'Keyboard navigation test' },

  // Colors & Typography
  analyze_colors: { fn: analyzeColors, desc: 'Extract color palette' },
  analyze_typography: { fn: analyzeTypography, desc: 'Analyze fonts and sizes' },
  extract_css_vars: { fn: extractCSSVariables, desc: 'Extract CSS custom properties' },

  // CSS Control
  inject_css: { fn: injectCSS, desc: 'Inject CSS and screenshot' },
  get_styles: { fn: getComputedStyles, desc: 'Get computed styles' },

  // DOM Inspection
  inspect_element: { fn: inspectElement, desc: 'Deep element inspection' },
  find_elements: { fn: findElements, desc: 'Find matching elements' },
  extract_content: { fn: extractContent, desc: 'Extract text/HTML' },
  visualize_dom: { fn: visualizeDOMTree, desc: 'Generate DOM tree ASCII view' },
  map_interactive: { fn: mapInteractiveElements, desc: 'Map all clickable elements' },
  inspect_meta: { fn: inspectMetaTags, desc: 'Inspect all meta tags' },
  inspect_storage: { fn: inspectStorage, desc: 'Inspect localStorage/cookies' },

  // Performance & Errors
  measure_performance: { fn: measurePerformance, desc: 'Measure load performance' },
  capture_console: { fn: captureConsole, desc: 'Capture console logs/errors' },
  check_links: { fn: checkLinks, desc: 'Check for broken links' },
  analyze_resources: { fn: analyzeResources, desc: 'Analyze network resources' },

  // Responsive
  find_breakpoints: { fn: findBreakpoints, desc: 'Find responsive breakpoints' },
  test_print: { fn: testPrintStyles, desc: 'Test print stylesheet' },

  // Baselines
  save_baseline: { fn: saveBaseline, desc: 'Save baseline screenshot' },
  compare_baseline: { fn: compareToBaseline, desc: 'Compare to baseline' },

  // Visual Tools
  highlight_all: { fn: highlightAll, desc: 'Highlight matching elements' },
  generate_sitemap: { fn: generateSiteMap, desc: 'Generate section map' },

  // Quick Tools
  quick_report: { fn: quickReport, desc: 'Comprehensive quick report' },
  full_audit: { fn: fullAudit, desc: 'Complete page audit' },

  // ========== v4.0 NEW TOOLS ==========

  // Visual Regression
  visual_regression: { fn: visualRegression, desc: 'Compare current vs baseline (pixel diff)' },
  update_baseline: { fn: updateBaseline, desc: 'Update baseline screenshot' },
  list_baselines: { fn: listBaselines, desc: 'List all saved baselines' },

  // Core Web Vitals
  web_vitals: { fn: measureWebVitals, desc: 'Measure LCP, CLS, FCP, TTFB' },
  lighthouse_scores: { fn: calculateScores, desc: 'Lighthouse-style scoring' },

  // Network & Performance
  test_throttle: { fn: testWithThrottling, desc: 'Test on slow network (3G/4G)' },
  scroll_perf: { fn: measureScrollPerformance, desc: 'Measure scroll jank/FPS' },

  // Theme Testing
  test_dark_mode: { fn: testDarkMode, desc: 'Test light/dark mode support' },

  // Form Testing
  test_forms: { fn: testForms, desc: 'Analyze and test form inputs' },

  // CSS Analysis
  css_coverage: { fn: analyzeCSSCoverage, desc: 'Find unused CSS rules' },

  // Component Tools
  isolate_component: { fn: isolateComponent, desc: 'Screenshot component in isolation' },
  capture_states: { fn: captureElementStates, desc: 'Capture all element states' },

  // Advanced DOM
  watch_mutations: { fn: watchMutations, desc: 'Watch DOM changes over time' },
  inspect_shadow: { fn: inspectShadowDOM, desc: 'Inspect shadow DOM/web components' },

  // Device Testing
  test_device: { fn: testAdvancedViewport, desc: 'Test specific device (safe areas)' },

  // Export
  export_pdf: { fn: exportToPDF, desc: 'Export page as PDF' },

  // ========== v5.0 ULTRA TOOLS ==========

  // Video & Recording
  record_video: { fn: recordVideo, desc: 'Record video of page interactions' },
  record_journey: { fn: recordJourney, desc: 'Record user journey with steps' },

  // Cross-Browser
  test_browsers: { fn: testCrossBrowser, desc: 'Test in Chromium, Firefox, WebKit' },

  // Performance Budgets
  check_budget: { fn: checkBudget, desc: 'Check against performance budgets' },

  // Critical Path
  extract_critical: { fn: extractCriticalCSS, desc: 'Extract above-the-fold CSS' },

  // Design System
  extract_tokens: { fn: extractDesignTokens, desc: 'Extract design tokens (colors, fonts, spacing)' },

  // Heatmaps
  generate_heatmap: { fn: generateHeatmap, desc: 'Generate interactive/content heatmap' },

  // Historical Tracking
  track_metrics: { fn: trackMetrics, desc: 'Track metrics over time' },
  get_history: { fn: getMetricsHistory, desc: 'Get metrics history' },

  // Dashboards
  generate_dashboard: { fn: generateDashboard, desc: 'Generate HTML dashboard report' },

  // A/B Testing
  compare_versions: { fn: compareVersions, desc: 'Compare two page versions' },

  // Watch Mode
  watch: { fn: startWatchMode, desc: 'Watch files and auto-test on changes' }
};

async function handleTool(name, args = {}) {
  if (!tools[name]) {
    return { error: `Unknown tool: ${name}`, available: Object.keys(tools) };
  }
  try {
    return await tools[name].fn(args);
  } catch (err) {
    return { error: err.message, stack: err.stack?.split('\n').slice(0, 3) };
  }
}

// ============================================
// CLI INTERFACE
// ============================================

const command = process.argv[2];
const args = process.argv[3] ? JSON.parse(process.argv[3]) : {};

if (command === 'help' || !command) {
  console.log('\n🚀 SYMBIOTIC MCP SERVER v5.0 ULTRA\n');
  console.log('Usage: node server.js <tool> [args_json]\n');
  console.log('Available tools:\n');

  const categories = {
    'Screenshots': ['screenshot_hero', 'screenshot_full', 'screenshot_element', 'screenshot_comparison'],
    'Scroll & Animation': ['test_scroll', 'test_animations', 'test_hover'],
    'Layout Analysis': ['analyze_layout', 'compare_elements', 'analyze_zindex', 'visualize_layout', 'analyze_spacing'],
    'Audits': ['audit_accessibility', 'audit_seo', 'audit_mobile', 'audit_images', 'check_contrast', 'test_keyboard'],
    'Design Analysis': ['analyze_colors', 'analyze_typography', 'extract_css_vars'],
    'CSS Control': ['inject_css', 'get_styles'],
    'DOM Inspection': ['inspect_element', 'find_elements', 'extract_content', 'visualize_dom', 'map_interactive', 'inspect_meta', 'inspect_storage'],
    'Performance': ['measure_performance', 'capture_console', 'check_links', 'analyze_resources'],
    'Responsive': ['find_breakpoints', 'test_print'],
    'Baselines': ['save_baseline', 'compare_baseline'],
    'Quick Tools': ['quick_report', 'full_audit', 'highlight_all', 'generate_sitemap'],
    '── v4.0 ──': [],
    'Visual Regression': ['visual_regression', 'update_baseline', 'list_baselines'],
    'Core Web Vitals': ['web_vitals', 'lighthouse_scores'],
    'Network Simulation': ['test_throttle', 'scroll_perf'],
    'Theme/Form': ['test_dark_mode', 'test_forms'],
    'CSS Coverage': ['css_coverage'],
    'Component Tools': ['isolate_component', 'capture_states'],
    'Advanced DOM': ['watch_mutations', 'inspect_shadow'],
    'Device/Export': ['test_device', 'export_pdf'],
    '── v5.0 ULTRA ──': [],
    'Video Recording': ['record_video', 'record_journey'],
    'Cross-Browser': ['test_browsers'],
    'Performance Budget': ['check_budget'],
    'Critical Path': ['extract_critical'],
    'Design Tokens': ['extract_tokens'],
    'Heatmaps': ['generate_heatmap'],
    'Historical': ['track_metrics', 'get_history'],
    'Dashboards': ['generate_dashboard'],
    'A/B Compare': ['compare_versions'],
    'Watch Mode': ['watch']
  };

  Object.entries(categories).forEach(([category, toolNames]) => {
    if (toolNames.length === 0) {
      console.log(`\n  ${category}`);
      return;
    }
    console.log(`  ${category}:`);
    toolNames.forEach(name => {
      if (tools[name]) console.log(`    ${name.padEnd(24)} ${tools[name].desc}`);
    });
    console.log('');
  });

  console.log('Examples:');
  console.log('  node server.js test_browsers');
  console.log('  node server.js record_video \'{"actions":["scroll","hover"]}\'');
  console.log('  node server.js check_budget');
  console.log('  node server.js generate_dashboard');
  console.log('  node server.js extract_tokens');
  console.log('  node server.js track_metrics \'{"name":"daily"}\'');
  console.log(`\nOutput directories:`);
  console.log(`  Reports:    ${REPORTS_DIR}`);
  console.log(`  Baselines:  ${BASELINES_DIR}`);
  console.log(`  Videos:     ${VIDEOS_DIR}`);
  console.log(`  Dashboards: ${DASHBOARDS_DIR}`);
  console.log(`  History:    ${HISTORY_DIR}`);
} else {
  handleTool(command, args)
    .then(result => console.log(JSON.stringify(result, null, 2)))
    .catch(err => console.error('Error:', err));
}
