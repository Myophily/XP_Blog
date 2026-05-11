# AGENTS.md

This file provides guidance to Codex and other coding agents when working with this repository.

## Project Overview

XP Blog is a Windows XP-themed personal blog template built as a static single-page app.

- **Frontend**: Vanilla HTML/CSS/JavaScript with XP.css
- **Backend**: Supabase Auth, PostgreSQL, Row Level Security
- **Architecture**: Single-page app with tab-based navigation and Explorer-style category browsing

## Key Files

- `index.html` - Main HTML structure with XP-styled UI and inline app config
- `app.js` - Authentication, posts, categories, image embedding, and modal logic
- `style.css` - Custom CSS enhancements to the XP.css theme
- `supabase.sql` - Schema, RLS policies, owner helper function, and setup SQL
- `README.md` - User-facing setup and deployment instructions
- `CONTRIBUTING.md` - Contribution guide
- `SECURITY.md` - Security reporting and secret handling guidance

## Development

### Running the Application

This is a static web application. Serve it using any local web server:

```bash
python -m http.server 8000
```

or:

```bash
npx http-server
```

You can also open `index.html` directly, but a local server better matches deployment behavior.

### Local Configuration

Do not hardcode Supabase credentials in `app.js`.

1. Set `url` and `anonKey` in the `xp-blog-config` JSON block near the bottom of `index.html`.
2. Optionally set `siteTitle`, `sourceUrl`, and `sourceLabel`.
3. Do not commit private service keys, database passwords, or server-only tokens.

`config.js`, `config.*.js`, `.env`, and `.env.*` are still ignored for old local setups and must not be committed.

## External Dependencies

- XP.css, loaded from CDN
- Supabase JavaScript Client v2, loaded from CDN

Avoid adding build tooling or heavy dependencies unless the change clearly needs it.

## Architecture Notes

### Authentication Flow

- Users can sign in or browse as guests.
- Public registration is disabled in `index.html` by default.
- Authentication state is managed globally with `currentUser`, `isGuest`, and `isOwner`.
- Supabase handles session persistence and auth state changes.
- Owner-only UI is shown after `is_site_owner()` confirms the logged-in user is in `site_owners`.

### Database Schema

The app expects the objects created by `supabase.sql`:

- `site_owners`: owner Auth user IDs
- `categories`: hierarchical folders with visibility controls
- `posts`: blog posts with category links and optional JSON image payloads
- `is_site_owner()`: RPC for owner checks
- RLS policies for public reads and owner-only writes

Posts require a valid `category_id`. Hidden categories and their posts are visible only to owners.

### UI State Management

- Tab navigation switches between Login and Blog panels.
- The left sidebar renders category folders; mobile uses a select fallback.
- Dynamic UI updates are based on authentication and owner status.
- Status bar shows user state, post count/filter state, and current time.
- Modal windows are managed with a shared overlay.

## Code Style

- Use vanilla JavaScript with async/await for Supabase operations.
- Use direct DOM references and keep event listener setup centralized.
- Escape user-provided text with `escapeHtml()` or text-only DOM APIs.
- Keep changes scoped; avoid introducing frameworks or bundlers for small fixes.
- Preserve the Windows XP visual language when editing UI.
