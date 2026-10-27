import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLocationCoordinates } from '../src/utils/locationCoordinates.js';

test('parses valid device coordinates and reported accuracy', () => {
    assert.deepEqual(parseLocationCoordinates({
        locationLatitude: '16.5062',
        locationLongitude: '80.6480',
        locationAccuracy: '25'
    }), {
        latitude: 16.5062,
        longitude: 80.648,
        accuracy: 25
    });
});

test('accepts coordinates without accuracy for a manually selected location', () => {
    assert.deepEqual(parseLocationCoordinates({
        locationLatitude: '16.5062',
        locationLongitude: '80.6480'
    }), {
        latitude: 16.5062,
        longitude: 80.648
    });
});

test('returns null when location coordinates are omitted', () => {
    assert.equal(parseLocationCoordinates({}), null);
});

test('rejects incomplete or out-of-range coordinates', () => {
    assert.equal(parseLocationCoordinates({ locationLatitude: '16.5' }), false);
    assert.equal(parseLocationCoordinates({
        locationLatitude: '91',
        locationLongitude: '80'
    }), false);
    assert.equal(parseLocationCoordinates({
        locationLatitude: '16.5',
        locationLongitude: '181'
    }), false);
    assert.equal(parseLocationCoordinates({
        locationLatitude: '16.5',
        locationLongitude: '80',
        locationAccuracy: '-1'
    }), false);
});
