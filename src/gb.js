/**
 * Models the GameBoy as a whole from its constituent parts
 */

import { Mem } from './mem.js';
import { CPU } from './cpu.js';

export class GB {
  constructor() {
    // TODO -- load ROM
    // pass as an argument to mem
    this.mem = new Mem();
    this.cpu = new CPU(this.mem);
  }
}