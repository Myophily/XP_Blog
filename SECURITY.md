# Security Policy

## Supported Versions

Security updates target the current `main` branch.

## Reporting a Vulnerability

Please do not post exploit details in a public issue. If GitHub private
vulnerability reporting is enabled, use that. Otherwise, open a minimal issue so
the maintainers can coordinate a private report path.

## Supabase Keys

XP Blog uses the Supabase anon public key in the browser. That key is safe to
ship only when Row Level Security is enabled and the policies in `supabase.sql`
match your intended access rules.

Only put browser-safe values in the `xp-blog-config` block:

- Supabase project URL
- Supabase anon public key
- Public display metadata such as site title and source link

Never expose:

- Supabase service role key
- Database password
- Personal access tokens
- Private deployment secrets

If you do not want your Supabase project URL or anon key in a public repository,
keep them on a private deployment branch or replace the `xp-blog-config` block
during deployment.
