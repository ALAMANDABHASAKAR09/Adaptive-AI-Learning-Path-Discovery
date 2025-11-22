# Adaptive-AI-Learning-Path-Discovery
https://poetic-cassata-aef226.netlify.app/

This repository is a Vite + React app. It is configured to deploy to GitHub Pages via GitHub Actions.

Hosting notes
- The Vite config sets `base` to `/Adaptive-AI-Learning-Path-Discovery/` so assets load correctly when served from `https://<username>.github.io/Adaptive-AI-Learning-Path-Discovery/`.
- A GitHub Actions workflow is present at `.github/workflows/deploy-pages.yml` and will build and deploy the `dist` folder on pushes to `main`.

How to push changes and trigger deploy
```
git add .
git commit -m "chore: update for GitHub Pages"
git push origin main
```

Check deployment
- After pushing, open the repository on GitHub and go to the Actions tab to watch the workflow run.
- When the job finishes, your site should be available at:

```
https://ALAMANDABHASAKAR09.github.io/Adaptive-AI-Learning-Path-Discovery/
```

If you want a custom domain or to use the `docs/` folder instead, tell me and I will adjust the workflow.
