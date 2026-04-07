# Cloud Storage Access

This prototype can now launch new Codex work threads with extra writable folders outside the project root.

Use this when a task needs files from:

- iCloud Drive
- Dropbox
- Google Drive for desktop
- OneDrive
- any other locally synced cloud folder

## How it works

On the project detail page, add one absolute folder path per line under `Additional writable roots`.

For new work threads, AMS passes those folders to Codex with repeated `--add-dir` flags in addition to the main project root. That keeps the normal project-root workspace model, but widens the sandbox only to the specific extra folders you approved.

## Important macOS caveat

This does not bypass host OS permissions.

If the app process or the terminal that launches Codex does not already have access to the target folder, the run will still fail even when the path is configured in AMS. On macOS this is especially relevant for:

- `~/Library/Mobile Documents/...` iCloud Drive paths
- folders protected by `Files and Folders`
- folders blocked by `Full Disk Access` policy

If AMS reports that a path exists but the current process cannot access it, fix the host permission first:

1. Grant the app or terminal access to the folder in macOS privacy settings.
2. Confirm the folder is actually downloaded locally and not only represented as a cloud placeholder.
3. Retry with a new thread if the old thread was created before the extra roots were configured.

## Thread reuse behavior

Extra writable roots are treated as part of a thread's launch environment.

If a project now requires extra roots and an older thread was created without them, AMS will start a fresh thread instead of silently reusing the under-scoped one. Existing threads do not gain new `--add-dir` grants retroactively.

## Practical recommendation

Use `workspace-write` plus explicit extra roots by default.

Only switch a project or worker to `danger-full-access` if you truly need unrestricted filesystem access. For iCloud Drive and most synced cloud folders, explicit `--add-dir` roots are the safer default.
