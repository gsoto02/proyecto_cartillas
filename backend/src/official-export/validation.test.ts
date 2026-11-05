import assert from 'node:assert/strict';
import test from 'node:test';
import { findDocumentMap } from './maps/index.js';
import { authorizedDestinations, validateDestination, validateDocumentMap } from './validation.js';

const map = findDocumentMap('CONTROL_DE_APRIETE_01', 1)!;

test('el mapa piloto borrador es estructuralmente válido', () => {
  assert.equal(map.status, 'borrador');
  assert.deepEqual(validateDocumentMap(map), []);
  assert.equal(authorizedDestinations(map).length, 234);
});

test('acepta únicamente destinos documentales declarados', () => {
  assert.deepEqual(validateDestination(map, 'N12'), { ok: true });
  assert.deepEqual(validateDestination(map, 'AA51'), { ok: true });
  assert.equal(validateDestination(map, 'H12').ok, false);
  assert.equal(validateDestination(map, 'AK1').ok, false);
});

test('rechaza celdas secundarias de combinaciones', () => {
  const result = validateDestination(map, 'B45', ['A45:E45']);
  assert.deepEqual(result, {
    ok: false,
    code: 'merged_secondary_cell',
    message: 'Solo se puede escribir en el ancla superior izquierda de una celda combinada.'
  });
});

test('rechaza direcciones inválidas y fuera del área oficial', () => {
  const invalid = validateDestination(map, '45A');
  const outside = validateDestination(map, 'A75');
  assert.equal(invalid.ok, false);
  assert.equal(outside.ok, false);
  if (invalid.ok || outside.ok) assert.fail('Las direcciones inválidas deben ser rechazadas.');
  assert.equal(invalid.code, 'invalid_address');
  assert.equal(outside.code, 'outside_area');
});
