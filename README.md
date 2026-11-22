# ⚡ Tink-In: Tinkercad Auto-Login Chrome Extension & Custom Web Portal

**Tink-In** is a Chrome Extension (Manifest V3) and companion Web Portal designed to automatically log you into your Tinkercad classroom using your **Join Class Code** and **Student ID / Nickname**.

---

## 🌟 Key Features

1. **Fully Automated Tinkercad Login**:
   - Automatically navigates to the Tinkercad Join Class flow.
   - Enters and formats the **Join Class Code** (supports 9–12 characters, with or without spaces/hyphens).
   - Automatically selects the **"Join with Nickname"** student option.
   - Automatically fills in your **Student ID / Nickname** and submits the form.
   - Displays a sleek on-screen status badge on Tinkercad showing real-time progress.

2. **Dedicated Custom Website Portal (`portal.html`)**:
   - A modern web dashboard where you enter and manage your Class Code and Student ID.
   - **Auto-Login on Open**: When enabled, simply opening the website will trigger Tinkercad auto-login!
   - **Multi-Class Profiles**: Save multiple classes or student accounts (e.g., *Period 1 3D Design*, *Robotics Club*).
   - **One-Click Launch**: Instant launch button with real-time status logging.
   - **Clipboard Paste**: One-click paste button for easy class code entry.

3. **Toolbar Popup (`popup.html`)**:
   - Quick access from the Chrome extension bar.
   - Quickly switch active class profiles, check credentials, or launch Tinkercad.
   - Direct button to open the full Custom Web Portal.

4. **Dual Running Modes**:
   - **Extension Mode**: Accessible directly inside Chrome at `chrome-extension://<id>/portal.html` or via extension options.
   - **Standalone Web Server**: Run `start-server.bat` (or `node server.js`) to access the portal as a local website at `http://localhost:3000`.

---

## 🚀 How to Install in Google Chrome

1. Open **Google Chrome**.
2. Navigate to `chrome://extensions/` in your address bar.
3. Turn on **"Developer mode"** using the toggle switch in the top right corner.
4. Click the **"Load unpacked"** button in the top left.
5. Select the project folder:
6. The **Tink-In** extension will appear in your extensions list! Pin it to your Chrome toolbar for quick access.



https://github.com/user-attachments/assets/5b311c55-9914-4797-91ee-e4fb3f86c3bf





---

## 🌐 How to Use the Custom Website Portal

### Method 1: Open the Portal via Extension (Recommended)
1. Click the **Tink-In** icon in your Chrome toolbar.
2. Click the **"🌐 Portal"** button in the top right of the popup (or right-click the extension icon and select **"Options"**).
3. The custom portal opens in a full browser tab.
4. **Bookmark this tab** in your browser's bookmarks bar!

### Method 2: Run as a Local Website (`http://localhost:3000`)
1. Double-click `start-server.bat` (or run `node server.js` in a terminal).
2. Open your browser and go to:
   ```
   http://localhost:3000
   ```

---

## ⚙️ Setting Up Auto-Login

1. On the custom website, fill in:
   - **Profile / Class Name**: (e.g. `Science Period 3`)
   - **Join Class Code**: The 9 to 12-character code from your teacher (e.g. `982 K76 341`).
   - **Student ID / Nickname**: Your student seat nickname.
2. Toggle **"Auto-Login on Site Open"** to **ON**.
3. Click **"💾 Save Profile"** (or click **"🚀 Launch & Auto-Login"** immediately).

> **🎉 That's it!** Now, whenever you open this website (or click your bookmark), it displays a 2-second countdown and automatically opens Tinkercad and logs you in!

---

## 📁 Project Structure

```
Tink-In/
├── manifest.json         # Chrome Extension Manifest V3 configuration
├── background.js         # Service worker handling tabs, storage, and automation messaging
├── content.js            # Tinkercad DOM automation and form filling script
├── content.css           # Floating status HUD overlay injected into Tinkercad
├── portal.html           # The custom website portal UI
├── portal.js             # Portal interactivity, countdown, profile management & logging
├── portal.css            # Responsive dark/light theme styling for the portal
├── popup.html            # Toolbar popup interface
├── popup.js             # Toolbar popup logic
├── popup.css            # Toolbar popup stylesheet
├── server.js             # Lightweight Node.js static server for http://localhost:3000
├── start-server.bat      # Windows batch file to launch the local web server
├── generate_icons.py     # Icon generator script
├── icons/                # Extension icons (16px, 32px, 48px, 128px)
└── README.md             # Documentation and usage guide
```

---

## 🛡️ Privacy & Security

All class codes and student nicknames are stored locally in your browser (`chrome.storage.local` / `localStorage`). No data is sent to external servers or third parties; credentials are exclusively submitted to `tinkercad.com` to authenticate your session.

