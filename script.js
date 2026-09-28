(() => {
  'use strict';

  const DEFAULT_MATERIAL = Object.freeze({
    palette: 'peach',
    depth: 3,
    roundness: 28,
  });

  const PALETTE_NAMES = Object.freeze({
    peach: 'Peach',
    sage: 'Sage',
    lilac: 'Lilac',
  });

  function initNavigation() {
    const header = document.querySelector('[data-header]');
    const toggle = document.querySelector('[data-menu-toggle]');
    const navigation = document.querySelector('[data-navigation]');

    if (!header || !toggle || !navigation) return;

    const desktop = window.matchMedia('(min-width: 64rem)');

    const isOpen = () => toggle.getAttribute('aria-expanded') === 'true';

    function closeMenu(restoreFocus = false) {
      toggle.setAttribute('aria-expanded', 'false');

      if (restoreFocus && !desktop.matches) {
        toggle.focus({ preventScroll: true });
      }
    }

    function syncViewport() {
      const focused = document.activeElement;

      toggle.hidden = desktop.matches;

      closeMenu(!desktop.matches && navigation.contains(focused));

      if (desktop.matches && focused === toggle) {
        navigation.querySelector('a')?.focus({ preventScroll: true });
      }
    }

    toggle.addEventListener('click', () => {
      if (!desktop.matches) {
        toggle.setAttribute('aria-expanded', String(!isOpen()));
      }
    });

    navigation.addEventListener('click', (event) => {
      const link = event.target.closest("a[href^='#']");

      if (!link || desktop.matches || !isOpen()) return;

      if (
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      closeMenu();

      const section = document.getElementById(link.hash.slice(1));

      if (section) {
        if (!section.hasAttribute('tabindex')) {
          section.tabIndex = -1;
        }

        section.focus({ preventScroll: true });
      }

    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !desktop.matches && isOpen()) {
        event.preventDefault();
        closeMenu(header.contains(document.activeElement));
      }
    });

    document.addEventListener('pointerdown', (event) => {
      if (!desktop.matches && isOpen() && !header.contains(event.target)) {
        closeMenu(navigation.contains(document.activeElement));
      }
    });

    document.addEventListener('focusin', (event) => {
      if (!desktop.matches && isOpen() && !header.contains(event.target)) {
        closeMenu();
      }
    });

    desktop.addEventListener('change', syncViewport);

    header.dataset.menuReady = 'true';
    syncViewport();
  }

  function initSectionHighlighting() {
    const navigation = document.querySelector('[data-navigation]');
    const header = document.querySelector('[data-header]');

    if (!navigation) return;

    const items = [...navigation.querySelectorAll("a[href^='#']")]
      .map((link) => ({
        link,
        section: document.getElementById(link.hash.slice(1)),
      }))
      .filter((item) => item.section);

    if (!items.length) return;

    const desktop = window.matchMedia('(min-width: 64rem)');

    let framePending = false;
    let currentLink = null;

    function update() {
      framePending = false;

      const headerHeight =
        desktop.matches && header ? header.getBoundingClientRect().height : 0;

      const readingLine =
        headerHeight + Math.min(window.innerHeight * 0.2, 160);

      let active = items[0];

      for (const item of items) {
        if (item.section.getBoundingClientRect().top <= readingLine) {
          active = item;
        }
      }

      if (currentLink === active.link) return;

      currentLink = active.link;

      for (const { link } of items) {
        if (link === currentLink) {
          link.setAttribute('aria-current', 'location');
        } else {
          link.removeAttribute('aria-current');
        }
      }
    }

    function scheduleUpdate() {
      if (framePending) return;

      framePending = true;
      window.requestAnimationFrame(update);
    }

    window.addEventListener('scroll', scheduleUpdate, {
      passive: true,
    });

    window.addEventListener('resize', scheduleUpdate);
    window.addEventListener('load', scheduleUpdate);
    window.addEventListener('pageshow', scheduleUpdate);

    update();
  }

  function clampStep(value, min, max, step, fallback) {
    const number = Number(value);

    if (!Number.isFinite(number)) return fallback;

    const bounded = Math.min(max, Math.max(min, number));

    return min + Math.round((bounded - min) / step) * step;
  }

  function initMaterialExplorer() {
    const explorer = document.querySelector('[data-explorer]');

    if (!explorer) {
      return () => ({ ...DEFAULT_MATERIAL });
    }

    const controls = explorer.querySelector('[data-explorer-controls]');
    const depth = explorer.querySelector('[data-depth]');
    const roundness = explorer.querySelector('[data-roundness]');
    const depthOutput = document.getElementById('depth-value');
    const roundnessOutput = document.getElementById('roundness-value');
    const reset = explorer.querySelector('[data-reset-explorer]');
    const palettes = [...explorer.querySelectorAll('input[name="palette"]')];

    if (
      !controls ||
      !depth ||
      !roundness ||
      !depthOutput ||
      !roundnessOutput ||
      !reset ||
      !palettes.length
    ) {
      return () => ({ ...DEFAULT_MATERIAL });
    }

    let material = { ...DEFAULT_MATERIAL };

    function applyMaterial(settings) {
      const palette = Object.prototype.hasOwnProperty.call(
        PALETTE_NAMES,
        settings.palette,
      )
        ? settings.palette
        : DEFAULT_MATERIAL.palette;

      material = {
        palette,
        depth: clampStep(settings.depth, 1, 5, 1, DEFAULT_MATERIAL.depth),
        roundness: clampStep(
          settings.roundness,
          12,
          44,
          4,
          DEFAULT_MATERIAL.roundness,
        ),
      };

      explorer.dataset.palette = material.palette;

      explorer.style.setProperty('--clay-depth', String(material.depth));

      explorer.style.setProperty('--clay-radius', `${material.roundness}px`);

      depth.value = String(material.depth);
      roundness.value = String(material.roundness);

      depthOutput.value = `${material.depth} / 5`;
      roundnessOutput.value = `${material.roundness} px`;

      depth.setAttribute('aria-valuetext', `${material.depth} out of 5`);

      roundness.setAttribute('aria-valuetext', `${material.roundness} pixels`);

      for (const input of palettes) {
        input.checked = input.value === material.palette;
      }

      explorer.dispatchEvent(new Event('materialchange'));
    }

    function readControls() {
      applyMaterial({
        palette: palettes.find((input) => input.checked)?.value,
        depth: depth.value,
        roundness: roundness.value,
      });
    }

    depth.addEventListener('input', readControls);
    roundness.addEventListener('input', readControls);

    for (const input of palettes) {
      input.addEventListener('change', readControls);
    }

    reset.addEventListener('click', () => {
      applyMaterial(DEFAULT_MATERIAL);
    });

    readControls();
    controls.disabled = false;

    const help = explorer.querySelector('[data-explorer-help]');

    if (help) {
      help.textContent =
        'Choose a color, then adjust depth and corner softness. ' +
        'Use arrow keys when a slider is focused.';
    }

    return () => ({ ...material });
  }

  function initProjectBrief(getMaterial) {
    const group = document.getElementById('project-form');

    if (!group) return;

    const brand = group.querySelector('#brand-name');
    const type = group.querySelector('#project-type');
    const goal = group.querySelector('#project-goal');
    const create = group.querySelector('[data-create-brief]');
    const result = group.querySelector('[data-brief-result]');
    const output = group.querySelector('#project-brief');
    const copy = group.querySelector('[data-copy-brief]');
    const status = group.querySelector('[data-brief-status]');

    if (
      !brand ||
      !type ||
      !goal ||
      !create ||
      !result ||
      !output ||
      !copy ||
      !status
    ) {
      return;
    }

    function setStatus(message, state = 'success') {
      status.textContent = message;
      status.dataset.state = state;
    }

    function buildBrief() {
      const material = getMaterial();

      const projectType =
        type.selectedOptions[0]?.textContent.trim() || 'To be discussed';

      const brandName = brand.value.trim().slice(0, 100) || 'To be discussed';

      const projectGoal = goal.value.trim().slice(0, 1000) || 'To be discussed';

      return [
        "Hi Lance, I'd like to discuss a Claymorphism website.",
        '',
        `Brand / project: ${brandName}`,
        `Website type: ${projectType}`,
        '',
        'What visitors should be able to do:',
        projectGoal,
        '',
        'Preferred clay treatment:',
        `- Surface color: ${PALETTE_NAMES[material.palette]}`,
        `- Depth: ${material.depth} / 5`,
        `- Corner softness: ${material.roundness} px`,
        '',
        "I'd like to discuss the scope, timeline, and budget.",
      ].join('\n');
    }

    function refreshBrief() {
      if (result.hidden) return;

      output.value = buildBrief();
      setStatus('');
    }

    create.addEventListener('click', () => {
      output.value = buildBrief();
      result.hidden = false;

      setStatus('Your brief is ready to copy. No message has been sent.');

      output.focus();
    });

    group.addEventListener('input', (event) => {
      if ([brand, type, goal].includes(event.target)) {
        refreshBrief();
      }
    });

    type.addEventListener('change', refreshBrief);

    document
      .querySelector('[data-explorer]')
      ?.addEventListener('materialchange', refreshBrief);

    for (const link of document.querySelectorAll('[data-project-interest]')) {
      link.addEventListener('click', (event) => {
        if (
          event.button !== 0 ||
          event.ctrlKey ||
          event.metaKey ||
          event.shiftKey ||
          event.altKey
        ) {
          return;
        }

        const interest = link.dataset.projectInterest;

        const isValid = [...type.options].some(
          (option) => option.value === interest,
        );

        if (isValid) {
          type.value = interest;
          refreshBrief();
        }
      });
    }

    function offerManualCopy() {
      output.focus();
      output.select();
      output.setSelectionRange(0, output.value.length);

      setStatus(
        'Automatic copying is unavailable. The brief is selected: ' +
          'press Ctrl+C or Command+C, or touch and hold the text ' +
          'and choose Copy.',
        'error',
      );
    }

    copy.addEventListener('click', async () => {
      if (!output.value || copy.disabled) return;

      if (!window.isSecureContext || !navigator.clipboard?.writeText) {
        offerManualCopy();
        return;
      }

      const textToCopy = output.value;

      copy.disabled = true;
      copy.setAttribute('aria-busy', 'true');
      setStatus('Copying your brief…');

      try {
        await navigator.clipboard.writeText(textToCopy);

        setStatus(
          output.value === textToCopy
            ? "Brief copied. Share it with Lance when you're ready."
            : 'The earlier version was copied. Copy again to include your latest changes.',
        );
      } catch {
        offerManualCopy();
      } finally {
        copy.disabled = false;
        copy.removeAttribute('aria-busy');
      }
    });

    create.disabled = false;

    const help = group.querySelector('[data-brief-help]');

    if (help) {
      help.textContent =
        'Your current material settings will be included. ' +
        'Nothing is sent or saved by this page.';
    }
  }

  function init() {
    initNavigation();
    initSectionHighlighting();

    const getMaterial = initMaterialExplorer();
    initProjectBrief(getMaterial);

    for (const element of document.querySelectorAll('[data-year]')) {
      element.textContent = String(new Date().getFullYear());
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, {
      once: true,
    });
  } else {
    init();
  }
})();
