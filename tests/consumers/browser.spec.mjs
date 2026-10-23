import { test, expect } from '@playwright/test';
import { join } from 'node:path';

test.beforeEach(async ({ page }) => {
 await page.addInitScript(() => {
  const Native = window.ResizeObserver;
  window.resizeRecords = [];
  window.ResizeObserver = class extends Native {
   constructor(callback) {
    super(callback);
    const record = { target: null, disconnected: false, late: () => callback([], this) };
    this.record = record; window.resizeRecords.push(record);
   }
   observe(target, options) { this.record.target = target; return super.observe(target, options); }
   disconnect() { this.record.disconnected = true; return super.disconnect(); }
  };
  window.rafRecords = [];
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (callback) => { window.rafRecords.push(callback); return raf(callback); };
 });
 const errors = [];
 page.on('pageerror', (error) => errors.push(String(error)));
 page.on('console', (message) => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()); });
 page.testErrors = errors;
 await page.goto('/');
 await page.waitForFunction(() => Boolean(window.demo));
});
test.afterEach(async ({ page }) => { expect(page.testErrors).toEqual([]); });

test('real SSR hydration preserves DOM and rune, child and hydration-state behavior', async ({ page, request }) => {
 const html = await (await request.get('/')).text();
 expect(html).toContain('Count: 0; doubled: 0');
 expect(html).toMatch(/data-testid="hydration-idle">busy/);
 expect(html).toMatch(/data-testid="hydration-pending">busy/);
 expect(await page.evaluate(() => window.__sameNode)).toBe(true);
 await expect(page.getByTestId('hydration-idle')).toHaveText('idle');
 await expect(page.getByTestId('hydration-pending')).toHaveText('busy');
 await page.getByText('Finish hydration work', { exact: true }).click();
 await expect(page.getByTestId('hydration-pending')).toHaveText('idle');
 await page.getByTestId('counter').click();
 await expect(page.getByTestId('counter')).toHaveText('Count: 1; doubled: 2');
 await expect(page.getByTestId('snippet-child')).toHaveText('Snippet child');
 await expect(page.getByTestId('component-child')).toHaveText('Component child');
 await page.evaluate(() => { window.demo.optimistic.set(99); });
 await expect(page.getByTestId('optimistic')).toHaveText('99');
 await page.getByTestId('counter').click();
 await expect(page.getByTestId('optimistic')).toHaveText('12');
 const semantics = await page.evaluate(async () => {
  const d = window.demo;
  d.raw.get().n = 9; await d.tick();
  const rawText = document.querySelector('[data-testid="raw"]').textContent;
  d.deep.n = 7; await d.tick();
  d.raw.set({ n: 11 });
  const snapshot = d.snapshot(d.deep); d.deep.n = 8; await d.tick();
  return { rawText, snapshot: snapshot.n, sameRaw: d.rawProxy === d.original };
 });
 expect(semantics).toEqual({ rawText: '1', snapshot: 7, sameRaw: true });
 await expect(page.getByTestId('deep')).toHaveText('8');
 await expect(page.getByTestId('raw')).toHaveText('11');
});

test('LoaderStore accounts for overlap, rejection, duplicate hooks and reset generations', async ({ page }) => {
 const result = await page.evaluate(async () => {
  const { loader, tick } = window.demo;
  const states = [];
  const read = async () => { await tick(); states.push(loader.state.get()); };
  const a = loader.hook(); const b = loader.hook(); await read();
  a(); a(); await read(); b(); await read();
  const old = loader.hook(); loader.reset(); const fresh = loader.hook(); old(); await read(); fresh(); await read();
  const external = [];
  const value = await loader.run(() => Promise.resolve(42), (v) => external.push(v)); await read();
  const anchor = loader.hook();
  let error;
  try { await loader.run(() => Promise.reject(new Error('expected'))); } catch (e) { error = e.message; }
  await read(); anchor(); await read();
  let sync;
  try { await loader.run(() => { throw new Error('sync'); }); } catch (e) { sync = e.message; }
  return { states, value, external, error, sync, pending: loader.__pending };
 });
 expect(result).toEqual({ states: [true, true, false, true, false, false, true, false], value: 42, external: [true, false], error: 'expected', sync: 'sync', pending: 0 });
 await expect(page.getByTestId('busy')).toHaveText('idle');
});

test('Loader has standalone position, theme and size CSS in both layouts', async ({ page }, info) => {
 await page.evaluate(() => { window.finishVisual = window.demo.loader.hook(); });
 await page.waitForTimeout(650);
 const measurements = await page.evaluate(() => {
  const measure = (id) => {
   const host = document.querySelector(`[data-testid="${id}"]`);
   const loader = host.querySelector('.g-loader'); const spinner = loader.querySelector('svg');
   const h = host.getBoundingClientRect(); const l = loader.getBoundingClientRect(); const s = spinner.getBoundingClientRect();
   const css = getComputedStyle(loader);
   return { width: l.width, height: l.height, offsetX: l.x - h.x, offsetY: l.y - h.y, size: getComputedStyle(spinner).width, centeredX: Math.abs((s.x + s.width / 2) - (l.x + l.width / 2)), centeredY: Math.abs((s.y + s.height / 2) - (l.y + l.height / 2)), background: css.backgroundColor, position: css.position };
  };
  return { normal: measure('overlay'), small: measure('overlay-small') };
 });
 expect(measurements.normal).toMatchObject({ width: 240, height: 160, offsetX: 0, offsetY: 0, size: '96px', background: 'rgb(229, 231, 235)', position: 'absolute' });
 expect(measurements.small).toMatchObject({ width: 240, height: 80, offsetX: 0, offsetY: 0, size: '32px', background: 'rgb(1, 2, 3)', position: 'absolute' });
 for (const m of Object.values(measurements)) { expect(m.centeredX).toBeLessThan(1); expect(m.centeredY).toBeLessThan(1); }
 await info.attach('loader-measurements', { body: JSON.stringify(measurements, null, 2), contentType: 'application/json' });
 await page.screenshot({ path: join(process.env.STATE_MOTION_EVIDENCE_DIR, `${info.project.name}-loader.png`), fullPage: true });
 await page.evaluate(() => { window.finishVisual(); window.demo.showFixed(true); });
 await page.waitForTimeout(650);
 const fixed = await page.locator('main > .g-loader').evaluate((el) => ({ position: getComputedStyle(el).position, width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height, x: el.getBoundingClientRect().x, y: el.getBoundingClientRect().y }));
 expect(fixed).toEqual({ position: 'fixed', width: 960, height: 720, x: 0, y: 0 });
});

test('color and vector consumers render intermediate and final values', async ({ page }) => {
 await page.evaluate(() => window.demo.animate());
 await expect.poll(() => page.evaluate(() => window.demo.vector.get().x)).toBe(100);
 const state = await page.evaluate(() => ({ vector: { ...window.demo.vector.get() }, color: { ...window.demo.color.get() }, intermediate: window.demo.samples.some((n) => n > 0 && n < 100), pending: window.demo.status().pending, transform: getComputedStyle(document.querySelector('[data-testid="motion"]')).transform }));
 expect(state.vector).toEqual({ x: 100, y: 50, z: 25 });
 expect(state.color).toEqual({ l: .8, c: .12, h: 10, a: .7 });
 expect(state.intermediate).toBe(true);
 expect(state.transform).toContain('100, 50, 25');
 await expect.poll(() => page.evaluate(() => window.demo.status().pending)).toBe(0);
});

test('presence reverses, hides after easing and ignores late frames after destroy', async ({ page }) => {
 await page.evaluate(() => { window.demo.presence.duration = 160; });
 await page.getByTestId('toggle').click();
 await expect(page.getByTestId('presence')).toBeAttached();
 await expect.poll(() => page.evaluate(() => window.demo.presence.progress.get())).toBeGreaterThan(0);
 await page.getByTestId('toggle').click();
 await expect(page.getByTestId('presence')).toHaveCount(0);
 const result = await page.evaluate(() => {
  const p = window.demo.presence;
  p.toggle(); const late = window.rafRecords.at(-1); p.destroy();
  const before = p.progress.get(); late(performance.now() + 80);
  return { before, after: p.progress.get(), frame: p.frame.get() };
 });
 expect(result.after).toBe(result.before); expect(result.frame).toBe(0);
});

test('native ResizeObserver preserves departures and rejects old scope and unmount callbacks', async ({ page }, info) => {
 await expect.poll(() => page.evaluate(() => window.demo.geometry.height('row'))).toBe('96.5px');
 await page.evaluate(() => window.demo.setHeight(180.25));
 await expect.poll(() => page.evaluate(() => window.demo.geometry.height('row'))).toBe('180.25px');
 await page.evaluate(() => window.demo.depart());
 await expect(page.getByTestId('slot')).toHaveCSS('height', '16px');
 expect(await page.evaluate(() => window.demo.geometry.height('row'))).toBe('180.25px');
 const details = await page.evaluate(async () => {
  const d = window.demo; const record = window.resizeRecords.find((r) => r.target?.dataset.testid === 'slot');
  d.resetScope(); d.returnScope(); record.late();
  const resetHeight = d.geometry.height('row');
  await window.__unmount(); record.late();
  return { resetHeight: resetHeight ?? null, lateHeight: d.geometry.height('row') ?? null, disconnected: record.disconnected, state: d.status() };
 });
 expect(details.resetHeight).toBeNull(); expect(details.lateHeight).toBeNull(); expect(details.disconnected).toBe(true);
 expect(details.state).toMatchObject({ disposed: true, pending: 0, frame: 0 });
 await info.attach('slot-geometry-measurements', { body: JSON.stringify(details, null, 2), contentType: 'application/json' });
});

test('root disposer and unmount stop effects, motion and old Loader work', async ({ page }) => {
 const result = await page.evaluate(async () => {
  const d = window.demo;
  await d.tick(); d.stopEffects(); const effects = d.effects.length;
  d.count.set(12); await d.tick();
  const old = d.loader.hook(); d.animate(); d.presence.toggle();
  await window.__unmount(); const unmounted = d.status();
  const fresh = d.loader.hook(); old(); await d.tick(); const freshBusy = d.loader.state.get();
  fresh(); await d.tick();
  return { effects, after: d.effects.length, cleanup: d.status().cleanup, unmounted, freshBusy, busy: d.loader.state.get() };
 });
 expect(result.after).toBe(result.effects); expect(result.cleanup).toBeGreaterThan(0);
 expect(result.unmounted).toMatchObject({ disposed: true, frame: 0, pending: 0 });
 expect(result.freshBusy).toBe(true); expect(result.busy).toBe(false);
 await expect(page.locator('main')).toHaveCount(0);
});
