// Tink-In: High-Speed Tinkercad Automation Content Script (Ultra-Fast Engine)

(function () {
  'use strict';

  if (window.__TINK_IN_AUTOMATION_ACTIVE__) return;
  window.__TINK_IN_AUTOMATION_ACTIVE__ = true;

  console.log('[Tink-In ⚡] Ultra-fast automation engine active.');

  let credentials = null;
  let hudRoot = null;
  let statusTextEl = null;
  let stepDots = [];
  let isSubmittingStudentId = false;
  let isClickingNickname = false;
  let isEnteringClassCode = false;

  // Execute JavaScript directly in the page's MAIN WORLD to bypass framework boundaries
  function runInMainWorld(fnString) {
    try {
      const script = document.createElement('script');
      script.textContent = `(function(){ ${fnString} })();`;
      (document.head || document.documentElement).appendChild(script);
      script.remove();
    } catch (e) {
      console.warn('[Tink-In] Main world execution error:', e);
    }
  }

  // Inject input value in page context so Angular Zone.js & Reactive Forms register instantly
  function injectValueInPage(selector, value) {
    const code = `
      try {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (el) {
          el.focus();
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
          if (setter) {
            setter.call(el, ${JSON.stringify(value)});
          } else {
            el.value = ${JSON.stringify(value)};
          }
          el.dispatchEvent(new Event('focus', { bubbles: true }));
          el.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: ${JSON.stringify(value)} }));
          el.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
          el.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
        }
      } catch (err) {
        console.error('Tink-In injection failed:', err);
      }
    `;
    runInMainWorld(code);
  }

  // Trigger click in main world
  function clickInMainWorld(selector) {
    const code = `
      try {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (el) {
          el.scrollIntoView({ behavior: 'instant', block: 'center' });
          el.focus();
          ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(evt => {
            el.dispatchEvent(new MouseEvent(evt, { bubbles: true, cancelable: true, view: window, buttons: 1 }));
          });
          if (typeof el.click === 'function') el.click();
        }
      } catch (err) {}
    `;
    runInMainWorld(code);
  }

  // Create fast floating HUD overlay on Tinkercad
  function createHud(classCode, studentId) {
    if (document.getElementById('tinkin-hud-root')) return;

    hudRoot = document.createElement('div');
    hudRoot.id = 'tinkin-hud-root';
    hudRoot.innerHTML = `
      <div class="tinkin-hud-card" id="tinkin-hud-card">
        <div class="tinkin-hud-header">
          <div class="tinkin-hud-brand">
            <span>⚡ Tink-In</span>
            <span class="tinkin-hud-badge">Turbo</span>
          </div>
          <button class="tinkin-hud-close" id="tinkin-hud-close" title="Dismiss">&times;</button>
        </div>
        <div class="tinkin-hud-status-row">
          <div class="tinkin-spinner" id="tinkin-spinner"></div>
          <div class="tinkin-status-text" id="tinkin-status-text">⚡ Connecting...</div>
        </div>
        <div class="tinkin-steps">
          <div class="tinkin-step-dot active" title="Class Code"></div>
          <div class="tinkin-step-dot" title="Nickname Option"></div>
          <div class="tinkin-step-dot" title="Student ID"></div>
          <div class="tinkin-step-dot" title="Logged In"></div>
        </div>
        <div class="tinkin-meta">
          <span>Class: <strong>${escapeHtml(classCode || '')}</strong></span>
          <span>ID: <strong>${escapeHtml(studentId || '')}</strong></span>
        </div>
      </div>
    `;

    (document.body || document.documentElement).appendChild(hudRoot);
    statusTextEl = document.getElementById('tinkin-status-text');
    stepDots = Array.from(hudRoot.querySelectorAll('.tinkin-step-dot'));

    document.getElementById('tinkin-hud-close')?.addEventListener('click', () => {
      hudRoot?.remove();
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function updateStatus(stepIndex, message, type = 'info') {
    if (statusTextEl) statusTextEl.textContent = message;

    if (stepDots && stepDots.length > stepIndex && stepIndex >= 0) {
      stepDots.forEach((dot, idx) => {
        dot.classList.remove('active');
        if (idx < stepIndex) dot.classList.add('completed');
        if (idx === stepIndex) dot.classList.add('active');
      });
    }

    const card = document.getElementById('tinkin-hud-card');
    const spinner = document.getElementById('tinkin-spinner');

    if (card) {
      card.classList.remove('error', 'success');
      if (type === 'error') {
        card.classList.add('error');
        if (spinner) spinner.style.display = 'none';
      } else if (type === 'success') {
        card.classList.add('success');
        if (spinner) spinner.style.display = 'none';
        stepDots.forEach((d) => d.classList.add('completed'));
      } else {
        if (spinner) spinner.style.display = 'block';
      }
    }

    try {
      chrome.runtime.sendMessage({
        action: 'STATUS_UPDATE',
        status: message,
        step: stepIndex,
        error: type === 'error'
      });
    } catch (e) {}
  }

  // Fast Input Setter (in isolated world with execCommand + native prototype)
  function fastSetInput(el, value) {
    if (!el) return;
    el.focus();
    el.click();

    // Select existing text
    try {
      el.select();
      el.setSelectionRange(0, el.value.length);
    } catch (e) {}

    // 1. Try document.execCommand (creates trusted browser input event)
    try {
      document.execCommand('insertText', false, value);
    } catch (e) {}

    // 2. Direct property setter backup
    if (el.value !== value) {
      try {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        if (setter) setter.call(el, value);
        else el.value = value;
      } catch (e) {
        el.value = value;
      }
    }

    // 3. Dispatch full event sequence
    el.dispatchEvent(new Event('focus', { bubbles: true }));
    el.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: value }));
    el.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    el.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
    el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: value.slice(-1) }));
    el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: value.slice(-1) }));
  }

  // Ultra-Fast Click Dispatcher
  function fastClick(el) {
    if (!el) return;
    el.scrollIntoView({ behavior: 'instant', block: 'center' });
    el.focus();

    ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach((type) => {
      el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window, buttons: 1 }));
    });

    try {
      el.click();
    } catch (e) {}
  }

  // High-Frequency Reactive State-Machine Runner
  function startReactiveEngine(creds) {
    credentials = creds;
    const classCode = (credentials.classCode || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const studentId = (credentials.studentId || '').trim();

    createHud(classCode, studentId);

    let checkInterval = null;
    let elapsedMs = 0;
    const MAX_TIMEOUT_MS = 25000;
    const TICK_INTERVAL_MS = 30; // 30ms high-speed tick

    function tick() {
      elapsedMs += TICK_INTERVAL_MS;

      // SUCCESS: Are we on the dashboard?
      if (
        window.location.pathname.startsWith('/dashboard') ||
        document.querySelector('.user-avatar') ||
        document.querySelector('app-header')
      ) {
        clearInterval(checkInterval);
        updateStatus(3, `🎉 Successfully logged in as ${studentId}!`, 'success');
        chrome.runtime.sendMessage({ action: 'CLEAR_PENDING_LOGIN' });
        setTimeout(() => {
          if (hudRoot) {
            hudRoot.style.opacity = '0';
            hudRoot.style.transition = 'opacity 0.5s';
            setTimeout(() => hudRoot.remove(), 600);
          }
        }, 3000);
        return;
      }

      // Check for backend errors
      const errorEl = document.querySelector(
        '#userIdInClassError:not(:empty), .classroom-code-error:not(:empty)'
      );
      if (errorEl && errorEl.textContent.trim().length > 1) {
        const txt = errorEl.textContent.trim();
        // Ignore "Loading" or similar transients
        if (!txt.toLowerCase().includes('loading')) {
          clearInterval(checkInterval);
          updateStatus(2, `⚠️ Error: ${txt}`, 'error');
          return;
        }
      }

      // -------------------------------------------------------------
      // PRIORITY 1: Student ID / Nickname Input Step (The Target Step!)
      // -------------------------------------------------------------
      const studentInput =
        document.querySelector('#userIdInClass') ||
        document.querySelector('tk-enter-identifier input[type="text"]') ||
        document.querySelector('input.form-control-user-id') ||
        document.querySelector('input[formcontrolname="user-id"]');

      if (studentInput && !isSubmittingStudentId) {
        // If input does not have the value yet, type it immediately!
        if (studentInput.value !== studentId) {
          isSubmittingStudentId = true;
          updateStatus(2, `⚡ Typing Student ID: ${studentId}...`);

          // 1. Set in main world (for Angular Reactive Forms)
          injectValueInPage('#userIdInClass', studentId);
          injectValueInPage('tk-enter-identifier input', studentId);

          // 2. Set in isolated world with execCommand
          fastSetInput(studentInput, studentId);

          // Find Submit Button ("That's me!" / #step2BtnUserId)
          setTimeout(() => {
            const submitBtn =
              document.querySelector('#step2BtnUserId') ||
              document.querySelector('tk-enter-identifier button.button-success') ||
              document.querySelector('tk-enter-identifier button.btn-next-step') ||
              document.querySelector('tk-enter-identifier button[type="button"]');

            updateStatus(2, 'Submitting credentials...');

            // Dispatch Enter keyup directly
            studentInput.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', keyCode: 13, code: 'Enter', bubbles: true }));

            // Click submit button in both worlds
            if (submitBtn) {
              submitBtn.removeAttribute('disabled');
              fastClick(submitBtn);
              clickInMainWorld('#step2BtnUserId');
              clickInMainWorld('tk-enter-identifier button.button-success');
            }

            // Retry click after 80ms to ensure Angular form validity was processed
            setTimeout(() => {
              const retryBtn = document.querySelector('#step2BtnUserId:not([disabled])') || submitBtn;
              if (retryBtn) {
                fastClick(retryBtn);
                clickInMainWorld('#step2BtnUserId');
              }
              isSubmittingStudentId = false;
            }, 80);
          }, 40);

          return;
        }
      }

      // -------------------------------------------------------------
      // PRIORITY 2: "Join with Nickname" Option Button Step
      // -------------------------------------------------------------
      const nicknameBtn =
        document.querySelector('button.option-nickname') ||
        document.querySelector('.option-nickname') ||
        document.querySelector('tk-login-by-code-options button.button-success') ||
        document.querySelector('tk-login-by-code-options button:first-of-type');

      if (nicknameBtn && !isClickingNickname && !studentInput) {
        isClickingNickname = true;
        updateStatus(1, '⚡ Selecting "Join with Nickname"...');

        // Click in both worlds instantly
        fastClick(nicknameBtn);
        clickInMainWorld('button.option-nickname');
        clickInMainWorld('tk-login-by-code-options button.button-success');

        setTimeout(() => {
          isClickingNickname = false;
        }, 150);
        return;
      }

      // -------------------------------------------------------------
      // PRIORITY 3: Class Code Input Step (if code was not in URL)
      // -------------------------------------------------------------
      const classInput =
        document.querySelector('#classCodeInput') ||
        document.querySelector('tk-class-code-input input') ||
        document.querySelector('input[formcontrolname="classroom-id"]');

      if (classInput && !isEnteringClassCode && !nicknameBtn && !studentInput) {
        if (classInput.value.replace(/\s+/g, '') !== classCode) {
          isEnteringClassCode = true;
          updateStatus(0, `⚡ Entering Class Code: ${classCode}...`);

          injectValueInPage('#classCodeInput', classCode);
          fastSetInput(classInput, classCode);

          setTimeout(() => {
            const step1Btn =
              document.querySelector('#step1Btn') ||
              document.querySelector('tk-enter-class-code button.button-success') ||
              document.querySelector('.btn-code-check');

            if (step1Btn) {
              fastClick(step1Btn);
              clickInMainWorld('#step1Btn');
            } else {
              classInput.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', keyCode: 13, bubbles: true }));
            }
            isEnteringClassCode = false;
          }, 80);
          return;
        }
      }

      // Timeout check
      if (elapsedMs >= MAX_TIMEOUT_MS) {
        clearInterval(checkInterval);
        updateStatus(2, 'Timeout waiting for Tinkercad response.', 'error');
      }
    }

    // Run tick immediately, then set high-frequency interval
    tick();
    checkInterval = setInterval(tick, TICK_INTERVAL_MS);
  }

  // Initial check
  function init() {
    try {
      chrome.runtime.sendMessage({ action: 'GET_PENDING_LOGIN' }, (response) => {
        if (chrome.runtime.lastError) return;

        if (response && response.pendingLogin) {
          console.log('[Tink-In ⚡] Fast login initiated:', response.pendingLogin);
          startReactiveEngine(response.pendingLogin);
        } else if (window.location.pathname.startsWith('/joinclass')) {
          chrome.storage.local.get(
            ['autoLoginOnTinkercad', 'profiles', 'activeProfileId'],
            (data) => {
              if (data.autoLoginOnTinkercad && data.profiles?.length) {
                const active =
                  data.profiles.find((p) => p.id === data.activeProfileId) || data.profiles[0];
                if (active && active.classCode && active.studentId) {
                  startReactiveEngine(active);
                }
              }
            }
          );
        }
      });
    } catch (e) {
      console.warn('[Tink-In] Init error:', e);
    }
  }

  // Start immediately without waiting for full page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
