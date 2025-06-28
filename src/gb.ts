/**
 * Models the GameBoy as a whole from its constituent parts
 */

import Mem from './mem.js';
import CPU from './cpu.js';

class GB {
  private mem: Mem;
  private cpu: CPU;

  constructor() {
    // TODO -- load ROM
    this.mem = new Mem(ROM);
    this.cpu = new CPU(this.mem);
  }
}