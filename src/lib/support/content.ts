import type { SupportSiteConfig } from "@pooriaarab/support";

export const supportConfig: SupportSiteConfig = {
  siteName: "GitMarkdown",
  supportEmail: "support@gitmarkdown.com",
  homeDescription: "Guides for editing Markdown in GitHub pull requests with GitMarkdown.",
  categories: [
    {
      slug: "getting-started",
      name: "Getting started",
      description: "Install the app, open a PR, and edit files.",
    },
    {
      slug: "editing",
      name: "Editing",
      description: "Formatting, commits, and collaboration.",
    },
    {
      slug: "account",
      name: "Account & GitHub",
      description: "Sign-in and repository access.",
    },
  ],
  articles: [
    {
      slug: "connect-github",
      category: "getting-started",
      title: "Connect GitHub",
      description: "Grant access to the repositories you want to edit.",
      updatedAt: "2026-10-24",
      content: `## Sign in
Open /login and choose **Continue with GitHub**.

## Permissions
Review the requested GitHub access. Choose the repositories that you want to edit in the GitHub App settings.

## Start editing
Choose a repository and branch in the editor. Open a Markdown file from the file tree.`,
    },
    {
      slug: "edit-in-a-pull-request",
      category: "editing",
      title: "Edit in a pull request",
      description: "Edit formatted Markdown and commit your changes.",
      updatedAt: "2026-10-24",
      content: `## Open files
Use the file tree to switch between Markdown files in the PR branch.

## Format your document
Edit the rendered document directly. Use the toolbar or slash commands to format text.

## Commit
Open the commit dialog and review your changes. Enter a commit message, then choose **Commit & Push**.
Check the selected branch before you commit. Resolve conflicts in GitHub if the branch changed.`,
    },
    {
      slug: "repository-access",
      category: "account",
      title: "Repository access",
      description: "Review access when a repository does not appear.",
      updatedAt: "2026-10-24",
      content: `## Missing repository
Check that your GitHub account can open the repository. Review the GitHub App installation and its selected repositories.

## Refresh access
Sign out and sign in again after you change repository access.

## Questions
Email support@gitmarkdown.com if the repository still does not appear.`,
    },
  ],
};
