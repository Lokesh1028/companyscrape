# Documentation images

This folder is for **optional** marketing or README screenshots. The app does not read files from here at runtime.

## Suggested captures

1. **Home** (`/`) — hero with search and example chips.
2. **Report** (`/report?q=Google`) — intelligence header, sentiment, confidence bar, tab strip.
3. **Compare** (`/compare?a=Google&b=Microsoft`) — two columns after cache load.
4. **Dev inspector** (`/dev/evidence`) — evidence table tab with sample JSON.

## How to add images

1. Capture PNGs (e.g. 1600×900) from a local `npm run dev` session.
2. Save as `home.png`, `report.png`, `compare.png`, `dev-evidence.png` in this directory.
3. Reference them from the root `README.md`, for example:

```markdown
![Home](docs/screenshots/home.png)
```

## Automated capture (optional)

You can script captures with Playwright or Puppeteer by starting the stack (`uvicorn` + `next dev`) and navigating to the URLs above. Keep scripts out of the repo root unless you commit them as `frontend/e2e/` or `scripts/`.
