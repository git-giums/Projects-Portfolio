// ==UserScript==
// @name         Verbal References Severity Calculator
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Scans the text content of a content review page and flags verbal references across four categories — Violence, Sexuality, Substance Use, and Smoking — each mapped to a severity level (7+ / 13+ / 16+). Results are displayed in a floating panel.
// @author       giums
// @match        *://your-platform-domain.com/*
// @grant        none
// ==/UserScript==

// -------------------------------------------------------------------
// CONFIGURATION
// Replace the @match URL above with the domain of your moderation tool.
// Word lists and severity thresholds are defined in the constructor below
// and can be extended freely.
// -------------------------------------------------------------------

(function() {
    'use strict';

    class VerbRefsCalculator {
        constructor() {
            // --- Violence ---
            this.violenceCategories = {
                'Rape references (13+ Moderate)': new Set([
                    'rape', 'rapist'
                ]),
                'Violence references (13+ detailed harm/death/suicide | 7+ war narrative)': new Set([
                    'murder', 'kill', 'homicide', 'torture', 'suicide', 'dead', 'stabbed', 'wounded', 'bleeding',
                    'gunshot', 'gun', 'rifle', 'bomb', 'weapon', 'bullet', 'explosion', 'explosive', 'shooting',
                    'crime', 'handcuff'
                ])
            };

            // --- Sexuality ---
            this.sexualityCategories = {
                'Sexual References (16+ Strong)': new Set([
                    'horny', 'moan', 'lust', 'blow job', 'blow me', 'intercourse', 'masturbate', 'masturbat',
                    'orgasm', 'cumming', 'cum', 'bdsm', 'sodomized', 'sodomy', 'jerk off', 'jerking', 'jerked',
                    'wank', 'wanking', 'fingered'
                ]),
                'Sexual References (13+ Moderate)': new Set([
                    'sexual', 'sexually', 'sexuality', 'penis', 'vagina', 'breast', 'breasts', 'vaginal',
                    'banging', 'banged', 'bang', 'copulation', 'dick', 'dicks', 'cock', 'cocks', 'pussy',
                    'cunt', 'anal', 'anus', 'scrotum', 'testicles', 'clitoris', 'clit', 'dildo', 'vibrator',
                    'schlong', 'wiener', 'dong', 'balls', 'sperm', 'boner', 'erectile', 'erection', 'pounding',
                    'screwing', 'boning', 'threesome', 'orgy', 'prostitut', 'hooker', 'whore', 'pimp',
                    'sex worker', 'gigalo', 'strip club', 'stripper', 'stripping', 'pornography', 'porn',
                    'brothel', 'boob', 'boobies', 'tit', 'titties', 'butt', 'crotch'
                ]),
                'Sexual References (7+ Mild)': new Set([
                    'kiss', 'kissed', 'love', 'lover', 'hot', 'sexy', 'sleep', 'slept', 'make out', 'pregnan',
                    'virgin', 'nude', 'naked', 'underwear', 'bra', 'thong', 'pantyhose', 'cleavage', 'hump',
                    'playboy', 'fetish', 'perver', 'gag', 'spank', 'lick', 'seduce'
                ])
            };

            // --- Substance Use ---
            this.substanceCategories = {
                'Illegal drugs (13+ Moderate)': new Set([
                    'meth', 'methamphetamine', 'crystal meth', 'cocaine', 'heroin', 'crack', 'lsd', 'ecstasy',
                    'mdma', 'weed', 'marijuana', 'cannabis', 'dope', 'acid', 'drug', 'pot', 'hash', 'opium',
                    'morphine', 'fentanyl', 'controlled substance', 'nose candy', 'blunt', 'shrooms', 'ganja',
                    'indica', 'sativa', 'scag', 'pill', 'lysergic acid diethylamid', 'opiat'
                ]),
                'Prescription drug abuse (13+ Moderate)': new Set([
                    'prescription', 'alprazolam', 'anxiolyt', 'xanax', 'codeine', 'narcotic', 'diacetylmorphin',
                    'opiat', 'deoxyephedrin'
                ]),
                'Alcohol references': new Set([
                    'alcohol', 'drunk', 'beer', 'wine', 'liquor', 'whiskey', 'whisky', 'rum', 'gin', 'vodka',
                    'tequila', 'champagne', 'martini', 'margarita', 'cocktail', 'bourbon', 'moonshine', 'booze',
                    'liqueur', 'bloody mari', 'pink lady', 'aqua vita', 'brewery', 'ferment'
                ])
            };

            // --- Smoking ---
            this.smokingCategory = {
                'Smoking references': new Set([
                    'tobacco', 'cigar', 'cigarette', 'smoke'
                ])
            };
        }

        getSeverityColor(severity) {
            if (severity.includes('16+')) return '#fd7e14';
            if (severity.includes('13+')) return '#ffc107';
            if (severity.includes('7+'))  return '#28a745';
            return '#20c997';
        }

        scanContent(content) {
            const matches = {};

            const processCategory = (categories, categoryType) => {
                matches[categoryType] = {};
                for (const [categoryName, words] of Object.entries(categories)) {
                    matches[categoryType][categoryName] = new Map();
                    for (const word of words) {
                        const regex = new RegExp(`\\b${word}\\b`, 'gi');
                        let count = 0;
                        while (regex.exec(content) !== null) count++;
                        if (count > 0) matches[categoryType][categoryName].set(word, count);
                    }
                }
            };

            processCategory(this.violenceCategories,  'Violence');
            processCategory(this.sexualityCategories, 'Sexuality');
            processCategory(this.substanceCategories, 'Substance Use');
            processCategory(this.smokingCategory,     'Smoking');

            return matches;
        }

        generateResultsHTML(matches) {
            let html = `<div style="margin-bottom:15px;border-bottom:1px solid #eee;"></div>`;

            const renderCategory = (categoryMatches, title) => {
                let inner = '';
                let hasContent = false;

                for (const [subCategory, words] of Object.entries(categoryMatches)) {
                    if (words.size > 0) {
                        hasContent = true;
                        const severity = subCategory.match(/\(\d+\+[^)]*\)/)?.[0] || '';
                        const color = this.getSeverityColor(severity);
                        const wordsList = Array.from(words.entries())
                            .map(([w, c]) => c > 1 ? `${w} (${c})` : w)
                            .join(', ');
                        inner += `
                            <div style="margin-bottom:10px;">
                                <strong style="color:${color}">${subCategory}:</strong><br>${wordsList}
                            </div>`;
                    }
                }

                return hasContent
                    ? `<div style="margin-bottom:15px;"><strong>${title}</strong>${inner}</div>`
                    : '';
            };

            for (const [type, categoryMatches] of Object.entries(matches)) {
                html += renderCategory(categoryMatches, type);
            }
            return html;
        }

        addCalculateButton() {
            const navInterval = setInterval(() => {
                const nav = document.querySelector('nav');
                if (nav) {
                    clearInterval(navInterval);
                    this.insertCalculatorElements(nav);
                }
            }, 1000);
        }

        insertCalculatorElements(nav) {
            const container = document.createElement('div');
            container.style.cssText = `
                display: flex; position: absolute;
                right: 265px; top: 50%; transform: translateY(-50%);
            `;

            const button = document.createElement('button');
            button.innerHTML = '📜 VerbRefs';
            button.style.cssText = `
                padding: 4px 8px; background: transparent; color: #fff;
                border: 1px solid #ffffff40; border-radius: 4px;
                cursor: pointer; font-size: 14px; margin-right: 8px;
                transition: background-color 0.2s;
            `;

            const resultsDiv = document.createElement('div');
            resultsDiv.id = 'verbrefs-results';
            resultsDiv.style.cssText = `
                position: fixed; right: 265px; top: 60px;
                background: white; padding: 15px;
                border: 1px solid #ddd; border-radius: 4px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                max-width: 300px; max-height: 400px;
                overflow-y: auto; display: none; z-index: 9999;
            `;

            button.addEventListener('mouseover', () => { button.style.backgroundColor = '#ffffff20'; });
            button.addEventListener('mouseout',  () => { button.style.backgroundColor = 'transparent'; });

            button.addEventListener('click', () => {
                if (resultsDiv.style.display === 'none') {
                    try {
                        const matches = this.scanContent(document.body.innerText);
                        resultsDiv.innerHTML = this.generateResultsHTML(matches);
                        resultsDiv.style.display = 'block';
                    } catch (error) {
                        resultsDiv.innerHTML = `
                            <div style="color:#856404;background:#fff3cd;padding:10px;border:1px solid #ffeeba;border-radius:4px;">
                                ${error.message.replace(/\n/g, '<br>')}
                            </div>`;
                        resultsDiv.style.display = 'block';
                    }
                } else {
                    resultsDiv.style.display = 'none';
                }
            });

            container.appendChild(button);
            nav.appendChild(container);
            document.body.appendChild(resultsDiv);
        }
    }

    const calculator = new VerbRefsCalculator();
    calculator.addCalculateButton();
})();
