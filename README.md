# Khyaal Engineering Updates

Engineering updates and platform progress reports for Khyaal.

## 🔐 Authentication

This page is protected. The authentication logic has been moved to an AWS Lambda function for improved security.

### 🚀 1-Click Deployment

To set up or update the authentication gateway, follow these steps:

1.  **Ensure AWS CLI is configured** on your machine.
2.  **Run the deployment script**:
    ```bash
    sh deploy_auth.sh
    ```
3.  **Update the Frontend**:
    - The script will output a **Lambda Function URL**.
    - Copy this URL and update the `LAMBDA_URL` constant in `index.html`.

### 🛠️ Architecture

- **Frontend**: `index.html` (Uses `fetch` to call the Lambda endpoint).
- **Backend**: AWS Lambda (`auth_gatekeeper.js`) with a public Function URL.
- **Security**: SHA-256 hashing is used for password verification on the server-side.

---
© 2026 Khyaal Inc.