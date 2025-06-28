/**
 * Models the GameBoy as a whole from its constituent parts
 */

import { Mem } from './mem.js';
// TODO: Convert CPU to TypeScript and import properly
// import { CPU } from './cpu.js';

export class GB {
  private mem: Mem;
  // private cpu: CPU; // TODO: Uncomment when CPU is converted to TypeScript

  constructor(rom?: Uint8Array) {
    this.mem = new Mem(rom);
    // this.cpu = new CPU(this.mem); // TODO: Uncomment when CPU is converted to TypeScript
  }

  // TODO: Add methods to run the emulator
  public run(): void {
    console.log('GameBoy emulator running...');
  }

  public getMem(): Mem {
    return this.mem;
  }
}