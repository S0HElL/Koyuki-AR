// Koyuki WebAR — page logic. Vanilla JS, no build step.
(() => {
  'use strict';

  const viewer = document.getElementById('koyuki');
  const loading = document.getElementById('loading');
  const loadingBar = document.getElementById('loading-bar');
  const loadError = document.getElementById('load-error');
  const arUnavailable = document.getElementById('ar-unavailable');
  const arFailed = document.getElementById('ar-failed');
  const arInstructions = document.getElementById('ar-instructions');

  document.getElementById('reload').addEventListener('click', () => location.reload());

  // --- Loading state -------------------------------------------------------
  viewer.addEventListener('progress', (event) => {
    const p = event.detail && event.detail.totalProgress;
    if (typeof p === 'number') loadingBar.value = p;
  });

  viewer.addEventListener('load', () => {
    loading.hidden = true;
    detectArSupport();
  });

  viewer.addEventListener('error', (event) => {
    console.error('Koyuki: model-viewer error', event.detail || event);
    loading.hidden = true;
    loadError.hidden = false;
  });

  // If the <model-viewer> custom element never registers (CDN blocked/offline),
  // do not leave the user on an endless spinner.
  window.setTimeout(() => {
    if (!customElements.get('model-viewer')) {
      console.error('Koyuki: <model-viewer> failed to load from the CDN.');
      loading.hidden = true;
      loadError.hidden = false;
    }
  }, 15000);

  // --- AR availability -----------------------------------------------------
  // canActivateAR is resolved asynchronously by <model-viewer>, so poll briefly.
  function detectArSupport() {
    const deadline = performance.now() + 3000;
    const check = () => {
      if (viewer.canActivateAR) {
        arUnavailable.hidden = true;
        arInstructions.hidden = false;
        return;
      }
      if (performance.now() < deadline) {
        window.setTimeout(check, 200);
        return;
      }
      // AR unavailable: the slotted AR button is hidden by <model-viewer>;
      // keep the 3D viewer and tell the user why.
      arUnavailable.hidden = false;
      arInstructions.hidden = true;
    };
    check();
  }

  // --- AR session status ---------------------------------------------------
  // Fired with detail.status in: not-presenting | session-started | object-placed | failed
  viewer.addEventListener('ar-status', (event) => {
    const status = event.detail && event.detail.status;
    if (status === 'failed') {
      console.warn('Koyuki: AR session failed to start.');
      arFailed.hidden = false;
    } else if (status === 'session-started') {
      arFailed.hidden = true;
    }
  });

  viewer.addEventListener('ar-tracking', (event) => {
    console.debug('Koyuki: AR tracking', event.detail && event.detail.status);
  });
})();
