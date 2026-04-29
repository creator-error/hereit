# Google OAuth And Session Plan

## Scope

This note fixes the implementation direction for Story `Googleログイン連携を導入し、初回ログイン時にユーザーを自動作成できるようにする`.

It covers:

- OAuth provider choice
- session persistence strategy
- local and production environment setup
- callback URL rules
- user auto-provisioning flow

## Decision Summary

- Authentication library: `Auth.js` (`next-auth`)
- OAuth provider: Google only
- Next.js integration style: App Router + Auth.js route handler
- Runtime target: Cloudflare Workers via `@opennextjs/cloudflare`
- Session strategy: JWT session in `httpOnly` cookie
- App user persistence: application `users` table in SQLite/D1, created or reused during sign-in callback

## Why This Stack

### Auth.js

`Auth.js` already supports Next.js App Router and Google as a built-in provider.
That reduces custom OAuth handling, CSRF handling, cookie handling, and callback processing
that would otherwise have to be maintained manually.

### JWT Session First

The app needs two distinct persistence concerns:

1. browser login session
2. application user record and authorization data

Those should not be forced into the same storage mechanism.

Using Auth.js JWT sessions keeps the login session stateless at the application layer:

- no auth-session table is required just to keep a user logged in
- Cloudflare Worker instances do not need shared in-memory session state
- local development can work before the database layer is fully expanded
- D1 remains responsible for app data such as `users`, `groups`, `user_groups`, and `scenes`

The JWT is only the login/session envelope. Authorization still comes from database-backed app data.

### Why Not Database Sessions First

Database sessions would add another table and another consistency path before the project has
finished its base schema and repository layer. That is unnecessary for the current requirements:

- Google sign-in
- logout
- user reuse on subsequent login
- later group-based authorization

If revocation or server-side session invalidation becomes a hard requirement later, the project can
move from JWT sessions to database sessions after the DB foundation story is complete.

## Target Auth Flow

1. User clicks `Sign in with Google`.
2. Auth.js redirects to Google OAuth.
3. Google returns to `/auth/callback/google`.
4. Auth.js validates the callback and establishes a JWT session cookie.
5. In the sign-in path, the app upserts the user record into the application database.
6. Later server code reads the authenticated principal from Auth.js and joins it with app data.

## Session Payload Rules

The session token should stay minimal.

Include:

- stable app user identifier
- Google subject identifier
- email
- display name
- avatar URL
- superuser flag only if already resolved from app DB

Do not include:

- group membership lists that may change frequently
- scene authorization results
- large profile payloads from Google

Authorization should re-check DB state on the server where needed.

## Environment Variables

### Local Development

Use Next.js `.env` files for values that must be available to `next dev`.

Expected local variables:

- `AUTH_SECRET`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `AUTH_TRUST_HOST=true`
- `NEXTAUTH_URL=http://localhost:3000/auth`
- `NEXT_PUBLIC_APP_URL=http://localhost:3000`

When running on local Worker emulation with Wrangler, keep `NEXTJS_ENV=development` in `.dev.vars`
so the same `.env.development` values are loaded.

### Production

Set runtime secrets in the Cloudflare dashboard, not in the repository:

- `AUTH_SECRET`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `NEXTAUTH_URL=https://<production-host>/auth`
- `NEXT_PUBLIC_APP_URL=https://<production-host>`

If Workers Builds are used, any build-time public variables also need to exist in Cloudflare build
variables. Secrets must remain in Cloudflare secrets/runtime vars.

## Callback URL Rules

Register these Google OAuth redirect URIs:

- local: `http://localhost:3000/auth/callback/google`
- production: `https://<production-host>/auth/callback/google`

The post-login landing page can stay app-controlled through Auth.js callback configuration.

## Cookie And Host Rules

- cookies stay `httpOnly`
- production must use HTTPS
- `AUTH_SECRET` is required in every environment
- the deployed host must be canonicalized so generated callback URLs do not drift

Because this app will require route handlers and authenticated server logic, the long-term deploy
target should be Cloudflare Workers through OpenNext, not static Pages export.

## User Auto-Provisioning Rules

On successful Google sign-in:

- find user by Google subject if already linked
- otherwise fall back to normalized email match if the product policy allows it
- if no user exists, create one
- persist the minimum identity fields needed by the app

Recommended minimum columns:

- `id`
- `google_sub`
- `email`
- `display_name`
- `avatar_url`
- `is_superuser`
- `created_at`
- `updated_at`

This story only needs automatic create-or-reuse. Group membership management belongs to later stories.

## Proposed App Structure

- `auth.ts`: Auth.js configuration
- `app/auth/[...nextauth]/route.ts`: GET/POST auth handlers
- `server/auth/get-session-user.ts`: helper to map Auth.js session into app principal
- `server/repositories/user-repository.ts`: user lookup and upsert
- `server/db/*`: runtime-specific DB bootstrap

## Implementation Order

1. Add Auth.js and Google provider configuration.
2. Add auth route handler and login/logout entry points.
3. Add user repository contract and sign-in upsert flow.
4. Add protected route helper for later authorization stories.
5. Add local/prod setup notes to README after the first working path is verified.

## Out Of Scope For This Story

- group membership UI
- scene authorization rules
- R2 upload authorization
- admin approval workflow
- shared URL authorization

## References

- Auth.js homepage: https://authjs.dev/
- OpenNext Cloudflare env vars: https://opennext.js.org/cloudflare/howtos/env-vars
- OpenNext Cloudflare overview: https://opennext.js.org/cloudflare
- Next.js environment variables: https://nextjs.org/docs/app/guides/environment-variables
