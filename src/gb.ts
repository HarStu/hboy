/**
 * Models the GameBoy as a whole from its constituent parts
 */

import { Mem } from './mem.ts';
import { CPU } from './cpu.ts';

export class GB {
  readonly mem: Mem;
  readonly cpu: CPU;

  constructor() {
    // TODO -- load ROM
    // pass as an argument to mem
    this.mem = new Mem();
    this.cpu = new CPU(this.mem);
  }
}