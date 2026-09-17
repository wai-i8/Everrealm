Everrealm Defeat + Revive Fix
=============================
Base: Everrealm-encounter-revive-hotfix

Changes:
- Fix recovery buttons remaining disabled after a successful revive, which locked the second death.
- Reset recovery lifecycle on every new death and invalidate stale recovery responses.
- Treat HP=0 as a real authoritative death state; battle start no longer converts 0 HP to max HP.
- Server rejects battle start with player-dead while HP is 0.
- Equipment changes preserve HP=0 instead of silently raising it to 1.
- Refresh-at-0HP encounter attempts reopen the recovery UI instead of entering battle.
- Redesign defeat modal: DEFEATED title, compact fantasy panel, responsive buttons.
- Keeps the previous shared encounter-mask validation for all field random encounters.

Deployment:
- Overlay this ZIP onto the project root.
- Redeploy Firebase Functions because functions/server-game.js changed.
