import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { classifyGeminiError, getApiKeys, normalizeComplexity, validateAnalysis } from '../src/services/ai.service.js';

const originalApiKeys = process.env.GEMINI_API_KEYS;
const originalApiKey = process.env.GEMINI_API_KEY;

after(() => {
    if (originalApiKeys === undefined) delete process.env.GEMINI_API_KEYS;
    else process.env.GEMINI_API_KEYS = originalApiKeys;

    if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalApiKey;
});

test('getApiKeys parses and trims a comma-separated key pool', () => {
    process.env.GEMINI_API_KEYS = ' key-one, , key-two ';
    process.env.GEMINI_API_KEY = 'fallback-key';

    assert.deepEqual(getApiKeys(), ['key-one', 'key-two']);
});

test('getApiKeys supports the single-key environment variable', () => {
    delete process.env.GEMINI_API_KEYS;
    process.env.GEMINI_API_KEY = ' single-key ';

    assert.deepEqual(getApiKeys(), ['single-key']);
});

test('getApiKeys ignores the sample placeholder value', () => {
    process.env.GEMINI_API_KEYS = 'your_gemini_api_key_here';
    delete process.env.GEMINI_API_KEY;

    assert.deepEqual(getApiKeys(), []);
});

test('normalizes complexity score ranges and derives the matching persisted level', () => {
    assert.deepEqual(normalizeComplexity(18), { complexity_score: 18, complexity_level: 'Simple' });
    assert.deepEqual(normalizeComplexity('45'), { complexity_score: 45, complexity_level: 'Medium' });
    assert.deepEqual(normalizeComplexity(82), { complexity_score: 82, complexity_level: 'Complex' });
    assert.deepEqual(normalizeComplexity(120), { complexity_score: 100, complexity_level: 'Complex' });
});

test('rejects a missing or invalid complexity score instead of inventing one', () => {
    assert.equal(normalizeComplexity(undefined), null);
    assert.equal(normalizeComplexity('not a score'), null);
});

test('classifies rejected credentials as an authentication error, not a rate limit', () => {
    assert.deepEqual(
        classifyGeminiError({
            status: 401,
            message: '{"error":{"status":"UNAUTHENTICATED","message":"API key not valid"}}'
        }),
        { code: 'AI_INVALID_API_KEY', status: 503 }
    );
});

test('only classifies quota-related 403 responses as rate limits', () => {
    assert.deepEqual(
        classifyGeminiError({ status: 403, message: 'API key not valid' }),
        { code: 'AI_PERMISSION_DENIED', status: 503 }
    );
    assert.deepEqual(
        classifyGeminiError({ status: 403, message: 'RESOURCE_EXHAUSTED quota exceeded' }),
        { code: 'AI_RATE_LIMIT', status: 429 }
    );
});

test('reports unavailable models and invalid responses without retryable status', () => {
    assert.deepEqual(classifyGeminiError({ status: 404, message: 'model not found' }), {
        code: 'AI_MODEL_UNAVAILABLE',
        status: 503
    });
    assert.deepEqual(classifyGeminiError(new SyntaxError('Unexpected token')), {
        code: 'AI_REQUEST_FAILED',
        status: 502
    });
});

test('classifies Gemini high-demand responses as temporary service failures', () => {
    assert.deepEqual(
        classifyGeminiError({
            status: 503,
            message: '{"error":{"code":503,"message":"This model is currently experiencing high demand.","status":"UNAVAILABLE"}}'
        }),
        { code: 'AI_TEMPORARY_FAILURE', status: 503 }
    );
});

test('removes unsupported culpable-homicide rights from a wallet theft analysis', () => {
    const analysis = {
        complexity_score: 30,
        user_rights: ['Section 299 of the Indian Penal Code — right to protection'],
        legalRights: [{
            right: 'Right to protection',
            legalBasis: 'Section 299 of the Indian Penal Code',
            explanation: 'Unsupported right'
        }],
        relevantProvisions: [{
            act: 'Indian Penal Code',
            section: 'Section 411',
            title: 'Dishonestly receiving stolen property'
        }]
    };

    validateAnalysis(analysis, [{
        actTitle: 'Indian Penal Code',
        section: 'Section 411',
        heading: 'Dishonestly receiving stolen property',
        fileName: 'ipc.json'
    }]);

    assert.deepEqual(analysis.legalRights, []);
    assert.deepEqual(analysis.user_rights, []);
    assert.equal(analysis.relevantProvisions[0].section, 'Section 411');
});
