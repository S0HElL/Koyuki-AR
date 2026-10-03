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

  const animControls = document.getElementById('animation-controls');
  const animSelect = document.getElementById('animation-select');
  const animToggle = document.getElementById('animation-toggle');

  // Must match the animation-name attribute in index.html and exist in the GLB.
  const DEFAULT_ANIMATION = 'Cafe_Reaction';

  document.getElementById('reload').addEventListener('click', () => location.reload());

  // --- Loading state -------------------------------------------------------
  viewer.addEventListener('progress', (event) => {
    const p = event.detail && event.detail.totalProgress;
    if (typeof p === 'number') loadingBar.value = p;
  });

  viewer.addEventListener('load', () => {
    loading.hidden = true;
    setupAnimationControls();
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

  // --- Animations ----------------------------------------------------------
  // The list comes from the loaded GLB (viewer.availableAnimations), never hardcoded.
  function setupAnimationControls() {
    const names = viewer.availableAnimations || [];
    if (names.length === 0) return; // static model: keep the controls hidden

    animSelect.replaceChildren(
      ...names.map((name) => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name.replace(/_/g, ' ');
        return option;
      })
    );

    if (names.includes(DEFAULT_ANIMATION)) {
      viewer.animationName = DEFAULT_ANIMATION;
    } else {
      console.warn(`Koyuki: default animation "${DEFAULT_ANIMATION}" not found in GLB.`);
    }
    animSelect.value = viewer.animationName || names[0];
    viewer.play();
    updateToggle();
    animControls.hidden = false;
  }

  animSelect.addEventListener('change', () => {
    viewer.animationName = animSelect.value;
    viewer.currentTime = 0;
    viewer.play();
    updateToggle();
  });

  animToggle.addEventListener('click', () => {
    if (viewer.paused) viewer.play();
    else viewer.pause();
    updateToggle();
  });

  function updateToggle() {
    animToggle.textContent = viewer.paused ? 'Play' : 'Pause';
    animToggle.setAttribute('aria-pressed', String(viewer.paused));
  }

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
