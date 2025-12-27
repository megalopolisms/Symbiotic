#!/usr/bin/env node
/**
 * Symbiotic Website MCP Server
 * Full testing, screenshot, mobile optimization, and diagnostics
 */

import { chromium } from 'playwright';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = dirname(__dirname);
const SITE_URL = 'file://' + join(SITE_ROOT, 'index.html');
const LIVE_URL = 'https://symbioticastrodynamics.com';
const OUTPUT_DIR = '/Users/yuripetrinim5/Downloads';

// MCP Protocol Implementation
const tools = {
  // Screenshot Tools
  screenshot_hero: {
    description: 'Take a screenshot of the hero section (above the fold)',
    parameters: {
      type: 'object',
      properties: {
        viewport: {
          type: 'string',
          enum: ['desktop', 'tablet', 'mobile'],
          default: 'desktop'
        },
        live: {
          type: 'boolean',
          default: false,
          description: 'Use live URL instead of local files'
        }
      }
    }
  },
  screenshot_full: {
    description: 'Take a full-page screenshot',
    parameters: {
      type: 'object',
      properties: {
        viewport: {
          type: 'string',
          enum: ['desktop', 'tablet', 'mobile'],
          default: 'desktop'
        }
      }
    }
  },
  screenshot_element: {
    description: 'Screenshot a specific CSS selector',
    parameters: {
      type: 'object',
      properties: {
        selector: { type: 'string' },
        viewport: { type: 'string', enum: ['desktop', 'tablet', 'mobile'], default: 'desktop' }
      },
      required: ['selector']
    }
  },

  // Layout Diagnostics
  check_layout: {
    description: 'Analyze layout issues, overlapping elements, and positioning',
    parameters: {
      type: 'object',
      properties: {
        section: { type: 'string', description: 'CSS selector or section name to focus on' }
      }
    }
  },
  check_mobile: {
    description: 'Full mobile optimization audit',
    parameters: { type: 'object', properties: {} }
  },
  check_accessibility: {
    description: 'Run accessibility audit (a11y)',
    parameters: { type: 'object', properties: {} }
  },

  // Content Validation
  validate_links: {
    description: 'Check all links on the page',
    parameters: { type: 'object', properties: {} }
  },
  validate_images: {
    description: 'Check all images load correctly',
    parameters: { type: 'object', properties: {} }
  },
  extract_text: {
    description: 'Extract all visible text from the page',
    parameters: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'Optional CSS selector to limit extraction' }
      }
    }
  },

  // Element Analysis
  get_element_bounds: {
    description: 'Get bounding box and computed styles for an element',
    parameters: {
      type: 'object',
      properties: {
        selector: { type: 'string' }
      },
      required: ['selector']
    }
  },
  compare_elements: {
    description: 'Compare positions of two elements to check overlap/alignment',
    parameters: {
      type: 'object',
      properties: {
        selector1: { type: 'string' },
        selector2: { type: 'string' }
      },
      required: ['selector1', 'selector2']
    }
  }
};

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 812 }
};

async function getBrowser() {
  return await chromium.launch({ headless: true });
}

async function getPage(browser, viewport = 'desktop') {
  const page = await browser.newPage({ viewport: VIEWPORTS[viewport] });
  await page.goto(SITE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500); // Let animations settle
  return page;
}

// Tool Implementations
async function screenshotHero({ viewport = 'desktop', live = false } = {}) {
  const browser = await getBrowser();
  try {
    const page = await browser.newPage({ viewport: VIEWPORTS[viewport] });
    const url = live ? LIVE_URL : SITE_URL;
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    const filename = `symbiotic_hero_${viewport}_${Date.now()}.png`;
    const filepath = join(OUTPUT_DIR, filename);

    await page.screenshot({
      path: filepath,
      clip: { x: 0, y: 0, width: VIEWPORTS[viewport].width, height: VIEWPORTS[viewport].height }
    });

    return { success: true, file: filepath, viewport, message: `Hero screenshot saved to ${filepath}` };
  } finally {
    await browser.close();
  }
}

async function screenshotFull({ viewport = 'desktop' } = {}) {
  const browser = await getBrowser();
  try {
    const page = await getPage(browser, viewport);
    const filename = `symbiotic_full_${viewport}_${Date.now()}.png`;
    const filepath = join(OUTPUT_DIR, filename);

    await page.screenshot({ path: filepath, fullPage: true });
    return { success: true, file: filepath, viewport, message: `Full page screenshot saved to ${filepath}` };
  } finally {
    await browser.close();
  }
}

async function screenshotElement({ selector, viewport = 'desktop' }) {
  const browser = await getBrowser();
  try {
    const page = await getPage(browser, viewport);
    const element = await page.$(selector);
    if (!element) {
      return { success: false, error: `Element not found: ${selector}` };
    }

    const filename = `symbiotic_element_${Date.now()}.png`;
    const filepath = join(OUTPUT_DIR, filename);
    await element.screenshot({ path: filepath });

    return { success: true, file: filepath, selector, message: `Element screenshot saved to ${filepath}` };
  } finally {
    await browser.close();
  }
}

async function checkLayout({ section } = {}) {
  const browser = await getBrowser();
  try {
    const page = await getPage(browser);

    const issues = await page.evaluate((sectionSelector) => {
      const problems = [];
      const elements = sectionSelector
        ? document.querySelectorAll(sectionSelector + ' *')
        : document.querySelectorAll('body *');

      const rects = [];
      elements.forEach((el, i) => {
        const rect = el.getBoundingClientRect();
        const styles = window.getComputedStyle(el);

        // Skip invisible elements
        if (rect.width === 0 || rect.height === 0) return;
        if (styles.display === 'none' || styles.visibility === 'hidden') return;

        rects.push({ el, rect, tag: el.tagName, class: el.className });

        // Check for overflow
        if (rect.right > window.innerWidth) {
          problems.push({
            type: 'overflow-right',
            element: `${el.tagName}.${el.className.split(' ')[0] || 'no-class'}`,
            overflow: rect.right - window.innerWidth
          });
        }

        // Check for negative positioning
        if (rect.left < 0) {
          problems.push({
            type: 'overflow-left',
            element: `${el.tagName}.${el.className.split(' ')[0] || 'no-class'}`,
            overflow: Math.abs(rect.left)
          });
        }
      });

      // Check for overlapping siblings
      for (let i = 0; i < rects.length; i++) {
        for (let j = i + 1; j < rects.length; j++) {
          const a = rects[i].rect;
          const b = rects[j].rect;

          // Simple overlap check for elements at same level
          if (rects[i].el.parentElement === rects[j].el.parentElement) {
            if (!(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom)) {
              const overlapArea = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
                                  Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
              if (overlapArea > 100) { // Significant overlap
                problems.push({
                  type: 'overlap',
                  element1: `${rects[i].tag}.${rects[i].class.split(' ')[0] || 'no-class'}`,
                  element2: `${rects[j].tag}.${rects[j].class.split(' ')[0] || 'no-class'}`,
                  area: overlapArea
                });
              }
            }
          }
        }
      }

      return problems;
    }, section);

    return { success: true, issues, count: issues.length, section: section || 'full page' };
  } finally {
    await browser.close();
  }
}

async function checkMobile() {
  const browser = await getBrowser();
  const results = { viewports: {} };

  try {
    for (const [name, viewport] of Object.entries(VIEWPORTS)) {
      const page = await browser.newPage({ viewport });
      await page.goto(SITE_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);

      const analysis = await page.evaluate(() => {
        const issues = [];

        // Check for horizontal scroll
        if (document.body.scrollWidth > window.innerWidth) {
          issues.push({
            type: 'horizontal-scroll',
            scrollWidth: document.body.scrollWidth,
            viewportWidth: window.innerWidth
          });
        }

        // Check touch targets
        document.querySelectorAll('a, button, input, select').forEach(el => {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            if (rect.width < 44 || rect.height < 44) {
              issues.push({
                type: 'small-touch-target',
                element: el.tagName + (el.className ? '.' + el.className.split(' ')[0] : ''),
                size: `${rect.width}x${rect.height}`
              });
            }
          }
        });

        // Check font sizes
        document.querySelectorAll('p, span, a, li').forEach(el => {
          const fontSize = parseFloat(window.getComputedStyle(el).fontSize);
          if (fontSize < 14) {
            issues.push({
              type: 'small-font',
              element: el.tagName + (el.className ? '.' + el.className.split(' ')[0] : ''),
              fontSize: fontSize
            });
          }
        });

        return { issues, bodyWidth: document.body.scrollWidth };
      });

      results.viewports[name] = analysis;
      await page.close();
    }

    return { success: true, results };
  } finally {
    await browser.close();
  }
}

async function getElementBounds({ selector }) {
  const browser = await getBrowser();
  try {
    const page = await getPage(browser);

    const bounds = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;

      const rect = el.getBoundingClientRect();
      const styles = window.getComputedStyle(el);

      return {
        rect: {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          right: rect.right,
          bottom: rect.bottom
        },
        styles: {
          position: styles.position,
          display: styles.display,
          zIndex: styles.zIndex,
          margin: styles.margin,
          padding: styles.padding,
          flexDirection: styles.flexDirection,
          gridTemplateColumns: styles.gridTemplateColumns
        }
      };
    }, selector);

    if (!bounds) {
      return { success: false, error: `Element not found: ${selector}` };
    }

    return { success: true, selector, bounds };
  } finally {
    await browser.close();
  }
}

async function compareElements({ selector1, selector2 }) {
  const browser = await getBrowser();
  try {
    const page = await getPage(browser);

    const comparison = await page.evaluate(({ sel1, sel2 }) => {
      const el1 = document.querySelector(sel1);
      const el2 = document.querySelector(sel2);

      if (!el1 || !el2) {
        return { error: `Element not found: ${!el1 ? sel1 : sel2}` };
      }

      const rect1 = el1.getBoundingClientRect();
      const rect2 = el2.getBoundingClientRect();

      // Check overlap
      const overlapping = !(rect1.right < rect2.left || rect1.left > rect2.right ||
                           rect1.bottom < rect2.top || rect1.top > rect2.bottom);

      const overlapArea = overlapping
        ? Math.max(0, Math.min(rect1.right, rect2.right) - Math.max(rect1.left, rect2.left)) *
          Math.max(0, Math.min(rect1.bottom, rect2.bottom) - Math.max(rect1.top, rect2.top))
        : 0;

      return {
        element1: { selector: sel1, rect: rect1 },
        element2: { selector: sel2, rect: rect2 },
        overlapping,
        overlapArea,
        verticalGap: rect2.top - rect1.bottom,
        horizontalGap: rect2.left - rect1.right
      };
    }, { sel1: selector1, sel2: selector2 });

    if (comparison.error) {
      return { success: false, error: comparison.error };
    }

    return { success: true, comparison };
  } finally {
    await browser.close();
  }
}

async function extractText({ selector } = {}) {
  const browser = await getBrowser();
  try {
    const page = await getPage(browser);

    const text = await page.evaluate((sel) => {
      const root = sel ? document.querySelector(sel) : document.body;
      if (!root) return null;
      return root.innerText;
    }, selector);

    if (text === null && selector) {
      return { success: false, error: `Element not found: ${selector}` };
    }

    return { success: true, text, selector: selector || 'body' };
  } finally {
    await browser.close();
  }
}

// Main MCP handler
async function handleTool(name, args) {
  switch (name) {
    case 'screenshot_hero': return await screenshotHero(args);
    case 'screenshot_full': return await screenshotFull(args);
    case 'screenshot_element': return await screenshotElement(args);
    case 'check_layout': return await checkLayout(args);
    case 'check_mobile': return await checkMobile();
    case 'get_element_bounds': return await getElementBounds(args);
    case 'compare_elements': return await compareElements(args);
    case 'extract_text': return await extractText(args);
    default: return { error: `Unknown tool: ${name}` };
  }
}

// CLI mode for testing
if (process.argv[2]) {
  const tool = process.argv[2];
  const args = process.argv[3] ? JSON.parse(process.argv[3]) : {};

  handleTool(tool, args)
    .then(result => console.log(JSON.stringify(result, null, 2)))
    .catch(err => console.error(err));
} else {
  console.log('Symbiotic MCP Server');
  console.log('Available tools:', Object.keys(tools).join(', '));
  console.log('\nUsage: node server.js <tool_name> [args_json]');
  console.log('Example: node server.js screenshot_hero \'{"viewport":"mobile"}\'');
}
