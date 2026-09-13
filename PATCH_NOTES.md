# PATCH NOTES

Base: `66dbb471df8901a942f0ddc0252cc431623daffe`

- Fix legacy coordinate truncation in `Core.sanitizeSave`.
- Add stable animation-independent monster visual bounds.
- Battle nameplates use stable sprite top metadata instead of per-frame top.
- Split BGM/SFX mute state into independent persisted settings.
- Add a dedicated SFX speaker button.
- Footsteps follow dedicated SFX mute state.
- Bump runtime cache keys for touched modules.
- Update focused regression tests.
