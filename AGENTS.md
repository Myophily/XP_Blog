# AGENTS.md

This file provides guidance to Codex when working in this repository.

## Project Overview

XP Blog is a Windows XP themed static blog template built with vanilla HTML,
CSS, and JavaScript.

- Frontend: `index.html`, `style.css`, `app.js`
- Styling: XP.css from a CDN plus local CSS
- Backend: Supabase Auth, Postgres, and Row Level Security
- Deployment target: any static host, with Cloudflare Pages documented as the
  default path

## Key Files

- `index.html` - main UI and the `xp-blog-config` JSON block
- `app.js` - authentication, post loading, category management, modals, and UI
  state
- `style.css` - XP theme adjustments and responsive layout
- `supabase.sql` - complete schema, grants, triggers, and RLS policies
- `README.md` - setup, Supabase, and Cloudflare Pages instructions

## Development

Serve the repository root with a local static server:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Configuration

The app reads Supabase settings from the `xp-blog-config` JSON block in
`index.html`. Do not hardcode Supabase credentials in `app.js`.

Expected config keys:

- `url`
- `anonKey`
- `siteTitle`
- `sourceUrl`
- `sourceLabel`

## Supabase Model

`supabase.sql` creates:

- `posts` with `title`, `content`, `author_email`, `category_id`, `images`,
  `created_at`, and `updated_at`
- `categories` with nested folder support
- `site_admins` for owner authorization
- `is_site_owner()` for RLS and UI owner checks

Public visitors can read visible posts and categories. Only users listed in
`site_admins` can write posts or manage categories.

## Code Style

- Keep the project vanilla HTML/CSS/JavaScript.
- Use async/await for Supabase calls.
- Use direct DOM references following the existing pattern.
- Escape user-provided text with `escapeHtml()` before rendering.
- Preserve the Windows XP visual language when changing UI.
