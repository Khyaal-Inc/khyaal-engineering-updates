# Khyaal Engineering Updates

Engineering updates and platform progress reports for Khyaal.

## 🔐 Zero-Deploy Authentication

This project uses a "Zero-Deploy" architecture. The frontend is protected by an AWS Lambda gateway that fetches data directly from GitHub in real-time. This means you **never need to redeploy the Lambda** when you update engineering items or create archives.

### 🚀 1. Initial Setup (One-time only)

1.  **Deploy the Gateway**: 
    If you haven't yet, run the 1-click deployment script:
    ```bash
    sh deploy_auth.sh
    ```
2.  **Add your GitHub Token**:
    To allow the Lambda to fetch private data for everyone (e.g., non-developers), add a [GitHub Personal Access Token](https://github.com/settings/tokens) to the Lambda environment variables:
    ```bash
    aws lambda update-function-configuration \
      --function-name khyaal-auth-gatekeeper \
      --environment "Variables={GITHUB_TOKEN=your_token_here}" \
      --region ap-south-1
    ```
3.  **Update index.html**:
    Ensure the `LAMBDA_URL` in `index.html` matches the output from the deployment script.

### ✍️ 2. Updating Content

To update the engineering items:
1.  Open `index.html` in your browser.
2.  Login with the password.
3.  Make your changes and click **Save to GitHub**.
4.  The changes are **live immediately**! No deployment needed.

### 📂 3. Archiving & Snapshots

- **Archive & Clear**: Creates a JSON snapshot in the `archive/` folder.
- **Historical Snapshots**: These can be viewed dynamically from the main dashboard. The "template" remains the same, but the data is loaded from the archive JSON files.

## 🛠️ Architecture & Performance

### 🔏 Why "Loading Updates..."?
Every time you refresh, the app must securely request the latest data from the Lambda proxy (to avoid exposing your GitHub token or data locally). This process happens in **one single trip (One Hop)**:

1.  **Verification**: Your cached password hash is sent to the Lambda.
2.  **Fetching**: If verified, the Lambda fetches the latest `data.json` from GitHub.
3.  **Secure Delivery**: The data is returned to your browser.

Most of the loading time is spent on the **GitHub data fetch**. This ensures you are always looking at the absolute latest updates synced to GitHub by any team member.

### 🍪 Session Persistence
- **Duration**: Your login hash is stored in `localStorage` **indefinitely**. It survives browser restarts.
- **Auto-Login**: The app is optimized to detect this hash and start the data fetch **immediately** when the page starts to parse, providing a flicker-free "always-on" experience.
- **Lock Site**: Click the "Lock Site" button at any time to clear your local session and re-enable the password prompt.

---
© 2026 Khyaal Inc.