# Remote Phone Access

This is the minimum viable path for using the AMS prototype from a phone while away from the MacBook that is running the app.

It is intentionally narrow:

- the app still runs on the laptop
- the laptop serves a local preview build
- an SSH tunnel exposes that preview on the internet
- the app requires a shared operator password when that remote path is enabled

## Prerequisites

- macOS laptop with the repo checked out
- `ssh` available on the laptop
- outbound SSH access to `localhost.run` or another compatible SSH tunnel target
- a phone browser

## Required security setup

Before exposing the app off-machine, set a shared password:

```sh
export AMS_OPERATOR_PASSWORD='replace-this-with-a-strong-password'
```

Optional but recommended:

```sh
export AMS_OPERATOR_SESSION_SECRET='replace-this-with-a-second-secret'
```

What this does:

- enables the login screen
- protects `/app/*` and `/api/*`
- adds a `Lock remote access` action inside the app shell

## Start remote access

From the repo root:

```sh
npm run remote:phone:start
```

What the helper does:

1. builds the app
2. starts `vite preview` on `http://127.0.0.1:4173`
3. opens an SSH tunnel to `nokey@localhost.run`
4. writes status and logs under `agent_output/remote-access/`

Check the current URL and process state:

```sh
npm run remote:phone:status
```

Stop the preview server and tunnel:

```sh
npm run remote:phone:stop
```

## Phone workflow

1. Open the tunnel URL reported by the helper.
2. Log in with `AMS_OPERATOR_PASSWORD`.
3. Open `Home` or `Tasks`.
4. Review the queue, open the task, run or resume work, open the thread, and send a follow-up.

## Tunnel overrides

The helper defaults to `localhost.run`. You can point it at a different SSH tunnel target:

```sh
export AMS_REMOTE_TUNNEL_TARGET='user@your-tunnel-host'
export AMS_REMOTE_TUNNEL_REMOTE_PORT='80'
```

If you need a different local preview port:

```sh
export AMS_REMOTE_ACCESS_PORT='4273'
```

## Security notes

- This tunnel is meant for personal operator use, not public multi-user access.
- The preview URL should be treated as sensitive even with the password gate enabled.
- Use a strong password and rotate it if you share the URL.
- Stop the tunnel when you are done instead of leaving it open indefinitely.
