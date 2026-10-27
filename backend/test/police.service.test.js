import test from 'node:test';
import assert from 'node:assert/strict';
import { getNearbyPoliceStations } from '../src/services/police.service.js';

test('returns a single nearby police station instead of duplicate area listings', () => {
    const stations = getNearbyPoliceStations('Pedana, Andhra Pradesh', 'General');

    assert.equal(stations.length, 1);
    assert.match(stations[0].name, /Pedana/);
    assert.equal(Object.hasOwn(stations[0], 'contact'), false);
});

test('uses the user location label when no address was provided', () => {
    const [station] = getNearbyPoliceStations('', 'General');

    assert.equal(station.name, 'Police Station near your location');
});
