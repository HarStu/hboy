/**
 * Models the GameBoy's Memory Map
 */

import type { Byte, Word } from './types.ts'

export class Mem {
  private readonly romBanks: Uint8Array[]
  private readonly crb: number

  private readonly vram: Uint8Array

  private readonly eramBanks: Uint8Array[]
  private readonly cerb: number

  private readonly wram: Uint8Array
  private readonly oam: Uint8Array
  private readonly unused: Uint8Array
  private readonly io: Uint8Array
  private readonly hram: Uint8Array
  private readonly ie: Uint8Array

  private readonly readDispatch: Function[]
  private readonly writeDispatch: Function[]

  constructor() {
    this.romBanks = []; // ROM banks (Bank 0 fixed, others switchable)
    this.romBanks[0] = new Uint8Array(0x4000); // 16KB initial fixed ROM bank
    this.romBanks[1] = new Uint8Array(0x4000); // 16KB default swappable bank
    this.crb = 1; // Current ROM bank. Set to 1 by default (0 contains the 0x0000-0x3FFF fixed ROM bank)

    this.vram = new Uint8Array(0x2000); // 8KB Video RAM, located 0x8000-0x9FFF

    this.eramBanks = []; // External RAM banks
    this.eramBanks[0] = new Uint8Array(0x2000);
    this.cerb = 0; // Current eram bank. Defaults to 1 (one eram bank on cart)

    this.wram = new Uint8Array(0x2000); // 8KB Work RAM, located 0xC000-0xDFFF
    this.oam = new Uint8Array(0xA0); // Object Attribute Memory
    this.unused = new Uint8Array(0x60); // Unused memory (some homebrew uses this memory)
    this.io = new Uint8Array(0x80); // I/O Registers
    this.hram = new Uint8Array(0x7F); // High RAM
    this.ie = new Uint8Array(0x1); // Interupt Enable Register

    // Dispatch tables
    this.readDispatch = new Array(0x10)
    this.writeDispatch = new Array(0x10)

    // TODO -- POPULATE BANK ARRAYS WITH APPROPRIATE MEMORY BASED ON CARTRIDGE MBC

    // Setup readDispatch table
    for (let i of [0x0, 0x1, 0x2, 0x3]) {
      this.readDispatch[i] = (addr: Word) => {
        if (!this.romBanks[0]) throw new Error(`Attempt to read from undefined fixed rombank`);
        return this.romBanks[0][addr];
      }
    }
    for (let i of [0x4, 0x5, 0x6, 0x7]) {
      this.readDispatch[i] = (addr: Word) => {
        const romBank = this.romBanks[this.crb];
        if (!romBank) throw new Error(`Attempt to read from undefined rombank ${this.crb}`);
        return romBank[addr - 0x4000];
      }
    }
    for (let i of [0x8, 0x9]) {
      // might have to redo to avoid crash where cerb = (addr) => -1 (no current external ram bank)
      this.readDispatch[i] = (addr: Word) => this.vram[addr - 0x8000];
    }
    for (let i of [0xA, 0xB]) {
      // Will need to be updated for GBC support -- back half of this is switchable on the GBC
      this.readDispatch[i] = (addr: Word) => {
        const eramBank = this.eramBanks[this.cerb]
        if (!eramBank) throw new Error(`Attempt to read from undefined erambank ${this.cerb}`)
        return eramBank[addr - 0xA000];
      }
    }
    for (let i of [0xC, 0xD]) {
      // echo ram, this is very busted and shouldn't be touched
      this.readDispatch[i] = (addr: Word) => this.wram[addr - 0xC000];
    }
    this.readDispatch[0xE] = (addr: Word) => this.wram[addr - 0xE000] // echo ram, this is very busted and shouldn't be touched
    this.readDispatch[0xF] = (addr: Word) => {  // additional logic for higher-order memory
      if (addr < 0xFE00) {
        // Echo RAM
        // console.log(`WARN in Mem.readByte: Loaded from 'Echo Ram' at addr ${addr}`);
        return this.wram[addr - 0xE000];
      } else if (addr >= 0xFE00 && addr < 0xFEA0) {
        // Object Attribute Memory
        return this.oam[addr - 0xFE00];
      } else if (addr >= 0xFEA0 && addr < 0xFF00) {
        // Unusable Memory 
        return this.unused[addr - 0xFEA0];
      } else if (addr >= 0xFF00 && addr < 0xFF80) {
        // from I/O Registers
        return this.io[addr - 0xFF00];
      } else if (addr >= 0xFF80 && addr < 0xFFFF) {
        // from High RAM
        return this.hram[addr - 0xFF80];
      } else if (addr == 0xFFFF) {
        // Interupt Enable Register
        return this.ie[0];
      }
    }

    // Setup writeDispatch table
    for (let i of [0x0, 0x1, 0x2, 0x3]) {
      this.writeDispatch[i] = (addr: Word, val: Byte) => {
        if (!this.romBanks[0]) throw new Error(`Attempt to write to undefined fixed rombank`);
        this.romBanks[0][addr] = val;
      }
    }
    for (let i of [0x4, 0x5, 0x6, 0x7]) {
      this.writeDispatch[i] = (addr: Word, val: Byte) => {
        const romBank = this.romBanks[this.crb]
        if (!romBank) throw new Error(`Attempt to write to undefined rombank ${this.crb}`)
        romBank[addr - 0x4000] = val;
      }
    }
    for (let i of [0x8, 0x9]) {
      // might have to redo to avoid crash where cerb = -1 (no current external ram bank)
      this.writeDispatch[i] = (addr: Word, val: Byte) => this.vram[addr - 0x8000] = val;
    }
    for (let i of [0xA, 0xB]) {
      // Will need to be updated for GBC support -- back half of this is switchable on the GBC
      this.writeDispatch[i] = (addr: Word, val: Byte) => {
        const eramBank = this.eramBanks[this.cerb]
        if (!eramBank) throw new Error(`Attempt to write to undefined erambank ${this.cerb}`)
        eramBank[addr - 0xA000] = val;
      }
    }
    for (let i of [0xC, 0xD]) {
      // echo ram, this is very busted and shouldn't be touched
      this.writeDispatch[i] = (addr: Word, val: Byte) => this.wram[addr - 0xC000] = val;
    }
    this.writeDispatch[0xE] = (addr: Word, val: Byte) => this.wram[addr - 0xE000] = val; // additional logic for higher-order memory
    this.writeDispatch[0xF] = (addr: Word, val: Byte) => {
      if (addr < 0xFE00) {
        // Echo RAM
        // console.log(`WARN in Mem.writeByte: write to 'Echo Ram' at addr ${addr}`);
        this.wram[addr - 0xE000] = val;
      } else if (addr >= 0xFE00 && addr < 0xFEA0) {
        // Object Attribute Memory
        this.oam[addr - 0xFE00] = val;
      } else if (addr >= 0xFEA0 && addr < 0xFF00) {
        // Unusable Memory
        this.unused[addr - 0xFEA0] = val;
      } else if (addr >= 0xFF00 && addr < 0xFF80) {
        // I/O Registers
        this.io[addr - 0xFF00] = val;
      } else if (addr >= 0xFF80 && addr < 0xFFFF) {
        // High RAM
        this.hram[addr - 0xFF80] = val;
      } else if (addr == 0xFFFF) {
        // Interupt Enable Register
        this.ie[0] = val;
      }
    }
  }

  readByte(addr: Word) {
    const region = addr >> 12;
    if (!this.readDispatch[region]) throw new Error(`Error: attempt to read byte from undefined region of dispatch table ${region}`)
    return this.readDispatch[region](addr);
  }

  writeByte(addr: Word, val: Byte) {
    const region = addr >> 12;
    if (!this.writeDispatch[region]) throw new Error(`Error: attempt to write byte to undefined region of dispatch table ${region}`)
    return this.writeDispatch[region](addr, val);
  }
}
