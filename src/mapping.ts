import type { Mapping } from './types';

export function fieldList(mapping: Mapping): { key: string, label: string }[] {
  return Object.entries(mapping).flatMap(([key, value]) => {
    if(value.type !== 'object') return [{ key, label: value.label }];

    const numberFields = value.mapping ? Object.entries(value.mapping).filter(([_, value]) => value.type === 'number') : [];

    return [
      {
        key: `${key}_count`,
        label: `${value.label} (count)`,
      },
      ...numberFields.map(([subkey, subvalue]) => ({
        key: `${key}_${subkey}_sum`,
        label: `${value.label} → ${subvalue.label} (sum)`,
      })),
    ]
  });
}