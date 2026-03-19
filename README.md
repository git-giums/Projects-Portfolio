# Content Moderation Userscripts

A collection of Tampermonkey userscripts built to automate repetitive tasks in content compliance workflows. Designed for analysts reviewing film and TV series scripts and metadata on web-based moderation platforms.

---

## Scripts

### 🔍 Foul Language Severity Calculator

Calculates the **age rating severity of foul language** found in a film or TV episode script, based on international streaming compliance standards (UK, US, DE, JP).

The script reads detected words and their occurrence counts directly from the review interface, then applies a tiered severity logic to output a final rating:

| Rating | Threshold |
|---|---|
| All Ages | Very mild expressions only (≤ 3 instances) |
| 7+ | Mild language, single instances |
| 13+ | Moderate language or repeated mild terms |
| 16+ | Strong language or isolated slurs |
| 18+ | Multiple slur usage |

Words are classified into five internal tiers (slurs, moderate-single, moderate, mild-single, mild), each with independent count thresholds. The result and a full word breakdown are shown in a floating panel injected into the platform's navigation bar.

**Adapting to your platform:** update the `@match` URL and the CSS selector in `parseWordsFromPage()` to point at your platform's word-filter container.

---

### 📜 Verbal References Severity Calculator

Scans the full text content of a script review page and flags **verbal references to potentially sensitive themes**, categorised by content type and severity level.

Covers four categories:

- **Violence** — references to harm, death, weapons, and suicide
- **Sexuality** — from mild romantic language up to explicit references (mapped to 7+ / 13+ / 16+)
- **Substance Use** — illegal drugs, prescription drug abuse, and alcohol references
- **Smoking** — tobacco and cigarette references

Each matched word is shown with its occurrence count in a colour-coded floating panel. The word lists are defined as plain JavaScript `Set` objects in the constructor and can be extended freely.

**Adapting to your platform:** update the `@match` URL. No DOM selectors need changing — the script scans `document.body.innerText` directly.

---

### 🎬 IMDB AKAs Lookup

Instantly opens the **IMDB release info and international titles (AKAs) page** for the film or TV series currently open in the review interface.

The script extracts the title's IMDB ID directly from the page when available. If no IMDB ID is present, it falls back to a title + year search via the [OMDB API](https://www.omdbapi.com/) and redirects to the correct IMDB entry. This is useful for quickly verifying international release titles, original language titles, and regional distribution names during compliance checks.

**Adapting to your platform:**
1. Update the `@match` URL.
2. Set your OMDB API key (free at [omdbapi.com](https://www.omdbapi.com/apikey.aspx)).
3. Adjust the DOM selectors in `extractTitleInfo()` to match how your platform surfaces title metadata.

---

## Installation

1. Install the [Tampermonkey](https://www.tampermonkey.net/) browser extension.
2. Open Tampermonkey → *Create a new script*.
3. Paste the contents of the desired `.user.js` file.
4. Update the `@match` directive and any platform-specific selectors as described above.
5. Save — the script will activate automatically on matching pages.

---

## Requirements

- Tampermonkey (Chrome, Firefox, Edge, Safari)
- OMDB API key (for `imdb-akas-lookup` fallback search only — free tier is sufficient)

---

## Notes

These scripts were developed to automate manual lookup and calculation tasks in a professional content compliance context. They are platform-agnostic by design: all internal references have been replaced with configurable placeholders so they can be adapted to any web-based moderation tool.

---

## Author

[linkedin.com/in/gms7](https://linkedin.com/in/gms7) · [github.com/git-giums](https://github.com/git-giums)
