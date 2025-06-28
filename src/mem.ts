/**
 * Models the GameBoy's Memory Map
 */

import { Address, UInt8, UInt16 } from './types.js';

export class Mem {
  private readonly romBanks: Uint8Array[]; // ROM banks (Bank 0 fixed, others switchable)
  private crb: number; // Current ROM bank. Set to 1 by default (0 contains the 0x0000-0x3FFF fixed ROM bank)
  private readonly vram: Uint8Array; // 8KB Video RAM, located 0x8000-0x9FFF
  private readonly eramBanks: Uint8Array[]; // External RAM banks
  private cerb: number; // Current eram bank. Defaults to -1 (no eram banks on cart)
  private readonly wram: Uint8Array; // 8KB Work RAM, located 0xC000-0xDFFF
  private readonly oam: Uint8Array; // Object Attribute Memory
  private readonly io: Uint8Array; // I/O Registers
  private readonly hram: Uint8Array; // High RAM
  private readonly ie: Uint8Array; // Interrupt Enable Register

  constructor(ROM?: Uint8Array) {
    this.romBanks = []; // ROM banks (Bank 0 fixed, others switchable)
    this.romBanks[0] = new Uint8Array(0x4000); // 16KB initial fixed ROM bank

    this.crb = 1; // Current ROM bank. Set to 1 by default (0 contains the 0x0000-0x3FFF fixed ROM bank)

    this.vram = new Uint8Array(0x2000); // 8KB Video RAM, located 0x8000-0x9FFF

    this.eramBanks = []; // External RAM banks
    this.cerb = -1; // Current eram bank. Defaults to -1 (no eram banks on cart)

    this.wram = new Uint8Array(0x2000); // 8KB Work RAM, located 0xC000-0xDFFF
    this.oam = new Uint8Array(0x9F); // Object Attribute Memory
    this.io = new Uint8Array(0x7F); // I/O Registers
    this.hram = new Uint8Array(0x7E); // High RAM
    this.ie = new Uint8Array(0x1); // Interrupt Enable Register

    // TODO -- POPULATE BANK ARRAYS WITH APPROPRIATE MEMORY BASED ON CARTRIDGE MBC
    if (ROM) {
      // Load ROM data if provided
      const romSize = Math.min(ROM.length, 0x4000);
      this.romBanks[0]!.set(ROM.subarray(0, romSize));
    }
  }

  readByte(addr: Address): UInt8 {
    if (addr >= 0x0000 && addr < 0x4000) {
      // Return from first fixed ROM bank
      const bank = this.romBanks[0];
      if (!bank) {
        throw new Error('ROM bank 0 not initialized');
      }
      const value = bank[addr];
      return value ?? 0xFF;
    } else if (addr >= 0x4000 && addr < 0x8000) {
      // Return from switchable ROM bank
      const bank = this.romBanks[this.crb];
      if (!bank) {
        console.log(`WARN in Mem.readByte: ROM bank ${this.crb} not available`);
        return 0xFF;
      }
      const value = bank[addr - 0x4000];
      return value ?? 0xFF;
    } else if (addr >= 0x8000 && addr < 0xA000) {
      // Return from vram
      const value = this.vram[addr - 0x8000];
      return value ?? 0xFF;
    } else if (addr >= 0xA000 && addr < 0xC000) {
      // Return from the switchable external RAM bank (if available)
      if (this.cerb !== -1) {
        const bank = this.eramBanks[this.cerb];
        if (!bank) {
          console.log(`WARN in Mem.readByte: External RAM bank ${this.cerb} not available`);
          return 0xFF;
        }
        const value = bank[addr - 0xA000];
        return value ?? 0xFF;
      } else {
        console.log(`WARN in Mem.readByte: Attempt to load from non-existent external RAM bank at ${addr.toString(16)}`);
        return 0xFF;
      }
    } else if (addr >= 0xC000 && addr < 0xE000) {
      // Return from work RAM
      const value = this.wram[addr - 0xC000];
      return value ?? 0xFF;
    } else if (addr >= 0xE000 && addr < 0xFE00) {
      // Return from Echo RAM
      console.log(`WARN in Mem.readByte: Loaded from 'Echo Ram' at addr ${addr.toString(16)}`);
      const value = this.wram[addr - 0xE000];
      return value ?? 0xFF;
    } else if (addr >= 0xFE00 && addr < 0xFEA0) {
      // Return from Object Attribute Memory
      const value = this.oam[addr - 0xFE00];
      return value ?? 0xFF;
    } else if (addr >= 0xFEA0 && addr < 0xFF00) {
      // (Attempt to) return from Unusable Memory
      console.log(`Error in Mem.readByte: Attempt to load unusable memory at addr ${addr.toString(16)}`);
      return 0xFF;
    } else if (addr >= 0xFF00 && addr < 0xFF80) {
      // Return from I/O Registers
      const value = this.io[addr - 0xFF00];
      return value ?? 0xFF;
    } else if (addr >= 0xFF80 && addr < 0xFFFF) {
      // Return from High RAM
      const value = this.hram[addr - 0xFF80];
      return value ?? 0xFF;
    } else if (addr === 0xFFFF) {
      // Return Interrupt Enable Register
      const value = this.ie[0];
      return value ?? 0xFF;
    } else {
      console.log(`Error in Mem.readByte: Attempt to load from outside memory map at ${addr.toString(16)}`);
      return 0xFF;
    }
  }

  writeByte(addr: Address, val: UInt8): void {
    if (val < 0x00 || val > 0xFF) {
      console.log(`ERROR in Mem.writeByte: Attempt to write non-byte val ${val}`);
      return;
    }

    if (addr >= 0x0000 && addr < 0x4000) {
      // TODO -- Fixed ROM bank
      console.log(`TODO in Mem.writeByte: Attempt to write to Fixed ROM bank at ${addr.toString(16)}`);
    } else if (addr >= 0x4000 && addr < 0x8000) {
      // TODO -- Switchable ROM bank
      console.log(`TODO in Mem.writeByte: Attempt to write to Switchable ROM bank at ${addr.toString(16)}`);
    } else if (addr >= 0x8000 && addr < 0xA000) {
      // Write to vram
      const offset = addr - 0x8000;
      if (offset < this.vram.length) {
        this.vram[offset] = val;
      }
    } else if (addr >= 0xA000 && addr < 0xC000) {
      // Write to switchable external RAM bank (if available)
      if (this.cerb !== -1) {
        const bank = this.eramBanks[this.cerb];
        if (bank) {
          const offset = addr - 0xA000;
          if (offset < bank.length) {
            bank[offset] = val;
          }
        } else {
          console.log(`WARN in Mem.writeByte: External RAM bank ${this.cerb} not available`);
        }
      } else {
        console.log(`WARN in Mem.writeByte: Attempt to write to non-existent external RAM bank at ${addr.toString(16)}`);
      }
    } else if (addr >= 0xC000 && addr < 0xE000) {
      // Write to work RAM
      const offset = addr - 0xC000;
      if (offset < this.wram.length) {
        this.wram[offset] = val;
      }
    } else if (addr >= 0xE000 && addr < 0xFE00) {
      // Write to Echo RAM
      console.log(`WARN in Mem.writeByte: Wrote to 'Echo Ram' at addr ${addr.toString(16)}`);
      const offset = addr - 0xE000;
      if (offset < this.wram.length) {
        this.wram[offset] = val;
      }
    } else if (addr >= 0xFE00 && addr < 0xFEA0) {
      // Write to Object Attribute Memory
      const offset = addr - 0xFE00;
      if (offset < this.oam.length) {
        this.oam[offset] = val;
      }
    } else if (addr >= 0xFEA0 && addr < 0xFF00) {
      // (Attempt to) write to Unusable Memory
      console.log(`Error in Mem.writeByte: Attempt to write to unusable memory at addr ${addr.toString(16)}`);
    } else if (addr >= 0xFF00 && addr < 0xFF80) {
      // Write to I/O Registers
      // TODO -- special behavior here
      console.log(`TODO in Mem.writeByte: Write to I/O at ${addr.toString(16)}`);
      const offset = addr - 0xFF00;
      if (offset < this.io.length) {
        this.io[offset] = val;
      }
    } else if (addr >= 0xFF80 && addr < 0xFFFF) {
      // Write to High RAM
      const offset = addr - 0xFF80;
      if (offset < this.hram.length) {
        this.hram[offset] = val;
      }
    } else if (addr === 0xFFFF) {
      // Write to Interrupt Enable Register
      this.ie[0] = val;
    } else {
      console.log(`Error in Mem.writeByte: Attempted to write outside memory map at ${addr.toString(16)}`);
    }
  }

  readWord(addr: Address): UInt16 {
    const low = this.readByte(addr);
    const high = this.readByte((addr + 1) as Address);
    return (high << 8) | low; // Little-endian
  }

  writeWord(addr: Address, val: UInt16): void {
    this.writeByte(addr, val & 0xFF);
    this.writeByte((addr + 1) as Address, (val >> 8) & 0xFF);
  }
}