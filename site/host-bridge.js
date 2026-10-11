/* AquaNook Windows host adapter. Scene code remains local and has no network API.
 * x/y are normalized viewport coordinates, not desktop or device pixels.
 * This adapter observes pointer motion; it never captures native desktop input.
 */
(() => {
  'use strict';
  const native = window.chrome?.webview;
  const isWallpaper = document.documentElement.dataset.motion === 'host';
  const world = location.pathname.split('/').filter(Boolean)[1] || 'reefscape';
  const state = {ready:false, rate:native ? 0 : 30, paused:false, power:false, quality:null};
  const errors = new Set();
  let readinessTimer, statsTimer, pointerCount = 0, lastInside = false;
  const post = message => {
    const payload = {app:'AquaNook3D', version:1, world, ...message};
    native?.postMessage(payload);
    dispatchEvent(new CustomEvent('aquarium-host-message', {detail:payload}));
    return payload;
  };
  function error(reason) {
    const message = String(reason?.stack || reason || 'Unknown scene error');
    if (errors.has(message) || errors.size >= 10) return;
    errors.add(message);
    post({type:'error', message});
  }
  addEventListener('error', event => error(event.error || event.message));
  addEventListener('unhandledrejection', event => error(event.reason));
  addEventListener('aquarium-error', event => error(event.detail));
  const originalError = console.error.bind(console);
  console.error = (...parts) => {
    originalError(...parts);
    error(parts.map(part => part?.stack || String(part)).join(' '));
  };
  function stats() {
    try {
      return {
        ready:state.ready,
        host:{rate:state.rate, paused:state.paused, onBattery:state.power, pointerCount},
        scene:typeof window.sceneStats === 'function' ? window.sceneStats() : null,
        geometry:typeof window.sceneTelemetry === 'function' ? window.sceneTelemetry() : null,
        errors:[...errors],
      };
    } catch (reason) { error(reason); return {ready:state.ready, errors:[...errors]}; }
  }
  function pointer(message) {
    const canvas = document.querySelector('#scene');
    if (!canvas || !state.ready) return false;
    const inside = message.inside !== false && Number.isFinite(message.x) && Number.isFinite(message.y)
      && message.x >= 0 && message.x <= 1 && message.y >= 0 && message.y <= 1;
    if (!inside) {
      if (lastInside) canvas.dispatchEvent(new PointerEvent('pointerleave', {pointerType:'mouse'}));
      lastInside = false;
      return true;
    }
    const box = canvas.getBoundingClientRect();
    canvas.dispatchEvent(new PointerEvent('pointermove', {
      clientX:box.left + message.x * box.width, clientY:box.top + message.y * box.height,
      pointerType:'mouse', pointerId:1, isPrimary:true, bubbles:true,
    }));
    pointerCount++;
    lastInside = true;
    return true;
  }
  function applyState() {
    window.scenePower?.(state.power);
    if (state.quality) window.sceneQuality?.(state.quality);
    window.scenePause?.(state.paused);
    window.sceneRate?.(state.rate);
  }
  function command(message) {
    if (!message || typeof message !== 'object') return false;
    try {
      switch (message.type) {
        case 'pointer': return pointer(message);
        case 'feed':
          if (!state.ready || state.paused || state.rate <= 0) return false;
          window.sceneFeed();
          return true;
        case 'pause':
          if (typeof message.value !== 'boolean') return false;
          state.paused = message.value;
          if (state.paused) pointer({inside:false});
          break;
        case 'rate':
          if (!Number.isFinite(message.value)) return false;
          state.rate = Math.max(0, Math.min(60, message.value));
          if (state.rate === 0) pointer({inside:false});
          break;
        case 'power':
          if (typeof message.value !== 'boolean') return false;
          state.power = message.value;
          break;
        case 'quality':
          if (!['eco','balanced','detail','native'].includes(message.value)) return false;
          state.quality = message.value;
          break;
        case 'stats': post({type:'stats', ...stats()}); return true;
        default: return false;
      }
      if (state.ready) {
        if (message.type === 'pause') window.scenePause(state.paused);
        else if (message.type === 'rate') window.sceneRate(state.rate);
        else if (message.type === 'power') window.scenePower(state.power);
        else if (message.type === 'quality') window.sceneQuality(state.quality);
      }
      return true;
    } catch (reason) { error(reason); return false; }
  }
  native?.addEventListener('message', event => {
    const accepted = command(event.data);
    if (event.data?.id !== undefined) post({type:'ack', id:event.data.id, accepted});
  });
  window.aquaBridge = Object.freeze({command, stats});
  const began = performance.now();
  function ready() {
    // NavigationCompleted occurs before asynchronous textures/terrain/shaders are ready.
    if (typeof window.sceneStats === 'function' && typeof window.sceneQuality === 'function') {
      // Shader compilation can log a WebGL error without throwing from scene startup.
      // Do not announce a healthy wallpaper with invisible fish in that case.
      if (errors.size) { state.ready=false; return; }
      state.ready = true;
      if (isWallpaper || native) applyState();
      post({type:'ready', capabilities:['pointer','feed','pause','rate','quality','power','stats'], ...stats()});
      if (native) statsTimer = setInterval(() => post({type:'stats', ...stats()}), 5000);
      return;
    }
    if (performance.now() - began > 60000) {
      error('Bể cá 3D chưa khởi động sau 60 giây. Hãy kiểm tra WebView2 và tăng tốc đồ họa.');
      return;
    }
    readinessTimer = setTimeout(ready, 100);
  }
  ready();
  addEventListener('pagehide', () => {
    clearTimeout(readinessTimer);
    clearInterval(statsTimer);
  });
})();
