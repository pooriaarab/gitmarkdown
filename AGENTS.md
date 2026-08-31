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
code and migrations are not counted. If a change genuinely cannot be split, say
why in the body and ask for the `oversized-approved` label. Do not apply that
label yourself.

Settings for this repo are in `.github/pr-standards.json`. The standard is at
https://github.com/pooriaarab/scripts/blob/main/pr-standards.md
<!-- pr-standards:end -->
