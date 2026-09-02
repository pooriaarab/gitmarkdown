# AGENTS.md

<!-- pr-standards:start -->

## Pull requests

One issue. One PR. One concern. Under 500 counted lines.

Open the issue first. No issue, no branch. The issue number ties the branch, the
title, the body and the merged commit to one agreed piece of work.

```text
branch:  git-<issue>-<slug>          git-142-fix-onboarding-drop-off
title:   [GIT-<issue>] <Subject>   [GIT-142] Fix onboarding drop-off
body:    Closes #142
         ## What / ## Why / ## How I verified
         Assisted-by: <agent>:<model>
```

Subject line: imperative mood, 10-50 characters, no trailing period, no emoji.
Write "Fix the drop-off", not "Fixed the drop-off".

Hard caps, failed by the `pr-standards` CI check: 500 counted lines, 40 counted
files, exactly one `Closes #`. Lockfiles, build output, snapshots, generated
code and migrations are not counted. There is no label that clears the cap and
no one to ask for one. Split the change.

Settings for this repo are in `.github/pr-standards.json`. The standard is at
https://github.com/pooriaarab/scripts/blob/main/pr-standards.md

<!-- pr-standards:end -->

## Product context

Read `.agents/brand.md` before writing product copy or visual assets.

Read `.agents/design.md` before changing the interface or design tokens.

<!-- cursor-cloud:start -->

## Cloud agents (Cursor)

This repo runs on [Cursor Cloud Agents](https://cursor.com/docs/cloud-agent). Local
`.env.local` does **not** sync — mirror keys in **Dashboard → Cloud Agents → Secrets**.

| Secret type | Use for |
|---|---|
| Runtime Secret | API keys, passwords (hidden from chat/commits) |
| Environment Variable | Non-sensitive config (URLs, flags) |
| Build Secret | Private npm/docker registries during install only |

### Install & test

Install command lives in `.cursor/environment.json`. After dashboard setup:

1. **Environments** → link this repo → wait for **Build = Success**
2. **Secrets** → copy every key from your local `.env.local` / `.env.example`
3. Run the project's test/lint command before opening a PR (see below)

### Verify before PR

```bash
npm run lint
```

### Pull requests

Follow the fleet PR standard in this repo's `AGENTS.md` (`<!-- pr-standards:start -->` block).
Cloud agents need push access via Git integration and a successful environment Build.

Setup guide: https://github.com/pooriaarab/scripts/blob/main/cursor-cloud-rollout.md

<!-- cursor-cloud:end -->
