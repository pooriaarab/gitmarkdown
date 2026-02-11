# GitMarkdown - Complete Setup Guide

This guide walks you through setting up GitMarkdown from scratch, including all required third-party services.

## Table of Contents

- [Prerequisites](#prerequisites)
- [1. Clone and Install](#1-clone-and-install)
- [2. Create a Firebase Project](#2-create-a-firebase-project)
- [3. Enable Firebase Authentication](#3-enable-firebase-authentication)
- [4. Create a GitHub App](#4-create-a-github-app)
- [5. Enable Cloud Firestore](#5-enable-cloud-firestore)
- [6. Enable Realtime Database](#6-enable-realtime-database)
- [7. Get Firebase Admin Credentials](#7-get-firebase-admin-credentials)
- [8. Get Firebase Client Config](#8-get-firebase-client-config)
- [9. Set Up AI Provider Keys](#9-set-up-ai-provider-keys)
- [10. Configure Environment Variables](#10-configure-environment-variables)
- [11. Apply Security Rules](#11-apply-security-rules)
- [12. Create Firestore Indexes](#12-create-firestore-indexes)
- [13. Run Locally](#13-run-locally)
- [14. Deploy to Netlify](#14-deploy-to-netlify)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

- **Node.js 20+** and npm (or yarn/pnpm)
- A **GitHub account**
- A **Google account** (for Firebase)
- An **Anthropic** and/or **OpenAI** API key (for AI features)

---

## 1. Clone and Install

```bash
git clone https://github.com/pooriaarab/gitmarkdown.git
cd gitmarkdown
npm install
```

> If you see peer dependency warnings, that's expected. The project uses an `.npmrc` with `legacy-peer-deps=true`.

Copy the environment template:

```bash
cp .env.example .env.local
```

You'll fill in the values in the steps below.

---

## 2. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Create a project"** (or **"Add project"**)
3. Enter a project name (e.g. `gitmarkdown`)
4. Optionally enable Google Analytics (not required)
5. Click **Create project** and wait for it to provision

---

## 3. Enable Firebase Authentication

1. In Firebase Console, go to **Build > Authentication**
2. Click **Get started**
3. Go to the **Sign-in method** tab
4. Click **GitHub** and toggle it **Enabled**
5. You'll see fields for **Client ID** and **Client Secret** — leave this page open, you'll fill them in after creating the GitHub OAuth app (next step)

---

## 4. Create a GitHub App

1. Go to [GitHub Developer Settings > GitHub Apps > New](https://github.com/settings/apps/new)
2. Fill in:
   - **GitHub App name**: `GitMarkdown` (or any unique name)
   - **Homepage URL**: `http://localhost:3000` (update to your production URL later)
   - **Callback URL**: `https://<YOUR_FIREBASE_PROJECT_ID>.firebaseapp.com/__/auth/handler`
     - Replace `<YOUR_FIREBASE_PROJECT_ID>` with your actual Firebase project ID (e.g. `gitmarkdown-12345`)
     - You can find this in Firebase Console > Project Settings > General
   - **Request user authorization (OAuth) during installation**: Check this box
   - **Webhook**: Uncheck "Active" (not needed)
3. Under **Permissions**, set:
   - **Repository permissions**:
     - Contents: **Read & write**
     - Pull requests: **Read & write**
     - Metadata: **Read-only** (auto-selected)
     - Commit statuses: **Read-only**
   - **Account permissions**:
     - Email addresses: **Read-only**
4. Under **Where can this GitHub App be installed?**, select **Any account**
5. Click **Create GitHub App**
6. On the app settings page:
   - Copy the **Client ID**
   - Click **Generate a new client secret** and copy the **Client Secret**
   - Note the **app slug** from the URL (e.g. if the URL is `github.com/settings/apps/gitmarkdownapp`, the slug is `gitmarkdownapp`)
7. Go back to **Firebase Console > Authentication > Sign-in method > GitHub**:
   - Paste the **Client ID** and **Client Secret**
   - Click **Save**
8. Add to your `.env.local`:

```bash
GITHUB_CLIENT_ID=your_client_id_here
GITHUB_CLIENT_SECRET=your_client_secret_here
NEXT_PUBLIC_GITHUB_APP_SLUG=your_app_slug_here
```

### Add Authorized Domains

While in Firebase Authentication:
1. Go to the **Settings** tab > **Authorized domains**
2. Make sure `localhost` is listed (it should be by default)
3. Later, add your production domain (e.g. `gitmarkdown-app.netlify.app`)

---

## 5. Enable Cloud Firestore

1. In Firebase Console, go to **Build > Firestore Database**
2. Click **Create database**
3. Choose **Start in test mode** (we'll apply proper rules later)
4. Select a Cloud Firestore location closest to your users (e.g. `us-east1`, `europe-west1`)
5. Click **Enable**

---

## 6. Enable Realtime Database

This is separate from Firestore — it's used for real-time collaboration (Yjs).

1. In Firebase Console, go to **Build > Realtime Database**
2. Click **Create Database**
3. Select a location (use the same region as Firestore if possible)
4. Choose **Start in locked mode** (we'll apply rules later)
5. Click **Enable**
6. **Copy the database URL** shown at the top of the page — it looks like:
   ```
   https://your-project-default-rtdb.firebaseio.com
   ```
7. Add to your `.env.local`:

```bash
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
```

---

## 7. Get Firebase Admin Credentials

The Admin SDK is used server-side (API routes) to verify auth tokens and manage data.

1. In Firebase Console, go to **Project Settings** (gear icon) > **Service Accounts**
2. Make sure **Firebase Admin SDK** is selected
3. Click **"Generate new private key"**
4. A JSON file will be downloaded. Open it and copy these values:

```bash
FIREBASE_ADMIN_PROJECT_ID=<"project_id" from JSON>
FIREBASE_ADMIN_CLIENT_EMAIL=<"client_email" from JSON>
FIREBASE_ADMIN_PRIVATE_KEY=<"private_key" from JSON>
```

> **Important**: The private key is a long string that starts with `-----BEGIN RSA PRIVATE KEY-----`. Include the entire value including the begin/end lines. In your `.env.local`, wrap it in double quotes:
> ```
> FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIE...\n-----END RSA PRIVATE KEY-----\n"
> ```

---

## 8. Get Firebase Client Config

1. In Firebase Console, go to **Project Settings** (gear icon) > **General**
2. Scroll down to **Your apps**
3. If you don't see a web app, click **Add app** > **Web** (`</>`)
   - Enter a nickname (e.g. `gitmarkdown-web`)
   - You don't need Firebase Hosting
   - Click **Register app**
4. You'll see a `firebaseConfig` object. Copy the values:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

---

## 9. Set Up AI Provider Keys

At least one AI provider is required for AI features (chat sidebar, inline editing, Mermaid generation). Server-side keys are used by default, but users can also bring their own API keys via the Settings dialog (BYOK).

### Anthropic (Claude) — Recommended

1. Go to [Anthropic Console](https://console.anthropic.com/settings/keys)
2. Create an API key
3. Add to `.env.local`:
   ```bash
   ANTHROPIC_API_KEY=sk-ant-...
   ```

### OpenAI (GPT)

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create an API key
3. Add to `.env.local`:
   ```bash
   OPENAI_API_KEY=sk-...
   ```

---

## 10. Configure Environment Variables

Your `.env.local` should now look like this (with your actual values filled in):

```bash
# Firebase Client
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com

# Firebase Admin
FIREBASE_ADMIN_PROJECT_ID=your-project
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----\n"

# GitHub App
GITHUB_CLIENT_ID=Iv1.abc123
GITHUB_CLIENT_SECRET=abc123...
NEXT_PUBLIC_GITHUB_APP_SLUG=gitmarkdownapp

# AI Keys
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_DEFAULT_AI_PROVIDER=anthropic
NEXT_PUBLIC_DEFAULT_AI_MODEL=claude-sonnet-4-20250514

# Security (recommended)
GITHUB_TOKEN_ENCRYPTION_KEY=<output of: openssl rand -hex 32>
```

---

## 11. Apply Security Rules

### Firestore Rules

Go to **Firebase Console > Firestore Database > Rules** and replace the contents with the rules from [`firestore.rules`](../firestore.rules):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper: check if the caller is authenticated
    function isAuth() {
      return request.auth != null;
    }

    // Helper: check if caller uid matches the document path userId
    function isOwner(userId) {
      return isAuth() && request.auth.uid == userId;
    }

    // ── User-scoped data (owner only) ──────────────────────────
    match /users/{userId} {
      allow read, write: if isOwner(userId);

      match /aiChats/{chatId} {
        allow read, write: if isOwner(userId);
      }

      match /personas/{personaId} {
        allow read, write: if isOwner(userId);
      }
    }

    match /userSettings/{userId} {
      allow read, write: if isOwner(userId);
    }

    // ── Webhooks (owner only) ──────────────────────────────────
    match /webhooks/{userId}/registrations/{wid} {
      allow read, write: if isOwner(userId);
    }

    // ── Comments (authenticated) ───────────────────────────────
    match /comments/{commentId} {
      allow read, write: if isAuth();
    }

    // ── Workspaces (members only) ──────────────────────────────
    match /workspaces/{workspaceId} {
      function isMember() {
        return isAuth() && request.auth.uid in resource.data.members;
      }

      function isMemberForCreate() {
        return isAuth() && request.auth.uid in request.resource.data.members;
      }

      allow read, update, delete: if isMember();
      allow create: if isMemberForCreate();

      match /files/{fileId} {
        allow read, write: if isAuth()
          && request.auth.uid in get(/databases/$(database)/documents/workspaces/$(workspaceId)).data.members;

        match /comments/{commentId} {
          allow read, write: if isAuth()
            && request.auth.uid in get(/databases/$(database)/documents/workspaces/$(workspaceId)).data.members;
        }
      }

      match /versions/{versionId} {
        allow read, write: if isAuth()
          && request.auth.uid in get(/databases/$(database)/documents/workspaces/$(workspaceId)).data.members;
      }
    }
  }
}
```

Click **Publish**.

### Realtime Database Rules

Go to **Firebase Console > Realtime Database > Rules** and replace with:

```json
{
  "rules": {
    "yjs": {
      "$workspaceId": {
        "$fileId": {
          ".read": "auth != null",
          ".write": "auth != null"
        }
      }
    },
    ".read": false,
    ".write": false
  }
}
```

Click **Publish**.

---

## 12. Create Firestore Indexes

The comments feature queries by `repoFullName` + `filePath` + `createdAt`, which requires a composite index.

### Option A: Automatic (recommended)

1. Run the app and try to open a file — if the index is missing, you'll see an error in the browser console with a direct link
2. Click the link — it takes you to Firebase Console with the index pre-filled
3. Click **Create index** and wait a few minutes

### Option B: Manual

1. Go to **Firebase Console > Firestore Database > Indexes**
2. Click **Create Index**
3. Configure:
   - **Collection ID**: `comments`
   - **Fields**:
     - `repoFullName` — Ascending
     - `filePath` — Ascending
     - `createdAt` — Ascending
   - **Query scope**: Collection
4. Click **Create** and wait for the status to show "Enabled" (takes 1-5 minutes)

---

## 13. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You should see the landing page. Click **"Sign in with GitHub"** to test the auth flow.

### Verify Everything Works

- [ ] Landing page loads
- [ ] GitHub sign-in completes and redirects to dashboard
- [ ] Repos appear on dashboard
- [ ] Clicking a repo loads the file tree
- [ ] Clicking a markdown file opens the editor
- [ ] Making edits triggers auto-save (check the "Saving..." / "Auto-saved" indicator)
- [ ] AI sidebar opens and responds to messages (if AI key is configured)
- [ ] Comments can be added by selecting text and clicking the comment icon

---

## 14. Deploy to Netlify

### Option A: Netlify UI (recommended)

1. Push your code to GitHub (make sure `.env.local` is in `.gitignore`)
2. Go to [Netlify](https://app.netlify.com/) and click **"Add new site" > "Import an existing project"**
3. Connect your GitHub repo
4. Configure build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`
5. Go to **Site settings > Environment variables** and add all variables from your `.env.local`
6. Click **Deploy site**

### Option B: Netlify CLI

```bash
npm install -g netlify-cli
netlify login
netlify init        # Link to your repo
netlify deploy --prod
```

### Post-Deploy Checklist

After deploying, update these settings:

1. **`.env` on Netlify**: Set `NEXT_PUBLIC_APP_URL` to your production URL (e.g. `https://gitmarkdown-app.netlify.app`)
2. **GitHub App**: Update the **Homepage URL** to your production URL
3. **Firebase Console > Authentication > Settings > Authorized domains**: Add your Netlify domain (e.g. `gitmarkdown-app.netlify.app`)
4. **`FIREBASE_ADMIN_PRIVATE_KEY` on Netlify**: Make sure the private key is pasted with actual newlines. Netlify's UI handles this correctly if you paste the raw key including `\n` characters.

### netlify.toml

Make sure this file exists in your project root:

```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

---

## Troubleshooting

### "Missing or insufficient permissions" (Firestore)

- You haven't applied the Firestore security rules. See [Step 11](#11-apply-security-rules).
- Or the composite index hasn't been created yet. See [Step 12](#12-create-firestore-indexes).

### "Failed to add comment"

Same as above — Firestore rules or missing composite index. Check the browser console for a direct link to create the index.

### GitHub sign-in fails or loops

- Verify the **callback URL** in your GitHub App matches exactly: `https://<PROJECT_ID>.firebaseapp.com/__/auth/handler`
- Verify the **Client ID** and **Client Secret** from your GitHub App are entered in both `.env.local` AND in Firebase Console > Auth > GitHub.
- Check that `localhost` (for dev) or your production domain is in Firebase Auth > Authorized domains.

### "Firebase: Error (auth/configuration-not-found)"

- You haven't enabled the GitHub sign-in provider in Firebase Console > Authentication > Sign-in method.

### Realtime Database connection errors

- Make sure `NEXT_PUBLIC_FIREBASE_DATABASE_URL` is set and points to your Realtime Database URL.
- Make sure the Realtime Database rules allow authenticated access. See [Step 11](#11-apply-security-rules).

### `FIREBASE_ADMIN_PRIVATE_KEY` errors in production

- The private key contains newlines. In `.env.local`, wrap it in double quotes.
- On Netlify, paste the raw key value (the UI handles multiline values correctly).
- If you see `error:0909006C:PEM routines`, the key's `\n` characters are being treated as literal text. Make sure they're actual newline characters.

### AI features not working

- Check that at least one of `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` is set.
- Check the browser Network tab for errors on `/api/ai/chat`.
- Verify `NEXT_PUBLIC_DEFAULT_AI_PROVIDER` matches a key you've set (`anthropic` or `openai`).

### Build fails with peer dependency errors

- The project uses `.npmrc` with `legacy-peer-deps=true`. If you're using yarn or pnpm, you may need to configure equivalent settings.
