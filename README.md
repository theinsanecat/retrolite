# Retrolite

**Sprint retros that run entirely in your browser.** No sign-up, no server, no database.

Add what went well, what to improve and ideas, dot-vote the cards, agree action items with an owner and a date, then copy the meeting notes as Markdown. Share the whole board with your team as a single link.

## How it works without a backend

| Need | Usual answer | Retrolite |
| --- | --- | --- |
| Save data | A database | **IndexedDB** in the browser, with persistent storage requested so it isn't cleared |
| Share a board | An API and a share table | The board is compressed into the **URL fragment** (`#share=…`). Browsers never send the fragment to a server, so the link itself carries the board |
| Stay safe | Server-side checks | A strict **Content Security Policy**: only the site's own scripts, styles and images load, and the page can't connect to any other server |
| Work offline | — | A **service worker** caches the app, so it opens with no internet |

Sharing uses the browser's built-in `CompressionStream`, so there are no extra dependencies: just React and Vite.

## Stack

React 19 · TypeScript · Vite · IndexedDB · CompressionStream · Service worker (vite-plugin-pwa)

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build with the CSP and service worker
```

Pushing to `main` deploys to GitHub Pages through `.github/workflows/deploy.yml` (in the repo settings, set Pages → Source to "GitHub Actions").

## Credits

The no-backend approach was inspired by [FuseLLM](https://github.com/shrinathprabhu/fusellm) by Shrinath Prabhu.
