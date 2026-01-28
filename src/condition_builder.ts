import type { Group } from './types';
import { deserialize } from './serializer';
 
export class ConditionBuilder {
  public groups: Group[]

  constructor(input: string) {
    this.groups = deserialize(input);
  }
}
