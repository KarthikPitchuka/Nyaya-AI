import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config();

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const defaultActsDirectory = path.join(backendRoot, 'data', 'annotatedCentralActs');
const legalSynonyms = new Map([
    ['refund', ['return', 'returned', 'reimbursement', 'reimburse', 'repayment', 'price', 'charges']],
    ['refunds', ['return', 'returned', 'reimbursement', 'reimburse', 'repayment', 'price', 'charges']],
    ['defective', ['defect', 'defects', 'quality', 'fitness', 'faulty']],
    ['defect', ['defective', 'defects', 'quality', 'fitness', 'faulty']],
    ['seller', ['trader', 'vendor', 'supplier', 'merchant', 'opposite party']],
    ['refusing', ['refuse', 'refused', 'refusal']],
    ['complaint', ['complainant', 'grievance', 'consumer dispute']],
    ['complaints', ['complainant', 'grievance', 'consumer dispute']],
    ['death', ['dead', 'killing', 'murder', 'homicide', 'culpable']],
    ['dead', ['death', 'killing', 'murder', 'homicide', 'culpable']],
    ['killed', ['killing', 'murder', 'homicide', 'culpable']],
    ['murder', ['killing', 'homicide', 'culpable', 'death']],
    ['homicide', ['murder', 'killing', 'culpable', 'death']]
]);
const legalIntentTerms = [
    {
        triggers: ['death', 'dead', 'killed', 'murder', 'homicide', 'manslaughter'],
        terms: ['death', 'killing', 'murder', 'homicide', 'culpable', 'manslaughter', 'causing death']
    },
    {
        triggers: ['rape', 'sexual', 'molest', 'harass'],
        terms: ['rape', 'sexual', 'assault', 'molest', 'harassment', 'modesty']
    },
    {
        triggers: ['theft', 'stolen', 'robbery', 'robbed', 'steal'],
        terms: ['theft', 'stolen', 'robbery', 'robbed', 'dishonestly', 'movable property']
    },
    {
        triggers: ['cheat', 'cheating', 'fraud', 'scam', '欺骗'],
        terms: ['cheating', 'fraud', 'dishonestly', 'deception', 'misappropriation']
    }
];
const stopWords = new Set([
    'about', 'above', 'after', 'again', 'against', 'all', 'also', 'am', 'an',
    'and', 'any', 'are', 'as', 'at', 'be', 'because', 'been', 'before', 'being',
    'below', 'between', 'both', 'but', 'by', 'can', 'could', 'did', 'do', 'does',
    'doing', 'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had',
    'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'him', 'his', 'how',
    'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'me', 'more', 'most',
    'my', 'myself', 'no', 'nor', 'not', 'now', 'of', 'off', 'on', 'once', 'only',
    'or', 'other', 'our', 'ours', 'out', 'over', 'own', 'same', 'she', 'should',
    'so', 'some', 'such', 'than', 'that', 'the', 'their', 'theirs', 'them',
    'themselves', 'then', 'there', 'these', 'they', 'this', 'those', 'through',
    'to', 'too', 'under', 'until', 'up', 'very', 'was', 'we', 'were', 'what',
    'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'will', 'with',
    'would', 'you', 'your', 'yours', 'yourself', 'yourselves', 'issue', 'legal',
    'need', 'please', 'problem', 'case', 'help', 'want', 'tell', 'happened', 'person'
]);

let indexPromise;
let missingDirectoryWarningShown = false;

const tokenize = (text) => (text.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) || [])
    .filter(token => token.length > 1 && !stopWords.has(token));
const actYear = (title) => Number(title.match(/\b(?:18|19|20)\d{2}\b/)?.[0] || 0);
const actFamily = (title) => title.toLocaleLowerCase()
    .replace(/^the\s+/, '')
    .replace(/\b(?:18|19|20)\d{2}\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
const extractIncidentDate = (query) => {
    const match = String(query || '').match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b|\b(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2})\b/);
    if (!match) return null;
    const year = Number(match[1] || match[6]);
    const month = Number(match[2] || match[4]);
    const day = Number(match[3] || match[5]);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
        ? date
        : null;
};

const isIpcOrBns = (title) => /\b(?:indian penal code|bharatiya nyaya sanhita|ipc|bns)\b/i.test(title);

const flattenText = (value) => {
    if (typeof value === 'string' || typeof value === 'number') return String(value);
    if (Array.isArray(value)) return value.map(flattenText).filter(Boolean).join('\n');
    if (!value || typeof value !== 'object') return '';

    return Object.entries(value)
        .filter(([key]) => !['footnotes', 'annotations', 'commentary'].includes(key.toLowerCase()))
        .map(([key, child]) => {
            const text = flattenText(child);
            return key === 'heading' || key === 'Name' || key === 'ID' ? `${text}` : text;
        })
        .filter(Boolean)
        .join('\n');
};

const makeDocument = (act, sectionName, section, context, fileName) => {
    const heading = typeof section?.heading === 'string' ? section.heading.trim() : '';
    const text = flattenText(section?.paragraphs ?? section).trim();
    if (!text) return null;

    return {
        actTitle: act['Act Title'] || path.basename(fileName, '.json'),
        actId: act['Act ID'] || '',
        section: sectionName.replace(/\.$/, ''),
        heading,
        context: context.join(' / '),
        fileName,
        text: text.slice(0, 10000),
        bodyLength: 0
    };
};

const sectionsFromAct = (act, fileName) => {
    const documents = [];

    const visit = (node, context = []) => {
        if (!node || typeof node !== 'object') return;
        for (const [key, value] of Object.entries(node)) {
            if (/^Section\s+/i.test(key)) {
                const document = makeDocument(act, key, value, context, fileName);
                if (document) documents.push(document);
                continue;
            }

            const nextContext = [];
            if (value && typeof value === 'object') {
                const id = typeof value.ID === 'string' ? value.ID.trim() : '';
                const name = typeof value.Name === 'string' ? value.Name.trim() : '';
                if (/^(chapter|part)\b/i.test(id)) nextContext.push(...context, id, name);
                else nextContext.push(...context);
            } else {
                nextContext.push(...context);
            }
            visit(value, nextContext);
        }
    };

    visit(act);
    return documents;
};

export const buildActIndex = (acts) => {
    const documents = acts.flatMap(({ act, fileName }) => sectionsFromAct(act, fileName));
    const documentFrequency = new Map();
    const postings = new Map();
    let totalLength = 0;

    documents.forEach((document, documentIndex) => {
        const terms = tokenize(document.text);
        const frequencies = new Map();
        document.bodyLength = terms.length;
        totalLength += terms.length;

        for (const term of terms) {
            frequencies.set(term, (frequencies.get(term) || 0) + 1);
        }
        for (const [term, frequency] of frequencies) {
            documentFrequency.set(term, (documentFrequency.get(term) || 0) + 1);
            let termPostings = postings.get(term);
            if (!termPostings) {
                termPostings = [];
                postings.set(term, termPostings);
            }
            termPostings.push(documentIndex, frequency);
        }
    });

    return {
        documents,
        documentFrequency,
        postings,
        latestActYearByFamily: documents.reduce((latestYears, document) => {
            const family = actFamily(document.actTitle);
            const year = actYear(document.actTitle);
            if (year) latestYears.set(family, Math.max(latestYears.get(family) || 0, year));
            return latestYears;
        }, new Map()),
        averageLength: documents.length ? totalLength / documents.length : 0
    };
};

export const searchActIndex = (index, query, limit = 8) => {
    const primaryTerms = [...new Set(tokenize(query))].slice(0, 40);
    const queryWeights = new Map(primaryTerms.map(term => [term, 1]));
    for (const term of primaryTerms) {
        for (const synonym of legalSynonyms.get(term) || []) {
            for (const expandedTerm of tokenize(synonym)) {
                if (!queryWeights.has(expandedTerm)) queryWeights.set(expandedTerm, 0.55);
            }
        }
    }
    const queryTerms = [...queryWeights.keys()];
    if (!index.documents.length || !queryTerms.length) return [];

    const queryPhrase = query.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
    const scored = new Map();
    const primaryMatches = new Map();
    const termMatches = new Map();
    const totalDocuments = index.documents.length;
    const normalizedQuery = query.toLocaleLowerCase();
    const intent = legalIntentTerms.find(({ triggers }) => (
        triggers.some(trigger => normalizedQuery.includes(trigger))
    ));

    for (const [term, queryWeight] of queryWeights) {
        const frequency = index.documentFrequency.get(term) || 0;
        const inverseFrequency = Math.log(1 + (totalDocuments - frequency + 0.5) / (frequency + 0.5));
        const termPostings = index.postings.get(term) || [];

        for (let posting = 0; posting < termPostings.length; posting += 2) {
            const documentIndex = termPostings[posting];
            const termFrequency = termPostings[posting + 1];
            const document = index.documents[documentIndex];
            termMatches.set(documentIndex, (termMatches.get(documentIndex) || 0) + 1);
            if (queryWeight === 1) {
                primaryMatches.set(documentIndex, (primaryMatches.get(documentIndex) || 0) + 1);
            }
            const lengthNorm = index.averageLength
                ? 0.25 + 0.75 * document.bodyLength / index.averageLength
                : 1;
            const score = queryWeight * inverseFrequency * (termFrequency * 2.2) / (termFrequency + 1.2 * lengthNorm);
            scored.set(documentIndex, (scored.get(documentIndex) || 0) + score);
        }

        for (let documentIndex = 0; documentIndex < index.documents.length; documentIndex++) {
            const document = index.documents[documentIndex];
            if (document.actTitle.toLocaleLowerCase().includes(term)) {
                scored.set(documentIndex, (scored.get(documentIndex) || 0) + queryWeight * inverseFrequency);
            }
            if (`${document.section} ${document.heading} ${document.context}`.toLocaleLowerCase().includes(term)) {
                scored.set(documentIndex, (scored.get(documentIndex) || 0) + queryWeight * inverseFrequency * 4);
            }
        }
    }

    const rankedDocuments = [...scored.entries()].filter(([documentIndex]) => {
        const document = index.documents[documentIndex];
        if (!intent) return true;

        const searchableText = `${document.actTitle} ${document.heading} ${document.context} ${document.text}`
            .toLocaleLowerCase();
        return intent.terms.some(term => searchableText.includes(term));
    });

    if (queryPhrase) {
        rankedDocuments.forEach(([documentIndex, score], rankedIndex) => {
            const document = index.documents[documentIndex];
            if (`${document.actTitle} ${document.actId} ${document.section} ${document.heading}`
                .toLocaleLowerCase().includes(queryPhrase)) {
                rankedDocuments[rankedIndex] = [documentIndex, score + 6];
            }
        });
    }

    const explicitlyRequestedYear = query.match(/\b(?:18|19|20)\d{2}\b/)?.[0];
    const ranked = rankedDocuments.map(([documentIndex, score]) => {
        const document = index.documents[documentIndex];
        const family = actFamily(document.actTitle);
        const year = actYear(document.actTitle);
        const latestYear = index.latestActYearByFamily.get(family) || year;
        const outdatedVersionWasRequested = explicitlyRequestedYear && Number(explicitlyRequestedYear) === year;
        return {
            documentIndex,
            score: year && year < latestYear && !outdatedVersionWasRequested ? score * 0.2 : score,
            primaryMatchCount: primaryMatches.get(documentIndex) || 0
        };
    });

    const sorted = ranked
        .sort((left, right) => right.score - left.score)
    if (!sorted.length) return [];

    const topScore = sorted[0].score;
    return sorted
        .filter(({ documentIndex, score, primaryMatchCount }) => (
            score >= Math.max(1.25, topScore * 0.35) &&
            (primaryMatchCount >= 1 || (termMatches.get(documentIndex) || 0) >= 2 || (
                intent &&
                intent.terms.some(term => `${index.documents[documentIndex].actTitle} ${index.documents[documentIndex].heading} ${index.documents[documentIndex].text}`
                    .toLocaleLowerCase().includes(term))
            ))
        ))
        .slice(0, limit)
        .map(({ documentIndex, score }) => {
            const { bodyLength, ...document } = index.documents[documentIndex];
            return { ...document, score };
        });
};

const loadActIndex = async () => {
    const directory = path.resolve(process.env.CENTRAL_ACTS_DIR || defaultActsDirectory);
    let entries;

    try {
        entries = await fs.readdir(directory, { withFileTypes: true });
    } catch (error) {
        if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR') throw error;
        if (!missingDirectoryWarningShown) {
            console.warn(`Central Acts directory not found at ${directory}; local legal references are disabled.`);
            missingDirectoryWarningShown = true;
        }
        return buildActIndex([]);
    }

    const files = entries
        .filter(entry => entry.isFile() && entry.name.toLowerCase().endsWith('.json'))
        .map(entry => entry.name)
        .sort();
    const acts = [];
    let invalidFiles = 0;

    for (const fileName of files) {
        try {
            const contents = await fs.readFile(path.join(directory, fileName), 'utf8');
            const act = JSON.parse(contents);
            if (act && typeof act === 'object') acts.push({ act, fileName });
            else invalidFiles++;
        } catch (error) {
            invalidFiles++;
            console.warn(`Skipping unreadable Central Act file ${fileName}: ${error.message}`);
        }
    }

    if (invalidFiles) {
        console.warn(`Skipped ${invalidFiles} invalid file(s) in the Central Acts directory.`);
    }
    const index = buildActIndex(acts);
    console.info(`Loaded ${index.documents.length} sections from ${acts.length} Central Acts in ${directory}.`);
    return index;
};

export const getRelevantActSections = async (query, limit = 8) => {
    indexPromise ??= loadActIndex().catch(error => {
        indexPromise = undefined;
        throw error;
    });
    const index = await indexPromise;
    const results = searchActIndex(index, query, limit);
    const incidentDate = extractIncidentDate(query);
    if (!incidentDate) return results;

    const transitionDate = new Date(Date.UTC(2024, 6, 1));
    const preferredActPattern = incidentDate < transitionDate
        ? /indian penal code|ipc/i
        : /bharatiya nyaya sanhita|bns/i;
    const hasTransitionActs = results.some(({ actTitle }) => isIpcOrBns(actTitle));
    return hasTransitionActs
        ? results.filter(({ actTitle }) => !isIpcOrBns(actTitle) || preferredActPattern.test(actTitle))
        : results;
};
