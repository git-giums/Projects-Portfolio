// ==UserScript==
// @name         Foul Language Severity Calculator
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Automatically calculates foul language severity rating from a content moderation review page. Categorises detected words and outputs a severity level (All Ages / 7+ / 13+ / 16+ / 18+) based on configurable word lists and thresholds.
// @author       giums
// @match        *://your-platform-domain.com/*
// @grant        none
// ==/UserScript==

// -------------------------------------------------------------------
// CONFIGURATION
// Replace the @match URL above with the domain of your moderation tool.
// The script reads word-count buttons rendered in the Language review tab.
// Update the CSS selectors in parseWordsFromPage() to match your platform's
// DOM structure if needed.
// -------------------------------------------------------------------

(function() {
    'use strict';

    class FoulLanguageCalculator {
        constructor() {
            // Severity level labels
            this.Severity = {
                ALL_AGES: 'ALL AGES',
                MILD_7PLUS: 'MILD 7+',
                MODERATE_13PLUS: 'MODERATE 13+',
                STRONG_16PLUS: 'STRONG 16+',
                SEVERE_18PLUS: 'SEVERE 18+'
            };

            // Slurs — single use → 16+, multiple uses → 18+
            this.slurWords = new Set([
                'fag', 'faggot', 'faggy',
                'nigger', 'nigga', 'nikka',
                'dyke', 'chink', 'chinky',
                'coon', 'gook', 'jigaboo',
                'spic', 'kike', 'paki',
                'jap', 'japs', 'wog',
                'towelhead', 'raghead'
            ]);

            // Single instance → 13+
            this.moderateSingleWords = new Set([
                'cunt', 'fuck', 'pussy',
                'cock', 'cum', 'twat'
            ]);

            // Up to 10 combined instances → 13+, more than 10 → 16+
            this.moderateWords = new Set([
                'asshole', 'ass hat', 'ass clown',
                'bitch', 'piss', 'dick', 'dickhead',
                'bastard', 'bullshit', 'hoe', 'ho',
                'schlong', 'skank', 'slut', 'whore',
                'wank', 'bellend', 'bollocks', 'shag',
                'tits', 'penis', 'clit', 'clitoris',
                'shit', 'shitty', 'scumbag',
                'jackass', 'douche', 'retard', 'gay', 'queer'
            ]);

            // Single instance → 7+
            this.mildSingleWords = new Set([
                'ass', 'arse', 'damn',
                'jerk', 'prick', 'scum'
            ]);

            // Up to 3 combined instances → 7+
            this.mildThreeWords = new Set([
                'crap', 'hell', 'suck', 'blow',
                'shut up', 'idiot', 'stupid',
                'freak', 'oh my god', 'omg',
                'badass', 'kickass', 'dumbass'
            ]);

            // Up to 3 combined instances → All Ages
            this.veryMildWords = new Set([
                'shoot', 'heck', 'darn',
                'crud', 'dang'
            ]);
        }

        isDamnVariation(word) {
            if (word === 'damn') return false;
            return word.toLowerCase().includes('damn');
        }

        parseWordsFromPage() {
            // -------------------------------------------------------------------
            // Adapt this selector to match your platform's word-filter UI element.
            // The script expects a container element that holds buttons in the
            // format: "word (count)" — e.g. "hell (3)".
            // -------------------------------------------------------------------
            const filterText = Array.from(document.querySelectorAll('*')).find(
                element => element.textContent === 'Select a word to filter the language clips...'
            );

            if (!filterText || !filterText.isConnected) {
                throw new Error('⚠️ Please follow these steps:\n\n' +
                    '1. Click the "Language" tab\n' +
                    '2. Wait for the word filter to appear\n' +
                    '3. Make sure you see the word filter prompt\n' +
                    '4. Try calculating again');
            }

            const wordCounts = new Map();

            // -------------------------------------------------------------------
            // Replace '.word-filter-container' with the selector for your
            // platform's word-list container.
            // -------------------------------------------------------------------
            const filterContainer = document.querySelector('.word-filter-container');

            if (!filterContainer) {
                throw new Error('No word filters found. Please wait for words to load completely.');
            }

            const buttons = filterContainer.querySelectorAll('button');
            if (buttons.length === 0) {
                return new Map(); // No words found → All Ages
            }

            buttons.forEach(button => {
                const text = button.textContent.trim();
                const match = text.match(/^(.*?)\s*\((\d+)\)$/);
                if (match) {
                    const word = match[1].toLowerCase().replace(/_/g, ' ');
                    const count = parseInt(match[2]);
                    wordCounts.set(word, count);
                }
            });

            return wordCounts;
        }

        calculateSeverity(wordCounts) {
            if (wordCounts.size === 0) {
                return this.Severity.ALL_AGES;
            }

            const tally = {
                slurCount: 0,
                moderateSingleCount: 0,
                moderateCount: 0,
                standaloneDamnCount: 0,
                damnVariationsCount: 0,
                mildSingleCount: 0,
                mildThreeCount: 0,
                veryMildCount: 0
            };

            for (const [word, count] of wordCounts.entries()) {
                if (this.slurWords.has(word)) {
                    tally.slurCount += count;
                } else if (this.moderateSingleWords.has(word)) {
                    tally.moderateSingleCount += count;
                } else if (word === 'damn') {
                    tally.standaloneDamnCount += count;
                } else if (this.isDamnVariation(word)) {
                    tally.damnVariationsCount += count;
                } else if (this.moderateWords.has(word)) {
                    tally.moderateCount += count;
                } else if (this.mildSingleWords.has(word)) {
                    tally.mildSingleCount += count;
                } else if (this.mildThreeWords.has(word)) {
                    tally.mildThreeCount += count;
                } else if (this.veryMildWords.has(word)) {
                    tally.veryMildCount += count;
                }
            }

            // 18+
            if (tally.slurCount > 1) return this.Severity.SEVERE_18PLUS;

            // 16+
            if (tally.slurCount === 1 || tally.moderateCount > 10) return this.Severity.STRONG_16PLUS;

            // 13+
            if (
                tally.moderateSingleCount > 0 ||
                (tally.moderateCount > 0 && tally.moderateCount <= 10) ||
                tally.mildSingleCount > 1 ||
                tally.mildThreeCount > 3 ||
                tally.standaloneDamnCount > 1 ||
                tally.damnVariationsCount > 0
            ) return this.Severity.MODERATE_13PLUS;

            // 7+
            if (
                tally.mildSingleCount === 1 ||
                (tally.mildThreeCount > 0 && tally.mildThreeCount <= 3) ||
                tally.standaloneDamnCount === 1 ||
                tally.veryMildCount > 3
            ) return this.Severity.MILD_7PLUS;

            // All Ages
            if (tally.veryMildCount > 0 && tally.veryMildCount <= 3) return this.Severity.ALL_AGES;

            return this.Severity.ALL_AGES;
        }

        getSeverityColor(severity) {
            switch (severity) {
                case this.Severity.SEVERE_18PLUS:    return '#dc3545';
                case this.Severity.STRONG_16PLUS:    return '#fd7e14';
                case this.Severity.MODERATE_13PLUS:  return '#ffc107';
                case this.Severity.MILD_7PLUS:       return '#28a745';
                case this.Severity.ALL_AGES:         return '#20c997';
                default:                             return '#000000';
            }
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
            container.style.display = 'inline-block';
            container.style.position = 'absolute';
            container.style.right = '170px';
            container.style.top = '50%';
            container.style.transform = 'translateY(-50%)';

            const button = document.createElement('button');
            button.textContent = '🔍 FL Calc';
            button.style.padding = '3px 9px';
            button.style.backgroundColor = 'transparent';
            button.style.color = '#fff';
            button.style.border = '1px solid #ffffff40';
            button.style.borderRadius = '4px';
            button.style.cursor = 'pointer';
            button.style.fontSize = '15px';
            button.style.marginRight = '9px';
            button.style.transition = 'background-color 0.2s';

            const resultsDiv = document.createElement('div');
            resultsDiv.id = 'fl-results';
            resultsDiv.style.cssText = `
                position: fixed; right: 20px; top: 60px;
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
                        const wordCounts = this.parseWordsFromPage();
                        const severity = this.calculateSeverity(wordCounts);
                        const severityColor = this.getSeverityColor(severity);

                        let resultsHTML = `
                            <div style="margin-bottom:10px;">
                                <span style="font-size:18px;font-weight:bold;color:${severityColor};">${severity}</span>
                            </div>
                            <div style="margin-bottom:15px;border-bottom:1px solid #eee;"></div>
                        `;

                        const categories = {
                            'Severe 18+':                   { words: [], style: 'color:#dc3545' },
                            'Strong 16+':                   { words: [], style: 'color:#fd7e14' },
                            'Moderate 13+ (1 instance)':    { words: [], style: 'color:#ffc107' },
                            'Moderate 13+ (10 instances)':  { words: [], style: 'color:#ffc107' },
                            'Mild (1 instance)':            { words: [], style: 'color:#28a745' },
                            'Mild (3 instances)':           { words: [], style: 'color:#28a745' },
                            'Very Mild (3 instances)':      { words: [], style: 'color:#20c997' }
                        };

                        wordCounts.forEach((count, word) => {
                            if (this.slurWords.has(word)) {
                                categories[count > 1 ? 'Severe 18+' : 'Strong 16+'].words.push(`${word} (${count})`);
                            } else if (this.moderateSingleWords.has(word)) {
                                categories['Moderate 13+ (1 instance)'].words.push(`${word} (${count})`);
                            } else if (this.moderateWords.has(word) || this.isDamnVariation(word)) {
                                categories['Moderate 13+ (10 instances)'].words.push(`${word} (${count})`);
                            } else if (this.mildSingleWords.has(word)) {
                                categories['Mild (1 instance)'].words.push(`${word} (${count})`);
                            } else if (this.mildThreeWords.has(word)) {
                                categories['Mild (3 instances)'].words.push(`${word} (${count})`);
                            } else if (this.veryMildWords.has(word)) {
                                categories['Very Mild (3 instances)'].words.push(`${word} (${count})`);
                            }
                        });

                        for (const [category, data] of Object.entries(categories)) {
                            if (data.words.length > 0) {
                                resultsHTML += `
                                    <div style="margin-bottom:10px;">
                                        <strong style="${data.style}">${category}:</strong><br>
                                        ${data.words.join(', ')}
                                    </div>
                                `;
                            }
                        }

                        resultsDiv.innerHTML = resultsHTML;
                        resultsDiv.style.display = 'block';
                    } catch (error) {
                        resultsDiv.innerHTML = `
                            <div style="color:#856404;background:#fff3cd;padding:10px;border:1px solid #ffeeba;border-radius:4px;">
                                ${error.message.replace(/\n/g, '<br>')}
                            </div>
                        `;
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

    const calculator = new FoulLanguageCalculator();
    calculator.addCalculateButton();
})();
