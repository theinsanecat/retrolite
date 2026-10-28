# Retrolite

**Sprint retros that run entirely in your browser.** No sign-up, no server, no database.

Pick a retro format, add cards, dot-vote, group and link related cards, and agree action items with an owner and a date. Copy the meeting notes as Markdown, and share the whole board with your team as a single link or a small file.

## Features

- **Retro formats:** Went well / To improve / Ideas, Start / Stop / Continue, Mad / Sad / Glad, and the 4Ls (Liked / Learned / Lacked / Longed for).
- **Organize cards:** keep a card standalone, group it under another card (one level deep; the parent shows the group's total votes), or link related cards as siblings, even across columns. Drag a card onto another card, or use the ⋯ menu on touch screens and keyboards.
- **Card options menu (⋯):** group, ungroup, take out of a group, link and unlink, move to another column, edit, reset votes, delete (with undo). What it offers depends on whether the card is standalone, a group parent or grouped under another card, and the rules for every case live in `src/lib/cards.ts`.
- **Clear feedback:** every action confirms itself in a toast, and actions that aren't allowed explain why. All the wording lives in `src/messages.json`.
- **Open actions across boards:** every unfinished action item from every retro in one list, overdue first, filterable by owner.
- **Unique board names:** a new, imported or renamed board that clashes with an existing name gets a number, like "Sprint retro (2)".
- **Light and dark theme:** follows your device by default; switch to Light or Dark at the bottom of the sidebar.
- **Sample board:** open the app with `?demo` to start on a filled board that explains itself.

## How it works without a backend

| Need | Usual answer | Retrolite |
| --- | --- | --- |
| Save data | A database | **IndexedDB** in the browser, with persistent storage requested so it isn't cleared |
| Share a board | An API and a share table | The board is compressed into the **URL fragment** (`#share=…`). Browsers never send the fragment to a server, so the link itself carries the board |
| Stay safe | Server-side checks | A strict **Content Security Policy**: only the site's own scripts, styles and images load, and the page can't connect to any other server |
| Work offline | — | A **service worker** caches the app, so it opens with no internet |

Sharing uses the browser's built-in `CompressionStream`, so there are no extra dependencies: just React and Vite.

## Good to know

- **Anyone with a share link can read the board**, and links can stay in browser history. Retrolite says so before you share.
- **The link is removed from the address bar** as soon as the board is read, so other scripts, extensions or bookmarks of the page don't keep a copy.
- **Long links can break** in some chat apps. Past 2,000 characters Retrolite warns you; use **Download** and **Import board file** instead.
- **Browsers can clear site data.** Persistent storage is requested, and Safari may still clear data for sites you don't visit for a while, so download important boards as a backup or install the app.

## UI components

Small, dependency-free components in `src/components/ui`: `Button` (primary, secondary and tertiary variants), `Tooltip`, `Menu`, `Select` (an accessible custom dropdown), `Toaster` and `ThemeSwitch`. Menus and dropdowns work with the keyboard (arrows, Home/End, Enter, Esc, type-ahead).

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

The share-link and strict-CSP approach was inspired by [FuseLLM](https://github.com/shrinathprabhu/fusellm) by Shrinath Prabhu.
