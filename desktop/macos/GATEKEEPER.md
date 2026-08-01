# Avoiding the Mac “Apple could not verify” warning

macOS Gatekeeper shows that dialog for **any app downloaded from the internet that is not signed and notarized by Apple**. PerspectiveLab is safe research software; Apple just has not checked it yet.

## What clients can do today (no Apple account)

After dragging **PerspectiveLab** into **Applications**, pick **one**:

### A. One-click fix (easiest)

In the installer / ZIP folder, **right-click** **`Fix Mac Open.command`** → **Open** → **Open**  
(allow Terminal if asked). It clears the quarantine flag and opens the app.

If double-clicking PerspectiveLab only shows **Done** / **Move to Bin**:
click **Done** (never Move to Bin), then run Fix Mac Open, or use option C below.

### B. Right-click Open (Apple’s official bypass)

1. Open **Applications**
2. **Right-click** (or Control-click) **PerspectiveLab**
3. Choose **Open**
4. Click **Open** again in the dialog  

Only needed **once** per Mac.

### C. System Settings (macOS Ventura / Sonoma / Sequoia)

1. Try to open the app once (click **Done** if you only see Done / Move to Bin)
2. **System Settings → Privacy & Security**
3. Scroll down → **Open Anyway** next to PerspectiveLab
4. Confirm **Open**

### D. Terminal (always works)

```bash
xattr -cr /Applications/PerspectiveLab.app && open /Applications/PerspectiveLab.app
```

---

## Permanent fix (no warning for anyone)

Requires an **Apple Developer Program** membership (~USD 99 / year):

1. Enroll: https://developer.apple.com/programs/
2. Install a **Developer ID Application** certificate (Xcode → Settings → Accounts)
3. Store notarization credentials (see `notarize.sh` header)
4. Build DMG: `make desktop-dmg`
5. Sign + notarize:

```bash
export DEVELOPER_ID="Developer ID Application: Your Name (TEAMID)"
# Mount DMG, note app path, or rebuild then:
./desktop/macos/notarize.sh /path/to/PerspectiveLab.app ~/Desktop/PerspectiveLab-Installer.dmg
```

After notarization, Gatekeeper shows PerspectiveLab as verified. There is **no free workaround** that removes the warning for all users forever — only Apple notarization does that.
