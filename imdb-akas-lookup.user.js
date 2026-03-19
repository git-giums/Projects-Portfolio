// ==UserScript==
// @name         IMDB AKAs Lookup
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Extracts a title's IMDB ID from a content review page and opens the IMDB release info / AKAs page directly in a new tab. Falls back to an OMDB API title search if no IMDB ID is present on the page.
// @author       giums
// @match        *://your-platform-domain.com/tasks/*
// @grant        GM_xmlhttpRequest
// ==/UserScript==

// -------------------------------------------------------------------
// SETUP
// 1. Replace the @match URL above with your moderation platform's domain.
// 2. Set your OMDB API key below (free key at https://www.omdbapi.com/apikey.aspx).
// 3. Adapt the DOM selectors in extractTitleInfo() to match your platform's
//    page structure if needed.
// -------------------------------------------------------------------

(function() {
    'use strict';

    const OMDB_API_KEY = "YOUR_OMDB_API_KEY_HERE"; // <-- replace with your key

    const cleanText = (text) => {
        if (!text) return null;
        return text.trim().normalize('NFKC');
    };

    function extractTitleInfo() {
        return new Promise((resolve) => {
            // -------------------------------------------------------------------
            // Adapt these selectors to match your platform's DOM structure.
            // The script looks for labelled table rows and a copy-text container
            // to extract title metadata (title, year, runtime, genre, etc.).
            // -------------------------------------------------------------------
            const getLabelledValue = (labelText) => {
                const rows = document.querySelectorAll('tr.metadata-row');
                for (let row of rows) {
                    const labelCell = row.querySelector('td.label-cell span');
                    if (labelCell && labelCell.textContent === labelText) {
                        const container = row.querySelector('[data-testid="copyTextContainer"]');
                        if (container) return cleanText(container.textContent);
                    }
                }
                return null;
            };

            let titleInfo = {
                imdbId:    null,
                title:     null,
                year:      null,
                runtime:   null,
                genre:     null,
                director:  null,
                cast:      [],
                country:   null
            };

            const maxAttempts = 10;
            let attempts = 0;

            const checkForInfo = setInterval(() => {
                attempts++;
                try {
                    // -------------------------------------------------------------------
                    // Replace the selector below with whatever your platform uses to
                    // surface the IMDB ID as a clickable or copyable link.
                    // -------------------------------------------------------------------
                    const imdbIdLink = document.querySelector('[data-testid="imdb-id-link"]');
                    titleInfo.imdbId = imdbIdLink ? cleanText(imdbIdLink.textContent) : null;

                    titleInfo.title   = getLabelledValue('Title');
                    titleInfo.runtime = getLabelledValue('Runtime');
                    titleInfo.genre   = getLabelledValue('Genre');

                    const releaseDate = getLabelledValue('Release Date');
                    if (releaseDate) titleInfo.year = releaseDate.split('/')[2];

                    titleInfo.country  = getLabelledValue('Country of Origin');
                    titleInfo.director = getLabelledValue('Contributors');

                    const cast = getLabelledValue('Cast');
                    if (cast) titleInfo.cast = cast.split(',').slice(0, 3).map(cleanText);

                    if ((titleInfo.title || titleInfo.imdbId) || attempts >= maxAttempts) {
                        clearInterval(checkForInfo);
                        resolve(titleInfo);
                    }
                } catch (e) {
                    console.error('Error extracting title info:', e);
                    if (attempts >= maxAttempts) {
                        clearInterval(checkForInfo);
                        resolve(null);
                    }
                }
            }, 1000);
        });
    }

    function lookupAndOpen(titleInfo) {
        if (titleInfo.imdbId) {
            openAKAsPage(titleInfo.imdbId);
            return;
        }

        const searchUrl = `https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&t=${encodeURIComponent(titleInfo.title)}` +
            (titleInfo.year ? `&y=${titleInfo.year}` : '');

        console.log('IMDB AKAs: searching OMDB for', titleInfo.title);

        GM_xmlhttpRequest({
            method: 'GET',
            url: searchUrl,
            onload: function(response) {
                const data = JSON.parse(response.responseText);
                if (data.Response === 'True') {
                    console.log('IMDB AKAs: found IMDB ID', data.imdbID);
                    openAKAsPage(data.imdbID);
                } else {
                    alert('Title not found on OMDB: ' + data.Error);
                }
            }
        });
    }

    function openAKAsPage(imdbId) {
        window.open(`https://www.imdb.com/title/${imdbId}/releaseinfo/?ref_=tt_dt_aka#akas`, '_blank');
    }

    // --- Button ---
    const btn = document.createElement('button');
    btn.textContent = 'IMDB AKAs';
    btn.style.cssText = `
        position: fixed; bottom: 15px; right: 25%;
        z-index: 9999; padding: 10px;
        background: #f0f0f0; border: 1px solid #ccc; cursor: pointer;
        font-size: 13px; border-radius: 4px;
    `;

    btn.addEventListener('click', async () => {
        const titleInfo = await extractTitleInfo();
        if (titleInfo && (titleInfo.title || titleInfo.imdbId)) {
            lookupAndOpen(titleInfo);
        } else {
            alert("Couldn't find title information on this page. Make sure the page is fully loaded.");
        }
    });

    document.body.appendChild(btn);
})();
