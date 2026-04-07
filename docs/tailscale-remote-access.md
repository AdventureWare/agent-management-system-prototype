# Tailscale Remote Access

This is the preferred near-term remote access path for the AMS prototype when the app still runs on the MacBook.

It is designed to keep the runtime and the access layer separate:

- the app runs as a local Node server built with `@sveltejs/adapter-node`
- the local server can be managed directly or by `launchd`
- Tailscale Serve is an outer access layer that proxies to the local server
- the app itself does not depend on Tailscale-specific auth behavior

## Prerequisites

- Tailscale installed on the MacBook
- the MacBook signed into the correct tailnet
- HTTPS enabled in the tailnet for Tailscale Serve
- `.env.local` configured with `AMS_OPERATOR_PASSWORD`

## Local app server

Build the app:

```sh
npm run build
```

Start the local server manually:

```sh
npm run app:server:start
```

Check status:

```sh
npm run app:server:status
```

Stop it:

```sh
npm run app:server:stop
```

The local server listens on `AMS_APP_HOST` and `AMS_APP_PORT`, which default to `127.0.0.1:3000`.

## launchd management

Install the Mac launch agent:

```sh
npm run app:launchd:install
```

Check launch agent status:

```sh
npm run app:launchd:status
```

Remove the launch agent:

```sh
npm run app:launchd:uninstall
```

The launch agent runs the local app server. Remote access can then be enabled and disabled separately.

## Enable Tailscale access

Start remote access through the vendor-neutral wrapper:

```sh
npm run remote:access:start
```

Or directly with the provider-specific command:

```sh
npm run remote:tailscale:start
```

Check status:

```sh
npm run remote:access:status
```

Disable Tailscale Serve:

```sh
npm run remote:access:stop
```

## What the Tailscale path does

The current implementation:

1. ensures the local app server is running
2. configures `tailscale serve` to proxy HTTPS requests to `http://127.0.0.1:${AMS_APP_PORT}`
3. reports the tailnet URL exposed by Tailscale Serve

Tailscale Serve stays active until you reset it. The app server and the remote access layer are intentionally separate concerns.

## Security notes

- This path is private to the tailnet. It is not a public internet tunnel.
- The current shared operator password is still used as a fallback app-layer gate until named-user auth exists.
- The local app server should remain bound to localhost.
- If you later switch to another provider, keep the app server and launchd pieces and replace only the remote-access adapter.

## Current environment knobs

```sh
AMS_APP_HOST=127.0.0.1
AMS_APP_PORT=3000
AMS_REMOTE_ACCESS_PROVIDER=tailscale
AMS_TAILSCALE_HTTPS_PORT=443
```

## Legacy fallback

The previous localhost.run-based path still exists as a legacy fallback:

```sh
npm run remote:phone:start
```

It should no longer be the preferred path for daily use.
