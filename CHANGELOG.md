# Changelog

Homero doesn't publish to a registry, so this file exists for one reason:
explaining version boundaries that change `homero upgrade`'s behavior, not a
full history of every change. Run `homero version --target .` to see what
your install is actually on.

## 0.2.0

- **Breaking: `homero.config.json` now records `homeroClient`** (`claude`,
  `copilot`, or `both`) — the adapter(s) a repo was installed with.
  `validate`/`upgrade` read it to know which files should exist, instead of
  guessing `both` and reporting a pile of false "missing file" errors on a
  single-adapter install.
- A repo installed before this field existed (0.1.x) has no way to be
  guessed safely: `upgrade` **refuses to run** on it instead of assuming
  `both`, because that would install an entire second adapter's worth of
  files as untracked additions a plain `git checkout .` can't undo. Pass
  `--client copilot|claude|both` once — matching whichever adapter(s) the
  repo actually has — and it's recorded for good; every `upgrade` after that
  is unaffected.

## 0.1.x

Predates `homeroClient`. `upgrade` will not run against a repo still on this
line — see the entry above.
