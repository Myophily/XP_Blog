# Contributing

XP Blog is a small static app, so contributions should stay lightweight and easy
to review.

## Local Setup

1. Fork and clone the repository.
2. Run `supabase.sql` in your own Supabase project.
3. Replace the placeholder values in the `xp-blog-config` block in
   `index.html`.
4. Start a static server:

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000`.

## Guidelines

- Do not commit real Supabase project URLs, anon keys, service role keys, or
  database passwords.
- If you change `xp-blog-config` for local testing, restore the placeholders
  before opening a pull request.
- Keep the app vanilla HTML, CSS, and JavaScript unless a dependency is clearly
  worth the extra setup.
- Preserve the Windows XP / Explorer feel.
- Use `escapeHtml()` or another safe path before rendering user-provided text.
- Mention any `supabase.sql` schema or RLS changes in the pull request.

## Pull Requests

Include:

- What changed
- Why it changed
- How you tested it
- Any Supabase setup or migration notes
