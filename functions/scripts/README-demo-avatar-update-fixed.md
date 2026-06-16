# LifeRecompiled demo avatar update — fixed

This fixed script matches the actual user IDs created by `seedFullDemoData.cjs`.

Actual seed users:
- demo_luka_backend
- demo_mina_frontend
- demo_sara_ux
- demo_nikola_devops
- demo_ana_product
- demo_marko_fullstack

Run from project root:

```bash
unzip -o ~/Downloads/liferecompiled-demo-avatar-update-fixed.zip -d functions/scripts
node --check functions/scripts/updateDemoAvatars.cjs
cd functions
node scripts/updateDemoAvatars.cjs --confirm-production
cd ..
```
