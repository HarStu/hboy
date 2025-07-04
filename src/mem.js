/**
 * Models the GameBoy's Memory Map
 */
export class Mem {
  constructor() {
    this.romBanks = []; // ROM banks (Bank 0 fixed, others switchable)
    this.romBanks[0] = new Uint8Array(0x4000); // 16KB initial fixed ROM bank
    this.crb = 1 // Current ROM bank. Set to 1 by default (0 contains the 0x0000-0x3FFF fixed ROM bank)

    this.vram = new Uint8Array(0x2000); // 8KB Video RAM, located 0x8000-0x9FFF

    this.eramBanks = []; // External RAM banks
    this.cerb = -1; // Current eram bank. Defaults to -1 (no eram banks on cart)

    this.wram = new Uint8Array(0x2000); // 8KB Work RAM, located 0xC000-0xDFFF
    this.oam = new Uint8Array(0x9F); // Object Attribute Memory
    this.io = new Uint8Array(0x7F); // I/O Registers
    this.hram = new Uint8Array(0x7E); // High RAM
    this.ie = new Uint8Array(0x1); // Interupt Enable Register

    // Dispatch tables
    this.readDispatch = new Array(0x10)
    this.writeDispatch = new Array(0x10)

    // TODO -- POPULATE BANK ARRAYS WITH APPROPRIATE MEMORY BASED ON CARTRIDGE MBC

    // Setup readDispatch table
    for (let i of [0x0, 0x1, 0x2, 0x3]) {
      this.readDispatch[i] = (addr) => this.romBanks[0][addr];
    }
    for (let i of [0x4, 0x5, 0x6, 0x7]) {
      this.readDispatch[i] = (addr) => this.romBanks[this.crb][addr - 0x4000];
    }
    for (let i of [0x8, 0x9]) {
      // might have to redo to avoid crash where cerb = (addr) => -1 (no current external ram bank)
      this.readDispatch[i] = (addr) => this.vram[addr - 0x8000];
    }
    for (let i of [0xA, 0xB]) {
      // Will need to be updated for GBC support -- back half of this is switchable on the GBC
      this.readDispatch[i] = (addr) => this.eramBanks[this.cerb][addr - 0xA000];
    }
    for (let i of [0xC, 0xD]) {
      // echo ram, this is very busted and shouldn't be touched
      this.readDispatch[i] = (addr) => this.wram[addr - 0xC000];
    }
    this.readDispatch[0xE] = (addr) => this.wram[addr - 0xE000] // echo ram, this is very busted and shouldn't be touched
    this.readDispatch[0xF] = (addr) => {  // additional logic for higher-order memory
      if (addr < 0xFE00) {
        // Echo RAM
        console.log(`WARN in Mem.readByte: Loaded from 'Echo Ram' at addr ${addr}`);
        return this.wram[addr - 0xE000];
      } else if (addr >= 0xFE00 && addr < 0xFEA0) {
        // Object Attribute Memory
        return this.oam[addr - 0xFE00];
      } else if (addr >= 0xFEA0 && addr < 0xFF00) {
        // Unusable Memory
        console.log(`Error in Mem.readByte: Attempt to load unusable memory at addr ${addr}`);
        return 0xFF;
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
      this.writeDispatch[i] = (addr, val) => this.romBanks[0][addr] = val;
    }
    for (let i of [0x4, 0x5, 0x6, 0x7]) {
      this.writeDispatch[i] = (addr, val) => this.romBanks[this.crb][addr - 0x4000] = val;
    }
    for (let i of [0x8, 0x9]) {
      // might have to redo to avoid crash where cerb = -1 (no current external ram bank)
      this.writeDispatch[i] = (addr, val) => this.vram[addr - 0x8000] = val;
    }
    for (let i of [0xA, 0xB]) {
      // Will need to be updated for GBC support -- back half of this is switchable on the GBC
      this.writeDispatch[i] = (addr, val) => this.eramBanks[this.cerb][addr - 0xA000] = val;
    }
    for (let i of [0xC, 0xD]) {
      // echo ram, this is very busted and shouldn't be touched
      this.writeDispatch[i] = (addr, val) => this.wram[addr - 0xC000] = val;
    }
    this.writeDispatch[0xE] = (addr, val) => this.wram[addr - 0xE000] = val; // additional logic for higher-order memory
    this.writeDispatch[0xF] = (addr, val) => {
      if (addr < 0xFE00) {
        // Echo RAM
        console.log(`WARN in Mem.writeByte: write to 'Echo Ram' at addr ${addr}`);
        this.wram[addr - 0xE000] = val;
      } else if (addr >= 0xFE00 && addr < 0xFEA0) {
        // Object Attribute Memory
        this.oam[addr - 0xFE00] = val;
      } else if (addr >= 0xFEA0 && addr < 0xFF00) {
        // Unusable Memory
        console.log(`Error in Mem.weadbyte: Attempt to write to unusable memory at addr ${addr}`);
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

  readByte(addr) {
    const region = addr >> 12;
    return this.readDispatch[region](addr);
  }

  writeByte(addr, val) {
    console.log(`writing ${val} to ${addr}`)
    const region = addr >> 12;
    console.log(`region: ${region}`)
    this.writeDispatch[region](addr, val);
  }
}
