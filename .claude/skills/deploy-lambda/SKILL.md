---
name: deploy-lambda
description: Step-by-step checklist for deploying or redeploying the AWS Lambda auth gatekeeper. Run /deploy-lambda when the Lambda needs to be updated or set up fresh.
disable-model-invocation: true
---

The user wants to deploy or redeploy the Lambda gatekeeper. Walk through each step and confirm before proceeding to the next.

**Pre-flight checks**
- Confirm AWS CLI is configured: `aws sts get-caller-identity`
- Confirm target region is `ap-south-1` (Mumbai)
- Confirm `auth_gatekeeper.js` exists and is up to date

**Step 1 — Run deploy script**
```sh
sh deploy_auth.sh
```
This creates the IAM role, zips `auth_gatekeeper.js`, and deploys via API Gateway.

**Step 2 — Set environment variables in Lambda**
Go to AWS Console > Lambda > `khyaal-auth-gatekeeper` (or the name in the script) > Configuration > Environment variables. Set:
- `GITHUB_TOKEN` — GitHub PAT with `repo` scope for committing `data.json`
- `EXPECTED_PASSWORD_HASH` — SHA-256 hash of the site password

To generate the hash:
```sh
echo -n "your-password" | shasum -a 256
```

**Step 3 — Copy the Lambda URL**
After deploy, the script outputs an API Gateway HTTPS URL. Copy it.

**Step 4 — Update index.html**
Find the `LAMBDA_URL` constant in `index.html` and replace it with the new URL. This is a hardcoded string — search for `LAMBDA_URL` or `lambda` to locate it.

**Step 5 — Test**
Open `https://khyaal-inc.github.io/khyaal-engineering-updates/` and attempt login. Then open `?cms=true&mode=pm` and attempt a CMS save to verify GitHub API proxying works.

**Step 6 — Commit index.html**
Commit the updated `LAMBDA_URL` constant to `main` so GitHub Pages picks it up.
