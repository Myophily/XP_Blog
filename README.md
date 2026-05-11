# XP Blog

XP Blog is a Windows XP themed single-page blog template. It is a static
HTML/CSS/JavaScript app that stores posts, folders, auth sessions, and owner
permissions in Supabase.

## Features

- Windows XP style UI with XP.css
- Folder-style category navigation
- Public read-only browsing
- Owner-only post publishing
- Owner-only category create, edit, hide, and delete tools
- Small image attachments stored in the post JSON
- Supabase Auth, Postgres, and Row Level Security

## Quick Start

1. Clone or download this repository.
2. Create a new Supabase project.
3. Open the Supabase SQL Editor and run [`supabase.sql`](supabase.sql).
4. Create the blog owner user in Supabase Auth.
5. Copy that user's `auth.users.id` value and run:

```sql
insert into public.site_admins (user_id)
values ('OWNER_USER_UUID_HERE')
on conflict do nothing;
```

6. Open `index.html` and replace the placeholders in the `xp-blog-config`
   block:

```html
<script id="xp-blog-config" type="application/json">
  {
    "url": "https://YOUR_PROJECT_ID.supabase.co",
    "anonKey": "YOUR_SUPABASE_ANON_PUBLIC_KEY",
    "siteTitle": "XP Blog",
    "sourceUrl": "https://github.com/YOUR_USERNAME/XP_Blog",
    "sourceLabel": "XP Blog Source"
  }
</script>
```

7. Serve the repository root with any static server:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Cloudflare Pages

XP Blog does not need a build step.

1. Push this repository to GitHub.
2. In Cloudflare, go to Workers & Pages and create a Pages project from the
   repository.
3. Use these build settings:
   - Framework preset: none
   - Build command: `exit 0`
   - Build output directory: `/`
4. Deploy. Cloudflare Pages will serve the root `index.html`.

## Supabase Notes

The frontend expects these public tables and functions from `supabase.sql`:

- `public.posts`
- `public.categories`
- `public.site_admins`
- `public.is_site_owner()`

Visitors can read visible categories and posts. Only users listed in
`site_admins` can create, update, or delete posts and categories.

## Security

The Supabase anon public key is intended to be used in browser apps. Data safety
comes from Row Level Security, so do not disable the policies in
`supabase.sql`.

Never put these values in `index.html`, `app.js`, or a public repository:

- Supabase service role key
- Database password
- Personal access tokens
- Private deployment secrets

## Project Files

- `index.html` - app markup and `xp-blog-config`
- `app.js` - auth, posts, categories, and UI behavior
- `style.css` - XP theme adjustments
- `supabase.sql` - complete Supabase schema and RLS setup
