# Third-Party Notices

This repository bundles third-party work. The repository's own [LICENSE](LICENSE) (MIT)
covers the original material here; it does **not** override the terms below. If you
redistribute this repository or install these skills elsewhere, these obligations travel
with the files.

Two of the components are **not** MIT — one is Apache-2.0 and one is **CC-BY-SA-4.0**
(share-alike). Read the wordfreq section before reusing the data file.

---

## 1. slop-score — Sam Paech

**Upstream:** https://github.com/sam-paech/slop-score
**Copyright:** © 2025 Sam Paech
**License:** MIT (see split below for the wordfreq components)

**Bundled at:**
- `skills/slop-score/scripts/slop-score/`
- `skills/slop-analyzer/scripts/slop-score/`

**Modifications made in this repository:**
- Ported from browser JavaScript to TypeScript for the Bun runtime
- Restructured as a CLI (`src/analyze.ts`) rather than an in-browser tool
- Added a test suite under `src/__tests__/`
- Packaged as [Agent Skills](https://agentskills.io/) with `SKILL.md` wrappers
- Bundled to a single self-contained `analyze.js` via `build.sh`

### MIT License

> Copyright (c) 2025 Sam Paech
>
> Permission is hereby granted, free of charge, to any person obtaining a copy of this
> software and associated documentation files (the "Software"), to deal in the Software
> without restriction, including without limitation the rights to use, copy, modify, merge,
> publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons
> to whom the Software is furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in all copies or
> substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
> INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
> PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE
> FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
> OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
> DEALINGS IN THE SOFTWARE.

The MIT terms cover the slop-score computation, the slop word/bigram/trigram lists, the
human writing profile dataset, and the CLI code — **except** the wordfreq components below.

---

## 2. wordfreq — Robyn Speer

The word-frequency lookup is derived from the `wordfreq` project and is **separately
licensed**. Upstream splits it as follows, and that split is preserved here.

**Citation:**
> Robyn Speer. (2022). rspeer/wordfreq: v3.0 (v3.0.2). Zenodo.
> https://doi.org/10.5281/zenodo.7199437

**Upstream:** https://github.com/rspeer/wordfreq

### 2a. Code — Apache License 2.0

**Files:**
- `skills/slop-score/scripts/slop-score/src/lib/wordfreq.ts`
- `skills/slop-analyzer/scripts/slop-score/src/lib/wordfreq.ts`

Derived from upstream `js/wordfreq.js`, itself a port of the original Python library.

**Statement of changes** (required by Apache-2.0 §4b): these files are a TypeScript port of
the upstream JavaScript, adapted for the Bun runtime. Behavior is intended to match the
original; structure and typing differ.

Full license text: https://www.apache.org/licenses/LICENSE-2.0

Apache-2.0 requires that you retain the copyright, patent, trademark, and attribution
notices from the source, include a copy of the license with any redistribution, and state
that you changed the files.

### 2b. Data — CC-BY-SA-4.0 ⚠️

**Files:**
- `skills/slop-score/scripts/slop-score/data/large_en.msgpack.gz`
- `skills/slop-analyzer/scripts/slop-score/data/large_en.msgpack.gz`

Full license text: https://creativecommons.org/licenses/by-sa/4.0/legalcode

**This is the obligation most easily missed.** CC-BY-SA-4.0 is a *share-alike* license: if
you redistribute this data file, or distribute an adapted version of it, you must give
attribution (the Zenodo citation above) **and** license the adapted material under
CC-BY-SA-4.0 or a compatible license. You cannot silently fold it into an MIT-licensed
distribution.

If you want a permissively licensed build of these skills, remove `large_en.msgpack.gz` and
supply your own frequency data.

---

## 3. Tailwind CSS reference material

**Skill:** `skills/tailwind-css/`

Reference documentation summarizing Tailwind CSS v4 utilities, derived from the official
Tailwind CSS documentation.

**Upstream:** https://tailwindcss.com/docs — Tailwind Labs, MIT licensed.

---

## Summary

| Component | License | Share-alike? |
|---|---|---|
| This repository's own work | MIT | No |
| slop-score core + datasets | MIT (© Sam Paech) | No |
| `wordfreq.ts` | Apache-2.0 | No — but requires notices + statement of changes |
| `large_en.msgpack.gz` | **CC-BY-SA-4.0** | **Yes** |
| Tailwind reference docs | MIT (Tailwind Labs) | No |

If anything here is inaccurate or an attribution is missing, please open an issue — it will
be corrected.
