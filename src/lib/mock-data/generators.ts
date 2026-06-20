import { format } from 'date-fns';
import type { Faker } from '@faker-js/faker';
import type { ScalarFieldType, SchemaField } from './types';

export function generateValue(
  type: ScalarFieldType,
  rowIndex: number,
  options: SchemaField['options'],
  faker: Faker
): unknown {
  switch (type) {
    case 'row_number':
      return rowIndex + 1;
    case 'uuid':
      return faker.string.uuid();
    case 'first_name':
      return faker.person.firstName();
    case 'last_name':
      return faker.person.lastName();
    case 'full_name':
      return faker.person.fullName();
    case 'email':
      return faker.internet.email();
    case 'phone':
      return faker.phone.number();
    case 'gender':
      return faker.person.sex();
    case 'city':
      return faker.location.city();
    case 'country':
      return faker.location.country();
    case 'boolean':
      return faker.datatype.boolean();
    case 'integer': {
      const min = options?.min ?? 1;
      const max = options?.max ?? 100;
      return faker.number.int({ min, max });
    }
    case 'float': {
      const min = options?.min ?? 0;
      const max = options?.max ?? 100;
      return faker.number.float({ min, max, fractionDigits: 2 });
    }
    case 'date':
      return format(faker.date.past(), 'yyyy-MM-dd');
    case 'datetime':
      return faker.date.recent().toISOString();
    case 'url':
      return faker.internet.url();
    case 'ipv4':
      return faker.internet.ipv4();
    case 'lorem':
      return faker.lorem.sentence();
    case 'enum': {
      const values = options?.values?.filter((v) => v.length > 0) ?? [];
      if (values.length === 0) return '';
      return faker.helpers.arrayElement(values);
    }
    default:
      return null;
  }
}
