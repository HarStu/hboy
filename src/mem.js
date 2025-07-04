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

    // TODO -- POPULATE BANK ARRAYS WITH APPROPRIATE MEMORY BASED ON CARTRIDGE MBC

    // Setup readDispatch table
    this.readDispatch = new Array(0x10)
    this.readDispatch[0x0] = this.romBanks[0]
    this.readDispatch[0x4] = this.romBanks[this.crb]
    this.readDispatch[0x8] = this.vram
    this.readDispatch[0xA] = this.eramBanks[this.cerb] // might have to redo to avoid crash where cerb = -1 (no current external ram bank)
    this.readDispatch[0xC] = this.wram // Will need to be updated for GBC support -- back half of this is switchable on the GBC
    this.readDispatch[0xE] = this.wram // echo ram, this is very busted and shouldn't be touched
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
    this.writeDispatch = new Array(0x10)
    this.writeDispatch[0x0] = (addr, val) => this.romBanks[0][addr] = val;
    this.writeDispatch[0x4] = (addr, val) => this.romBanks[this.crb][addr - 0x4000] = val;
    this.writeDispatch[0x8] = (addr, val) => this.vram[addr - 0x8000] = val; // might have to redo to avoid crash where cerb = -1 (no current external ram bank)
    this.writeDispatch[0xA] = (addr, val) => this.eramBanks[this.cerb][addr - 0xA000] = val; // Will need to be updated for GBC support -- back half of this is switchable on the GBC
    this.writeDispatch[0xC] = (addr, val) => this.wram[addr - 0xC000] = val; // echo ram, this is very busted and shouldn't be touched
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
    const region = addr >> 12;
    this.writeDispatch[region](addr, val);
  }

  /*
  readByte(addr) {
    if (addr >= 0x0000 && addr < 0x4000) {
      // Return from first fixed ROM bank
      return this.romBanks[0][addr];
    } else if (addr >= 0x4000 && addr < 0x8000) {
      // Return from switchable ROM bank
      return this.romBanks[this.crb][addr - 0x4000];
    } else if (addr >= 0x8000 && addr < 0xA000) {
      // Return from vram
      return this.vram[addr - 0x8000];
    } else if (addr >= 0xA000 && addr < 0xC000) {
      // Return from the switchable external RAM bank (if available)
      if (this.cerb != -1) {
        return this.eramBanks[this.cerb][addr - 0xA000];
      } else {
        console.log(`WARN in Mem.readbyte: Attempt to load from non-existent external RAM bank at ${addr}`);
        return 0xFF;
      }
    } else if (addr >= 0xC000 && addr < 0xE000) {
      // Return from work RAM
      return this.wram[addr - 0xC000];
    } else if (addr >= 0xE000 && addr < 0xFE00) {
      // Return from Echo RAM
      console.log(`WARN in Mem.readbyte: Loaded from 'Echo Ram' at addr ${addr}`);
      return this.wram[addr - 0xE000];
    } else if (addr >= 0xFE00 && addr < 0xFEA0) {
      // Return from Object Attribute Memory
      return this.oam[addr - 0xFE00];
    } else if (addr >= 0xFEA0 && addr < 0xFF00) {
      // (Attempt to) return from Unusable Memory
      console.log(`Error in Mem.readbyte: Attempt to load unusable memory at addr ${addr}`);
      return 0xFF;
    } else if (addr >= 0xFF00 && addr < 0xFF80) {
      // Return from I/O Registers
      return this.io[addr - 0xFF00];
    } else if (addr >= 0xFF80 && addr < 0xFFFF) {
      // Return from High RAM
      return this.hram[addr - 0xFF80];
    } else if (addr == 0xFFFF) {
      // Return Interupt Enable Register
      return this.ie[0];
    } else {
      console.log(`Error in Mem.readbyte: Attempt to load from outside memory map at ${addr}`);
      return 0xFF;
    }
  }
  
  writeByte(addr, val) {
    if (val < 0x00 || val > 0xFF) {
      console.log(`ERROR in Mem.writebyte: Attempt to write non-byte val ${val}`)
    } else if (addr >= 0x0000 && addr < 0x4000) {
      // TODO -- Fixed ROM bank
      console.log(`TODO in Mem.writebyte: Attempt to write to Fixed ROM bank at ${addr}`)
    } else if (addr >= 0x4000 && addr < 0x8000) {
      // TODO -- Switchable ROM bank
      console.log(`TODO in Mem.writebyte: Attempt to write to Switchable ROM bank at ${addr}`)
    } else if (addr >= 0x8000 && addr < 0xA000) {
      // Write to vram
      this.vram[addr - 0x8000] = val;
    } else if (addr >= 0xA000 && addr < 0xC000) {
      // Write to switchable external RAM bank (if available)
      if (this.cerb != -1) {
        this.eramBanks[this.cerb][addr - 0xA000] = val;
      } else {
        console.log(`WARN in Mem.writebyte: Attempt to write to non-existent external RAM bank at ${addr}`);
      }
    } else if (addr >= 0xC000 && addr < 0xE000) {
      // Write to work RAM
      this.wram[addr - 0xC000] = val;
    } else if (addr >= 0xE000 && addr < 0xFE00) {
      // Write to Echo RAM
      console.log(`WARN in Mem.writebyte: Wrote to 'Echo Ram' at addr ${addr}`);
      this.wram[addr - 0xE000] = val;
    } else if (addr >= 0xFE00 && addr < 0xFEA0) {
      // Write to Object Attribute Memory
      this.oam[addr - 0xFE00] = val;
    } else if (addr >= 0xFEA0 && addr < 0xFF00) {
      // (Attempt to) write to Unusable Memory
      console.log(`Error in Mem.writebyte: Attempt to write to unusable memory at addr ${addr}`);
    } else if (addr >= 0xFF00 && addr < 0xFF80) {
      // Write to I/O Registers
      // TODO -- special behavior here
      console.log(`TODO in Mem.writebyte: Write to I/O at ${addr}`)
      this.io[addr - 0xFF00] = val;
    } else if (addr >= 0xFF80 && addr < 0xFFFF) {
      // Write to High RAM
      this.hram[addr - 0xFF80] = val;
    } else if (addr == 0xFFFF) {
      // Write to Interupt Enable Register
      this.ie[0] = val;
    } else {
      console.log(`Error in Mem.writebyte: Attempted to write outside memory map at ${addr}`);
    }
  }
  */
}
