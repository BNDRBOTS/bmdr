# Wrong-target changes previously written to `main`

No cleanup action is performed by this package.

The seven commits written to `BNDRBOTS/bmdr` default `main` were:

1. `b8b743e3d355aba64e25e8d0a78f672416728bc6`
2. `23b6e9766d8df8302183ce74274898d7270450da`
3. `5357ee515d2a358246d95befa5e9853e96eb7c0d`
4. `8b5e118e18c08d8409751b887be00bffd1bbccdf`
5. `02ea00a28c6bcf32a8afda31f62b971e490b410c`
6. `a82a93f0ddd31c880a41c3142a49fea785cf1832`
7. `07a090abc2ee085459f6deae6875d57d1d93d3cc`

The pre-change `main` head was:

`a3fc52801e6f5a88729cb44a603b92b68d4f8ad3`

A history-preserving local cleanup, only when intentionally performed by the repository owner, is:

```bash
git switch main
git pull --ff-only
git revert --no-edit \
  07a090abc2ee085459f6deae6875d57d1d93d3cc \
  a82a93f0ddd31c880a41c3142a49fea785cf1832 \
  02ea00a28c6bcf32a8afda31f62b971e490b410c \
  8b5e118e18c08d8409751b887be00bffd1bbccdf \
  5357ee515d2a358246d95befa5e9853e96eb7c0d \
  23b6e9766d8df8302183ce74274898d7270450da \
  b8b743e3d355aba64e25e8d0a78f672416728bc6
git push origin main
```

Review the diff before pushing. Do not force-reset a shared branch.
