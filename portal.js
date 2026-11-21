// Tink-In Custom Web Portal Logic

(function () {
  'use strict';

  // State
  let profiles = [];
  let activeProfileId = null;
  let autoLoginOnOpen = false;
  let autoLoginOnTinkercad = true;
  let turboMode = true;
  let countdownTimer = null;
  let countdownSeconds = 1;
  const isExtensionContext = typeof chrome !== 'undefined' && !!chrome.storage && !!chrome.runtime;

  // DOM Elements
  const inputProfileName = document.getElementById('input-profile-name');
  const inputClassCode = document.getElementById('input-class-code');
  const inputStudentId = document.getElementById('input-student-id');
  const toggleAutoLoginOnOpen = document.getElementById('toggle-autologin-on-open');
  const toggleTurboMode = document.getElementById('toggle-turbo-mode');
  const toggleAutoLoginOnTinkercad = document.getElementById('toggle-autologin-on-tinkercad');
  const btnLaunchLogin = document.getElementById('btn-launch-login');
  const btnSaveCredentials = document.getElementById('btn-save-credentials');
  const btnPasteCode = document.getElementById('btn-paste-code');
  const btnNewProfile = document.getElementById('btn-new-profile');
  const profilesList = document.getElementById('profiles-list');
  const logOutput = document.getElementById('log-output');
  const btnClearLog = document.getElementById('btn-clear-log');
  const autologinBanner = document.getElementById('autologin-banner');
  const countdownNumber = document.getElementById('countdown-number');
  const btnCancelCountdown = document.getElementById('btn-cancel-countdown');
  const btnNowCountdown = document.getElementById('btn-now-countdown');
  const connectionStatus = document.getElementById('connection-status');
  const connectionText = document.getElementById('connection-text');
  const btnThemeToggle = document.getElementById('btn-theme-toggle');
  const activeProfilePill = document.getElementById('active-profile-pill');

  // Activity Logger
  function log(message, type = 'normal') {
    const timeStr = new Date().toTimeString().split(' ')[0];
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.innerHTML = `<span class="log-time">${timeStr}</span><span class="log-msg">${escapeHtml(message)}</span>`;
    logOutput.appendChild(entry);
    logOutput.scrollTop = logOutput.scrollHeight;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Format Class Code (e.g. ABC 123 XYZ)
  function formatClassCode(val) {
    const clean = (val || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (clean.length <= 3) return clean;
    if (clean.length <= 6) return `${clean.slice(0, 3)} ${clean.slice(3)}`;
    if (clean.length <= 9) return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6)}`;
    return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6, 9)} ${clean.slice(9, 12)}`;
  }

  function cleanClassCode(val) {
    return (val || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  }

  // Storage Handlers (chrome.storage or localStorage)
  async function loadState() {
    if (isExtensionContext) {
      try {
        const data = await chrome.storage.local.get([
          'profiles',
          'activeProfileId',
          'autoLoginOnOpen',
          'autoLoginOnTinkercad',
          'turboMode'
        ]);

        profiles = data.profiles || [];
        activeProfileId = data.activeProfileId || null;
        autoLoginOnOpen = data.autoLoginOnOpen === true;
        autoLoginOnTinkercad = data.autoLoginOnTinkercad !== false;
        turboMode = data.turboMode !== false;
      } catch (err) {
        console.warn('Storage get failed, using defaults', err);
      }
    } else {
      // LocalStorage fallback for standalone web server
      try {
        profiles = JSON.parse(localStorage.getItem('tinkin_profiles') || '[]');
        activeProfileId = localStorage.getItem('tinkin_active_profile_id') || null;
        autoLoginOnOpen = localStorage.getItem('tinkin_autologin_open') === 'true';
        autoLoginOnTinkercad = localStorage.getItem('tinkin_autologin_tinkercad') !== 'false';
        turboMode = localStorage.getItem('tinkin_turbo_mode') !== 'false';
      } catch (e) {}
    }

    // Initialize default profile if empty
    if (profiles.length === 0) {
      const def = {
        id: 'profile-' + Date.now(),
        name: 'My Tinkercad Class',
        classCode: '',
        studentId: '',
        isDefault: true
      };
      profiles.push(def);
      activeProfileId = def.id;
    }

    if (!activeProfileId || !profiles.some((p) => p.id === activeProfileId)) {
      activeProfileId = profiles[0].id;
    }

    renderUI();
    checkAutoLoginTrigger();
  }

  async function saveState() {
    if (isExtensionContext) {
      await chrome.storage.local.set({
        profiles,
        activeProfileId,
        autoLoginOnOpen,
        autoLoginOnTinkercad,
        turboMode
      });
    } else {
      localStorage.setItem('tinkin_profiles', JSON.stringify(profiles));
      localStorage.setItem('tinkin_active_profile_id', activeProfileId);
      localStorage.setItem('tinkin_autologin_open', String(autoLoginOnOpen));
      localStorage.setItem('tinkin_autologin_tinkercad', String(autoLoginOnTinkercad));
      localStorage.setItem('tinkin_turbo_mode', String(turboMode));
    }
  }

  // Render UI
  function renderUI() {
    const active = profiles.find((p) => p.id === activeProfileId) || profiles[0];

    if (active) {
      inputProfileName.value = active.name || '';
      inputClassCode.value = formatClassCode(active.classCode || '');
      inputStudentId.value = active.studentId || '';
      activeProfilePill.textContent = active.name || 'Active Profile';
    }

    toggleAutoLoginOnOpen.checked = autoLoginOnOpen;
    toggleAutoLoginOnTinkercad.checked = autoLoginOnTinkercad;
    if (toggleTurboMode) toggleTurboMode.checked = turboMode;

    // Render Profiles List
    profilesList.innerHTML = '';
    profiles.forEach((p) => {
      const item = document.createElement('div');
      item.className = `profile-item ${p.id === activeProfileId ? 'active' : ''}`;
      item.innerHTML = `
        <div class="profile-meta">
          <div class="profile-title">
            <span>${escapeHtml(p.name || 'Unnamed Class')}</span>
            ${p.id === activeProfileId ? '<span class="badge">Active</span>' : ''}
          </div>
          <div class="profile-details">
            Code: <strong>${escapeHtml(formatClassCode(p.classCode) || 'None')}</strong> &bull; ID: <strong>${escapeHtml(p.studentId || 'None')}</strong>
          </div>
        </div>
        <div class="profile-actions">
          <button class="btn btn-primary btn-xs btn-launch-single" title="Launch this account" data-id="${p.id}">➔ Launch</button>
          ${profiles.length > 1 ? `<button class="btn-action-icon delete btn-delete-single" title="Delete Profile" data-id="${p.id}">&times;</button>` : ''}
        </div>
      `;

      item.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        selectProfile(p.id);
      });

      profilesList.appendChild(item);
    });

    // Attach single launch & delete listeners
    profilesList.querySelectorAll('.btn-launch-single').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const pid = btn.getAttribute('data-id');
        const targetProf = profiles.find((x) => x.id === pid);
        if (targetProf) {
          selectProfile(pid);
          triggerLogin(targetProf.classCode, targetProf.studentId);
        }
      });
    });

    profilesList.querySelectorAll('.btn-delete-single').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const pid = btn.getAttribute('data-id');
        deleteProfile(pid);
      });
    });
  }

  function selectProfile(pid) {
    activeProfileId = pid;
    saveState();
    renderUI();
    log(`Switched active profile to: ${inputProfileName.value || 'Class'}`, 'info');
  }

  function deleteProfile(pid) {
    if (profiles.length <= 1) return;
    profiles = profiles.filter((p) => p.id !== pid);
    if (activeProfileId === pid) {
      activeProfileId = profiles[0].id;
    }
    saveState();
    renderUI();
    log('Profile deleted.', 'info');
  }

  // Save current form inputs into active profile
  async function saveCurrentForm() {
    const active = profiles.find((p) => p.id === activeProfileId);
    if (!active) return;

    active.name = inputProfileName.value.trim() || 'My Tinkercad Class';
    active.classCode = cleanClassCode(inputClassCode.value);
    active.studentId = inputStudentId.value.trim();
    autoLoginOnOpen = toggleAutoLoginOnOpen.checked;
    autoLoginOnTinkercad = toggleAutoLoginOnTinkercad.checked;
    if (toggleTurboMode) turboMode = toggleTurboMode.checked;

    await saveState();
    renderUI();
    log(`Credentials saved for "${active.name}"!`, 'success');
  }

  // Check if Auto-Login On Open should trigger
  function checkAutoLoginTrigger() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('no_auto') === '1') {
      log('Auto-login suppressed by URL parameter.', 'info');
      return;
    }

    const active = profiles.find((p) => p.id === activeProfileId);
    if (autoLoginOnOpen && active && active.classCode && active.studentId) {
      startAutoLoginCountdown(active);
    }
  }

  // Auto-Login Countdown
  function startAutoLoginCountdown(profile) {
    if (countdownTimer) clearInterval(countdownTimer);

    if (turboMode) {
      log('⚡ Turbo Mode: Launching Tinkercad immediately!', 'success');
      setTimeout(() => {
        triggerLogin(profile.classCode, profile.studentId);
      }, 200);
      return;
    }

    autologinBanner.classList.remove('hidden');
    countdownSeconds = 1;
    countdownNumber.textContent = countdownSeconds;

    log(`Auto-login on open triggered! Launching in ${countdownSeconds}s...`, 'info');

    countdownTimer = setInterval(() => {
      countdownSeconds--;
      countdownNumber.textContent = countdownSeconds;

      if (countdownSeconds <= 0) {
        clearInterval(countdownTimer);
        countdownTimer = null;
        autologinBanner.classList.add('hidden');
        triggerLogin(profile.classCode, profile.studentId);
      }
    }, 1000);
  }

  function cancelCountdown() {
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
      autologinBanner.classList.add('hidden');
      log('Auto-login cancelled by user.', 'info');
    }
  }

  // Trigger Login Flow
  async function triggerLogin(rawCode, rawId) {
    const code = cleanClassCode(rawCode || inputClassCode.value);
    const id = (rawId || inputStudentId.value).trim();

    if (!code) {
      alert('Please enter a valid Class Code.');
      inputClassCode.focus();
      return;
    }

    if (!id) {
      alert('Please enter your Student ID or Nickname.');
      inputStudentId.focus();
      return;
    }

    // Auto-save any form edits
    await saveCurrentForm();

    log(`Initiating auto-login: Class [${code}] & Student [${id}]...`, 'info');

    if (isExtensionContext) {
      // Extension runtime dispatch
      chrome.runtime.sendMessage(
        {
          action: 'START_AUTO_LOGIN',
          classCode: code,
          studentId: id
        },
        (response) => {
          if (chrome.runtime.lastError) {
            log(`Error: ${chrome.runtime.lastError.message}`, 'error');
            return;
          }
          if (response && response.success) {
            log(`Opened Tinkercad tab (${response.tabId}). Automation in progress...`, 'success');
          } else {
            log(`Failed: ${response?.error || 'Unknown error'}`, 'error');
          }
        }
      );
    } else {
      // Standalone web page fallback
      const targetUrl = `https://www.tinkercad.com/joinclass/${code}`;
      log(`Standalone mode: Opening ${targetUrl}...`, 'info');
      window.open(targetUrl, '_blank');
    }
  }

  // Listen for real-time status broadcasts from content script
  if (isExtensionContext) {
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.action === 'BROADCAST_STATUS') {
        const type = msg.error ? 'error' : msg.step === 3 ? 'success' : 'info';
        log(`[Tinkercad] ${msg.status}`, type);
      }
    });
  }

  // Event Listeners
  inputClassCode.addEventListener('input', (e) => {
    const formatted = formatClassCode(e.target.value);
    if (e.target.value !== formatted) {
      const pos = e.target.selectionStart;
      e.target.value = formatted;
      e.target.setSelectionRange(pos, pos);
    }
  });

  btnPasteCode.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        inputClassCode.value = formatClassCode(text);
        log('Pasted class code from clipboard.', 'info');
      }
    } catch (err) {
      log('Clipboard read permission denied.', 'error');
    }
  });

  btnSaveCredentials.addEventListener('click', () => {
    saveCurrentForm();
  });

  btnLaunchLogin.addEventListener('click', () => {
    cancelCountdown();
    triggerLogin();
  });

  btnCancelCountdown.addEventListener('click', () => {
    cancelCountdown();
  });

  btnNowCountdown.addEventListener('click', () => {
    cancelCountdown();
    triggerLogin();
  });

  btnNewProfile.addEventListener('click', () => {
    const newProf = {
      id: 'profile-' + Date.now(),
      name: `Class ${profiles.length + 1}`,
      classCode: '',
      studentId: '',
      isDefault: false
    };
    profiles.push(newProf);
    selectProfile(newProf.id);
    inputProfileName.focus();
  });

  btnClearLog.addEventListener('click', () => {
    logOutput.innerHTML = '';
    log('Log cleared.', 'info');
  });

  toggleAutoLoginOnOpen.addEventListener('change', () => {
    autoLoginOnOpen = toggleAutoLoginOnOpen.checked;
    saveState();
    log(`Auto-login on site open: ${autoLoginOnOpen ? 'ENABLED' : 'DISABLED'}`, 'info');
  });

  if (toggleTurboMode) {
    toggleTurboMode.addEventListener('change', () => {
      turboMode = toggleTurboMode.checked;
      saveState();
      log(`⚡ Turbo Mode: ${turboMode ? 'ENABLED (Instant)' : 'DISABLED (1s Countdown)'}`, 'info');
    });
  }

  toggleAutoLoginOnTinkercad.addEventListener('change', () => {
    autoLoginOnTinkercad = toggleAutoLoginOnTinkercad.checked;
    saveState();
    log(`Auto-fill on tinkercad.com: ${autoLoginOnTinkercad ? 'ENABLED' : 'DISABLED'}`, 'info');
  });

  // Dark/Light Theme Toggle
  btnThemeToggle.addEventListener('click', () => {
    const isLight = document.body.getAttribute('data-theme') === 'light';
    const nextTheme = isLight ? 'dark' : 'light';
    document.body.setAttribute('data-theme', nextTheme);
    btnThemeToggle.textContent = nextTheme === 'light' ? '☀️' : '🌙';
    localStorage.setItem('tinkin_theme', nextTheme);
  });

  // Apply saved theme
  const savedTheme = localStorage.getItem('tinkin_theme');
  if (savedTheme) {
    document.body.setAttribute('data-theme', savedTheme);
    btnThemeToggle.textContent = savedTheme === 'light' ? '☀️' : '🌙';
  }

  // Update connection indicator
  if (!isExtensionContext) {
    connectionStatus.className = 'status-indicator';
    connectionText.textContent = 'Standalone Web Mode';
  }

  // Startup
  loadState();
})();

