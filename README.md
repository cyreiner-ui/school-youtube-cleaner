# School YouTube Cleaner

School YouTube Cleaner is a Manifest V3 Chrome extension for classroom use. It preserves normal YouTube playback, the homepage, Shorts, comments, and search while doing only the following:

- hides the right-side related/recommended column on watch pages;
- hides end-screen video suggestions and cards;
- hides shopping, merchandise, and promotional modules;
- hides Explore and Trending navigation links; and
- attempts to turn autoplay off.

It has no settings page, pause button, analytics, tracking, or external service.

## Deployment identity and URLs

- **Permanent Extension ID:** `bcafenkmcgllihlglbhigooelgfdgaij`
- **GitHub repository:** https://github.com/cyreiner-ui/school-youtube-cleaner
- **GitHub Pages:** https://cyreiner-ui.github.io/school-youtube-cleaner/
- **CRX:** https://cyreiner-ui.github.io/school-youtube-cleaner/school-youtube-cleaner.crx
- **Update manifest:** https://cyreiner-ui.github.io/school-youtube-cleaner/update.xml

The permanent ID is derived from the signing key. Never generate a replacement key after deployment.

## Signing-key storage

The local key is stored at `.secrets/school-youtube-cleaner.pem`, which is excluded by `.gitignore`. An encrypted backup is stored in the repository Actions secret `CRX_SIGNING_KEY_PEM`. The private key must never be committed, attached to a release, copied into Pages, or printed in logs. Keep an additional offline backup in an access-controlled password manager or encrypted institutional storage.

GitHub Actions secrets cannot be downloaded after creation. The workflow can use the backup to rebuild, but it cannot reveal it. Preserve the local/offline copy for disaster recovery.

## Build a new version

Requirements: Node.js 18+ and Google Chrome.

1. Modify only the extension source (`manifest.json`, `cleaner.js`, `cleaner.css`, or `icons/`).
2. Increment `version` in `manifest.json`.
3. Run `npm run build`.
4. Run `npm test`.
5. Commit and push the changed source and `docs/` files.

The build refuses to continue if the permanent key is missing; it never silently creates a replacement. The one-time `npm run build:first` command is only for the initial unpublished build.

As a backup build path, run the repository's **Rebuild signed CRX** workflow manually. It uses the same key from the encrypted repository secret, validates the package, and commits updated `docs/` files.

## Google Admin configuration

The target browser must first satisfy the platform-management requirement described below.

1. Open **Google Admin Console → Devices → Chrome → Apps & extensions → Users & browsers**.
2. Select the **Teachers OU**.
3. Click **Add → Add Chrome app or extension by ID**.
4. Enter the permanent Extension ID shown above, choose **From a custom URL**, and enter `https://cyreiner-ui.github.io/school-youtube-cleaner/update.xml`.
5. Set **Installation policy** to **Force install**, then save.

To verify:

- Visit `chrome://policy`, click **Reload policies**, and confirm `ExtensionInstallForcelist` or the corresponding `ExtensionSettings` entry contains the extension ID and custom update URL.
- Visit `chrome://extensions`, enable **Developer mode** if needed to display IDs, and confirm School YouTube Cleaner is installed with the permanent ID and marked as managed by the organization.

## Critical unmanaged-device limitation

A managed school account signed into Chrome does **not**, by itself, permit an off-store self-hosted extension to be force-installed on an unmanaged personal Windows or Mac computer.

Google's current `ExtensionInstallForcelist` documentation says:

- **Windows:** an off-store extension can be automatically installed only when the machine is joined to Microsoft Active Directory, joined to Microsoft Entra ID (Azure AD), or the browser is enrolled in Chrome Enterprise Core.
- **macOS:** an off-store extension can be automatically installed only when the machine is managed through MDM, joined to a domain through MCX, or the browser is enrolled in Chrome Enterprise Core.

For personal Windows and Mac computers, the simplest free supported route is to enroll each Chrome browser in **Chrome Enterprise Core** using an enrollment token, then target the enrolled browsers/users with the custom update URL policy. If the school cannot enroll those personal browsers, this self-hosted CRX cannot be reliably force-installed; Chrome Web Store publication would be the practical alternative, but this project does not publish there.

Official references:

- [ExtensionInstallForcelist policy](https://chromeenterprise.google/policies/#ExtensionInstallForcelist)
- [Set app and extension policies](https://support.google.com/chrome/a/answer/9039146)
- [Self-host an extension and update it](https://developer.chrome.com/docs/extensions/how-to/distribute/host-on-linux)
