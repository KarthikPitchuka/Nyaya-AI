import assert from 'node:assert/strict';
import test from 'node:test';
import { buildActIndex, searchActIndex } from '../src/services/legalKnowledge.service.js';

const index = buildActIndex([
    {
        fileName: 'consumer-act.json',
        act: {
            'Act Title': 'Consumer Protection Act, 2019',
            'Act ID': 'ACT NO. 35 OF 2019',
            Chapters: {
                0: {
                    ID: 'CHAPTER II',
                    Name: 'CONSUMER RIGHTS',
                    Sections: {
                        'Section 2.': {
                            heading: 'Definitions',
                            paragraphs: { 0: 'A consumer purchases goods or hires services for consideration.' }
                        },
                        'Section 35.': {
                            heading: 'Manner of filing complaint',
                            paragraphs: { 0: 'A consumer may file a complaint before the District Commission.' }
                        },
                        'Section 39.': {
                            heading: 'Findings of District Commission',
                            paragraphs: { 0: 'The Commission may order the opposite party to return the price paid to the complainant.' }
                        }
                    }
                }
            }
        }
    },
    {
        fileName: 'motor-vehicles-act.json',
        act: {
            'Act Title': 'Motor Vehicles Act, 1988',
            Sections: {
                'Section 166.': {
                    heading: 'Application for compensation',
                    paragraphs: { 0: 'A claim for compensation may be made following a road accident.' }
                }
            }
        }
    },
    {
        fileName: 'consumer-protection-act-1986.json',
        act: {
            'Act Title': 'THE CONSUMER PROTECTION ACT, 1986',
            'Act ID': 'ACT NO. 68 OF 1986',
            Sections: {
                'Section 12.': {
                    heading: 'Manner in which complaint shall be made.',
                    paragraphs: { 0: 'A consumer may make a complaint before a Consumer Disputes Redressal Forum.' }
                }
            }
        }
    }
]);

test('retrieves relevant provisions and preserves their Act and chapter citations', () => {
    const results = searchActIndex(index, 'How can a consumer file a complaint before the District Commission?', 2);

    assert.equal(results[0].actTitle, 'Consumer Protection Act, 2019');
    assert.ok(results.some(result => result.section === 'Section 35'));
    assert.ok(results.every(result => result.context === 'CHAPTER II / CONSUMER RIGHTS'));
});

test('expands consumer refund queries to matching statutory remedy language', () => {
    const results = searchActIndex(index, 'consumer refund for defective goods', 8);

    const remedy = results.find(result => result.section === 'Section 39');
    assert.ok(remedy);
    assert.match(remedy.text, /return the price paid/);
});

test('prefers a newer version when Acts share a title, unless the query asks for the older Act', () => {
    const currentResults = searchActIndex(index, 'consumer complaint', 5);
    const historicalResults = searchActIndex(index, 'consumer complaint under the 1986 Act', 5);

    assert.equal(currentResults[0].actTitle, 'Consumer Protection Act, 2019');
    assert.ok(historicalResults.some(result => result.actTitle.includes('1986')));
});

test('returns no legal citations when the query has no matching terms', () => {
    assert.deepEqual(searchActIndex(index, 'zzzzxxyy qqqvvv', 5), []);
});

test('extracts sections from both top-level and chapter-organized Acts', () => {
    assert.equal(index.documents.length, 5);
});
