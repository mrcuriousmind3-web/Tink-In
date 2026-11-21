// Tink-In: Background Service Worker (Manifest V3)

// In-memory tab tracking for active auto-logins
const activeTabLogins = new Map();

// Default initial state
chrome.runtime.onInstalled.addListener(async (details) => {
  const data = await chrome.storage.local.get([
    'profiles',
    'activeProfileId',
    'autoLoginOnOpen',
    'autoLoginOnTinkercad'
  ]);

  if (!data.profiles || data.profiles.length === 0) {
    const defaultProfile = {
      id: 'default-' + Date.now(),
      name: 'My Tinkercad Profile',
      classCode: '',
      studentId: '',
      isDefault: true,
      updatedAt: Date.now()
    };
    await chrome.storage.local.set({
      profiles: [defaultProfile],
      activeProfileId: defaultProfile.id,
      autoLoginOnOpen: true,
      autoLoginOnTinkercad: true
    });
  }
});

// Helper: normalize class code
function normalizeClassCode(code) {
  if (!code) return '';
  return code.toString().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

// Start auto login flow
async function handleStartAutoLogin(payload, senderTabId = null) {
  const classCode = normalizeClassCode(payload.classCode);
  const studentId = (payload.studentId || '').trim();

  if (!classCode || !studentId) {
    throw new Error('Class Code and Student ID are both required.');
  }

  // Tinkercad join URL
  const targetUrl = `https://www.tinkercad.com/joinclass/${classCode}`;

  // Decide whether to use existing tab or open a new one
  let targetTab;
  if (payload.useCurrentTab && senderTabId) {
    targetTab = await chrome.tabs.update(senderTabId, { url: targetUrl });
  } else {
    targetTab = await chrome.tabs.create({ url: targetUrl, active: true });
  }

  const loginData = {
    classCode,
    studentId,
    timestamp: Date.now(),
    tabId: targetTab.id
  };

  activeTabLogins.set(targetTab.id, loginData);

  // Also persist in session storage
  try {
    if (chrome.storage.session) {
      await chrome.storage.session.set({
        [`tab_${targetTab.id}`]: loginData
      });
    }
  } catch (err) {
    console.warn('Session storage not available:', err);
  }

  return { success: true, tabId: targetTab.id, url: targetUrl };
}

// Message Dispatcher
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const senderTabId = sender.tab ? sender.tab.id : null;

  if (message.action === 'START_AUTO_LOGIN') {
    handleStartAutoLogin(message, senderTabId)
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // Keep channel open for async response
  }

  if (message.action === 'GET_PENDING_LOGIN') {
    (async () => {
      let pending = senderTabId ? activeTabLogins.get(senderTabId) : null;

      // Check session storage if not in memory
      if (!pending && senderTabId && chrome.storage.session) {
        try {
          const stored = await chrome.storage.session.get([`tab_${senderTabId}`]);
          if (stored[`tab_${senderTabId}`]) {
            pending = stored[`tab_${senderTabId}`];
          }
        } catch (e) {}
      }

      // If no specific tab login, check if autoLoginOnTinkercad is enabled
      if (!pending) {
        const settings = await chrome.storage.local.get([
          'autoLoginOnTinkercad',
          'profiles',
          'activeProfileId'
        ]);

        if (settings.autoLoginOnTinkercad && settings.profiles?.length) {
          const active =
            settings.profiles.find((p) => p.id === settings.activeProfileId) ||
            settings.profiles[0];
          if (active && active.classCode && active.studentId) {
            pending = {
              classCode: normalizeClassCode(active.classCode),
              studentId: active.studentId.trim(),
              isBackgroundDefault: true
            };
          }
        }
      }

      sendResponse({ pendingLogin: pending || null });
    })();
    return true;
  }

  if (message.action === 'CLEAR_PENDING_LOGIN') {
    if (senderTabId) {
      activeTabLogins.delete(senderTabId);
      if (chrome.storage.session) {
        chrome.storage.session.remove([`tab_${senderTabId}`]).catch(() => {});
      }
    }
    sendResponse({ success: true });
    return true;
  }

  if (message.action === 'OPEN_PORTAL') {
    const portalUrl = chrome.runtime.getURL('portal.html');
    chrome.tabs.create({ url: portalUrl, active: true });
    sendResponse({ success: true });
    return true;
  }

  if (message.action === 'STATUS_UPDATE') {
    // Broadcast status update to other runtime listeners (e.g. portal / popup)
    chrome.runtime.sendMessage({
      action: 'BROADCAST_STATUS',
      status: message.status,
      step: message.step,
      error: message.error,
      tabId: senderTabId
    }).catch(() => {});
    sendResponse({ received: true });
    return true;
  }
});

// Listen to external messages (from localhost web server if running standalone)
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (message.action === 'PING') {
    sendResponse({ status: 'OK', version: '1.0.0' });
    return true;
  }

  if (message.action === 'START_AUTO_LOGIN') {
    handleStartAutoLogin(message)
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

// Clean up closed tabs
chrome.tabs.onRemoved.addListener((tabId) => {
  activeTabLogins.delete(tabId);
  if (chrome.storage.session) {
    chrome.storage.session.remove([`tab_${tabId}`]).catch(() => {});
  }
});

