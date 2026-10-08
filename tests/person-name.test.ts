import { describe, expect, it } from 'vitest';
import { PersonName } from '../src/services/person-name';
import golden from './fixtures/golden-original.json';
/* Tests de caracterización: valores esperados capturados ejecutando la aplicación ORIGINAL con las mismas entradas. */
describe('PersonName (idéntico al original)', () => {
  golden.cases.forEach((input, i) => it(`parse #${i} ${JSON.stringify(input)}`, () => { expect(PersonName.parse(input)).toEqual(golden.pn[i]); }));
  it('words / formatWord', () => {
    expect([PersonName.words('Ana (la mayor) María-José'), PersonName.formatWord('ñandú-pérez'), PersonName.formatWord("o'brien")]).toEqual(golden.words);
  });
});
