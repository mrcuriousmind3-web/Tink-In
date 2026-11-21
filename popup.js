// Tink-In: Toolbar Popup Logic

(function () {
  'use strict';

  let profiles = [];
  let activeProfileId = null;

  const selectProfile = document.getElementById('select-profile');
  const inputClassCode = document.getElementById('popup-class-code');
  const inputStudentId = document.getElementById('popup-student-id');
  const toggleAutoLogin = document.getElementById('popup-toggle-autologin');
  const btnLaunch = document.getElementById('btn-popup-launch');
  const btnSave = document.getElementById('btn-popup-save');
  const btnDashboard = document.getElementById('btn-popup-dashboard');
  const btnOpenPortal = document.getElementById('btn-open-portal');
  const statusPill = document.getElementById('popup-status');
  const statusText = document.getElementById('popup-status-text');

  function updateStatus(msg, isError = false) {
    statusText.textContent = msg;
    if (isError) {
      statusPill.classList.add('error');
    } else {
      statusPill.classList.remove('error');
    }
  }

  function cleanCode(str) {
    return (str || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  }

  async function loadData() {
    const data = await chrome.storage.local.get([
      'profiles',
      'activeProfileId',
      'autoLoginOnOpen'
    ]);

    profiles = data.profiles || [];
    activeProfileId = data.activeProfileId || null;
    toggleAutoLogin.checked = data.autoLoginOnOpen === true;

    if (profiles.length === 0) {
      const def = {
        id: 'prof-' + Date.now(),
        name: 'My Class',
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

    renderProfiles();
  }

  function renderProfiles() {
    selectProfile.innerHTML = '';
    profiles.forEach((p) => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name || 'Unnamed Class';
      if (p.id === activeProfileId) opt.selected = true;
      selectProfile.appendChild(opt);
    });

    const active = profiles.find((p) => p.id === activeProfileId) || profiles[0];
    if (active) {
      inputClassCode.value = active.classCode || '';
      inputStudentId.value = active.studentId || '';
    }
  }

  async function saveActive() {
    const active = profiles.find((p) => p.id === activeProfileId);
    if (!active) return;

    active.classCode = cleanCode(inputClassCode.value);
    active.studentId = inputStudentId.value.trim();

    await chrome.storage.local.set({
      profiles,
      activeProfileId,
      autoLoginOnOpen: toggleAutoLogin.checked
    });

    updateStatus('Saved successfully!');
    setTimeout(() => updateStatus('Ready to launch'), 2000);
  }

  async function launchLogin() {
    const code = cleanCode(inputClassCode.value);
    const id = inputStudentId.value.trim();

    if (!code || !id) {
      updateStatus('Code & ID are required!', true);
      return;
    }

    await saveActive();
    updateStatus('Launching Tinkercad...');

    chrome.runtime.sendMessage(
      {
        action: 'START_AUTO_LOGIN',
        classCode: code,
        studentId: id
      },
      (res) => {
        if (res && res.success) {
          updateStatus('Tinkercad opened! Auto-logging in...');
          setTimeout(() => window.close(), 1200);
        } else {
          updateStatus(res?.error || 'Failed to start', true);
        }
      }
    );
  }

  // Events
  selectProfile.addEventListener('change', () => {
    activeProfileId = selectProfile.value;
    chrome.storage.local.set({ activeProfileId });
    const active = profiles.find((p) => p.id === activeProfileId);
    if (active) {
      inputClassCode.value = active.classCode || '';
      inputStudentId.value = active.studentId || '';
    }
  });

  btnSave.addEventListener('click', saveActive);
  btnLaunch.addEventListener('click', launchLogin);

  btnDashboard.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://www.tinkercad.com/dashboard/' });
    window.close();
  });

  btnOpenPortal.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'OPEN_PORTAL' });
    window.close();
  });

  toggleAutoLogin.addEventListener('change', () => {
    chrome.storage.local.set({ autoLoginOnOpen: toggleAutoLogin.checked });
  });

  loadData();
})();

