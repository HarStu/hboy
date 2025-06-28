/**
 * Models the state and behavior of the Gameboy's CPU
 */

import { Mem } from './mem.js';
import { UInt8, UInt16, Address, Reg8, Reg16, CpuFlag } from './types.js';

interface Registers8 {
  a: UInt8;
  b: UInt8;
  c: UInt8;
  d: UInt8;
  e: UInt8;
  h: UInt8;
  l: UInt8;
  f: UInt8;
}

interface CpuFlags {
  // Bit 7 -- Zero Flag
  z: boolean;
  // Bit 6 -- Subtraction Flag (BCD)
  n: boolean;
  // Bit 5 -- Half Carry flag (BCD)
  h: boolean;
  // Big 4 -- Carry flag
  c: boolean;
}

export class CPU {
  // Initalize 8-bit registers
  private r: Registers8;
  // Initalize special 16-bit registers
  private sp: UInt16;
  private pc: UInt16;
  // Flags, contained within the lower eight bits of the af register
  // In essense, the 'f' register is where these are stored
  private flags: CpuFlags;
  // The memory associated with the CPU
  private mem: Mem;

  constructor(mem: Mem) {
    // Initalize 8-bit registers
    this.r = {
      a: 0x00,
      b: 0x00,
      c: 0x00,
      d: 0x00,
      e: 0x00,
      h: 0x00,
      l: 0x00,
      f: 0x00
    };
    // Initalize special 16-bit registers
    this.sp = 0x00;
    this.pc = 0x00;

    // Flags, contained within the lower eight bits of the af register
    // In essense, the 'f' register is where these are stored
    this.flags = {
      // Bit 7 -- Zero Flag
      z: false,
      // Bit 6 -- Subtraction Flag (BCD)
      n: false,
      // Bit 5 -- Half Carry flag (BCD)
      h: false,
      // Big 4 -- Carry flag
      c: false
    };

    // The memory associated with the CPU
    this.mem = mem;
  }

  // Set the value of register 'reg' to 'val'
  setr(reg: Reg8 | Reg16, val: UInt8 | UInt16): void {
    // Todo -- maybe apply a warning here where there's an attempt to store values greater
    // than 8/16 bits?

    // NOTE -- accepts 16-bit values in BIG ENDIAN format!
    // So if ('bc', 0xAFCD) is passed as val, 0xAFCD is going straight into r.bc
    // When storing (little-endian) values from memory in 16-bit registers, make sure
    // to swap them from little-to-big-endian first

    if (reg in this.r && reg !== 'f') {
      this.r[reg as Reg8] = (val & 0xFF) as UInt8;
    } else if (['bc', 'de', 'hl', 'af'].includes(reg)) {
      const reg16 = reg as Reg16;
      // set Hi value
      this.r[reg16[0] as Reg8] = ((val & 0xFFFF) >> 8) as UInt8;
      // set Lo value
      this.r[reg16[1] as Reg8] = (val & 0xFF) as UInt8;

      // If the af register is the one being set, make sure flags are handled
      if (reg === 'af') {
        this.flags.z = Boolean(this.r.f & 0b10000000);
        this.flags.n = Boolean(this.r.f & 0b01000000);
        this.flags.h = Boolean(this.r.f & 0b00100000);
        this.flags.c = Boolean(this.r.f & 0b00010000);
        // Make sure bottom 4 bits are zero'd out
        this.r.f = (this.r.f & 0b11110000) as UInt8;
      }
    } else if (['sp', 'pc'].includes(reg)) {
      (this as any)[reg] = (val & 0xFFFF) as UInt16;
    } else {
      console.log(`Error in CPU.setr: invalid register ${reg}`);
    }
  }

  // Get the value of 'reg'
  getr(reg: Reg8 | Reg16): UInt8 | UInt16 | null {
    if (reg in this.r && reg !== 'f') {
      return this.r[reg as Reg8];
    } else if (['bc', 'de', 'hl', 'af'].includes(reg)) {
      const reg16 = reg as Reg16;
      const hi = this.r[reg16[0] as Reg8];
      const lo = this.r[reg16[1] as Reg8];
      if (reg === 'af') {
        // Zero out the bottom four bits of af just in case
        // in hardware, these always read as zero
        return (hi << 8 | (lo & 0b11110000)) as UInt16;
      } else {
        // otherwise return the combination of hi and lo
        return (hi << 8 | lo) as UInt16;
      }
    } else if (['sp', 'pc'].includes(reg)) {
      return (this as any)[reg] as UInt16;
    } else {
      console.log(`Error in CPU.getr: invalid register ${reg}`);
      return null;
    }
  }

  // Set specific flag
  setf(flag: CpuFlag, val: boolean): UInt8 | null {
    // check that paramters are valid and update appropriate flag
    if (['z', 'n', 'h', 'c'].includes(flag) && typeof val === "boolean") {
      if (flag === 'z') {
        this.flags.z = val;
      } else if (flag === 'n') {
        this.flags.n = val;
      } else if (flag === 'h') {
        this.flags.h = val;
      } else if (flag === 'c') {
        this.flags.c = val;
      }
    } else {
      console.log(`Error in CPU.setf: invalid parameter(s): flag ${flag}, val ${val}`);
      return null;
    }
    // update value of f register based on flag in question
    // z = bit 7
    // n = bit 6
    // h = bit 5
    // c = bit 4
    // bits 0-3 are always set to 0
    let newf = 0b00000000;
    if (this.flags.z) {
      newf = newf | 0b10000000;
    }
    if (this.flags.n) {
      newf = newf | 0b01000000;
    }
    if (this.flags.h) {
      newf = newf | 0b00100000;
    }
    if (this.flags.c) {
      newf = newf | 0b00010000;
    }
    this.r.f = newf as UInt8;

    return newf as UInt8;
  }

  // Increment the stack pointer by a number of bytes
  inc_pc(bytes: number): void {
    this.pc = (this.pc + bytes) as UInt16;
  }

  // Grab the byte of data immediately following the program counter
  imm8(): UInt8 {
    return this.mem.readByte((this.getr('pc') as UInt16 + 1) as Address);
  }

  // Grab the two bytes of data immediately following the program counter (they are little-endian in memory)
  imm16(): UInt16 {
    const pc = this.getr('pc') as UInt16;
    return (this.mem.readByte((pc + 2) as Address) << 8 | this.mem.readByte((pc + 1) as Address)) as UInt16;
  }

  // Add (or subtract) 8-bit values against each other
  add8(a: UInt8, b: UInt8, sub: boolean = false): UInt8 {
    let raw_result = 0;
    if (sub) {
      raw_result = a - b;
    } else {
      raw_result = a + b;
    }
    const trim_result = (raw_result & 0xFF) as UInt8;

    // manage carry flag
    if (raw_result > 0xFF || (sub && a < b)) {
      this.setf('c', true);
    } else {
      this.setf('c', false);
    }

    // manage half carry flag
    if (sub) {
      if ((b & 0xF) > (a & 0xF)) {
        this.setf('h', true);
      } else {
        this.setf('h', false);
      }
    } else {
      if ((a & 0xF) + (b & 0xF) > 0xF) {
        this.setf('h', true);
      } else {
        this.setf('h', false);
      }
    }

    // manage zero flag
    if (trim_result === 0) {
      this.setf('z', true);
    } else {
      this.setf('z', false);
    }

    // manage subtraction flag
    if (sub) {
      this.setf('n', true);
    } else {
      this.setf('n', false);
    }

    return trim_result;
  }

  // Add (or subtract) 16-bit values against each other
  add16(a: UInt16, b: UInt16, sub: boolean = false): UInt16 {
    let raw_result = 0;
    if (sub) {
      raw_result = a - b;
    } else {
      raw_result = a + b;
    }
    const trim_result = (raw_result & 0xFFFF) as UInt16;

    // manage carry flag
    if (raw_result > 0xFFFF || (sub && a < b)) {
      this.setf('c', true);
    } else {
      this.setf('c', false);
    }

    // manage half carry flag (for 16-bit operations, this is bit 11)
    if (sub) {
      if ((b & 0xFFF) > (a & 0xFFF)) {
        this.setf('h', true);
      } else {
        this.setf('h', false);
      }
    } else {
      if ((a & 0xFFF) + (b & 0xFFF) > 0xFFF) {
        this.setf('h', true);
      } else {
        this.setf('h', false);
      }
    }

    // manage zero flag
    if (trim_result === 0) {
      this.setf('z', true);
    } else {
      this.setf('z', false);
    }

    // manage subtraction flag
    if (sub) {
      this.setf('n', true);
    } else {
      this.setf('n', false);
    }

    return trim_result;
  }

  // Add a signed 8-bit value to a 16-bit value
  add16_signed8(a16: UInt16, b8: UInt8): UInt16 {
    // here, b8 is interpreted as SIGNED
    // adding an 8-bit value to a 16-bit value doesn't naturally wrap
    // after clamping the way adding two values of the same size do
    // consider how 0xFF could be +255 (unsigned) or -1 (signed)
    // if we add it to 0x0002 (16-bit 2):
    //   0x0002 + 255 = 0x0101 -> clamp w/ & 0xFFFF = 0x0101
    //   0x0002 -   1 = 0x0001 -> clamp w/ & 0xFFFF = 0x0001
    // These don't match!
    // now consider this case, where we add it to 0x02 (8-bit 2):
    //   0x02 + 255 = 0x101    -> clamp w/ & 0xFF = 0x01
    //   0x02 -   1 = 0x01     -> clamp w/ & 0xFF = 0x01
    // When adding an 8-bit number to a 16-bit number, the overflow occurs
    // at bit 15, not bit 7. This means we need to manually account for 
    // if we're interpreting the value as signed or unsigned in a way that
    // is automatically handled by our clamping when adding 8-bit to 8-bit
    let b8_signed: number;
    if (b8 > 127) {
      b8_signed = b8 - 256;
    } else {
      b8_signed = b8;
    }
    const raw_result = a16 + b8_signed;
    const trim_result = (raw_result & 0xFFFF) as UInt16;

    //however, all the flag logic still considers b8 as unsigned
    // manage carry flag based on low byte addition
    if (((a16 & 0xFF) + b8) > 0xFF) {
      this.setf('c', true);
    } else {
      this.setf('c', false);
    }

    // manage half carry flag
    if ((a16 & 0xF) + (b8 & 0xF) > 0xF) {
      this.setf('h', true);
    } else {
      this.setf('h', false);
    }

    // Always clear the z and n flags
    this.setf('z', false);
    this.setf('n', false);

    return trim_result;
  }

  // ----------------
  // CPU INSTRUCTIONS
  // ----------------
  // All instructions return the duration in machine cycles

  // -----------------------
  // 8-BIT LOAD INSTRUCTIONS
  // -----------------------
  // Load TO r8_1 FROM r8_2
  ld_r8_r8(r8_1: Reg8, r8_2: Reg8): number {
    this.setr(r8_1, this.getr(r8_2) as UInt8);
    this.inc_pc(1);
    return 1;
  }

  // Load TO r8 FROM immediate byte
  ld_r8_imm8(r8: Reg8): number {
    this.setr(r8, this.imm8());
    this.inc_pc(2);
    return 2;
  }

  // Load TO r8 FROM data at absolute address specified by r16
  ld_r8_r16ptr(r8: Reg8, r16ptr: Reg16): number {
    this.setr(r8, this.mem.readByte(this.getr(r16ptr) as Address));
    this.inc_pc(1);
    return 2;
  }

  // Load TO data at absolute address specified by r16 FROM r8
  ld_r16ptr_r8(r16ptr: Reg16, r8: Reg8): number {
    this.mem.writeByte(this.getr(r16ptr) as Address, this.getr(r8) as UInt8);
    this.inc_pc(1);
    return 2;
  }

  // Load TO data at absolute address specified by r16ptr FROM immediate byte
  ld_r16ptr_imm8(r16ptr: Reg16): number {
    this.mem.writeByte(this.getr(r16ptr) as Address, this.imm8());
    this.inc_pc(2);
    return 3;
  }

  // Load TO r8 FROM data at absolute address specified by immediate two bytes
  ld_r8_imm16ptr(r8: Reg8): number {
    this.setr(r8, this.mem.readByte(this.imm16() as Address));
    this.inc_pc(3);
    return 4;
  }

  // Load TO data at absolute address specified by immediate two bytes FROM r8
  ld_imm16ptr_r8(r8: Reg8): number {
    this.mem.writeByte(this.imm16() as Address, this.getr(r8) as UInt8);
    this.inc_pc(3);
    return 4;
  }

  // Load TO a FROM data at absolute address specified by register C + 0xFF00
  ld_a_ffcptr(): number {
    this.setr('a', this.mem.readByte((this.getr('c') as UInt8 + 0xFF00) as Address));
    this.inc_pc(1);
    return 2;
  }

  // Load TO data at absolute address specified by register C + 0xFF00 FROM a
  ld_ffcptr_a(): number {
    this.mem.writeByte((this.getr('c') as UInt8 + 0xFF00) as Address, this.getr('a') as UInt8);
    this.inc_pc(1);
    return 2;
  }

  // Load TO a FROM data at absolute address specified by immediate byte + 0xFF00
  ld_a_ffimm8ptr(): number {
    this.setr('a', this.mem.readByte((this.imm8() + 0xFF00) as Address));
    this.inc_pc(2);
    return 3;
  }

  // Load TO data at absolute address specified by immediate byte + 0xFF00 FROM a
  ld_ffimm8ptr_a(): number {
    this.mem.writeByte((this.imm8() + 0xFF00) as Address, this.getr('a') as UInt8);
    this.inc_pc(2);
    return 3;
  }

  // Load TO a FROM data at absolute address specified by hl
  // Decrement hl
  ld_a_hl_dec(): number {
    // current hl as of the time execution of this operation begins
    const cur_hl = this.getr('hl') as UInt16;
    this.setr('a', this.mem.readByte(cur_hl as Address));
    // decrement hl with 16-bit wrap-around using bitwise and
    this.setr('hl', (cur_hl - 1) & 0xFFFF);
    this.inc_pc(1);
    return 2;
  }

  // Load TO data at absolute address specified by hl FROM a
  // Decrement hl
  ld_hl_a_dec(): number {
    // current hl as of the time execution of this operation begins
    const cur_hl = this.getr('hl') as UInt16;
    this.mem.writeByte(cur_hl as Address, this.getr('a') as UInt8);
    // decrement hl with 16-bit wrap-around using bitwise and
    this.setr('hl', (cur_hl - 1) & 0xFFFF);
    this.inc_pc(1);
    return 2;
  }

  // Load TO a FROM data at absolute address specified by hl
  // Increment hl
  ld_a_hl_inc(): number {
    // current hl as of the time execution of this operation begins
    const cur_hl = this.getr('hl') as UInt16;
    this.setr('a', this.mem.readByte(cur_hl as Address));
    // increment hl with 16-bit wrap-around using bitwise and
    this.setr('hl', (cur_hl + 1) & 0xFFFF);
    this.inc_pc(1);
    return 2;
  }

  // Load TO data at absolute address specified by hl FROM a
  // Increment hl
  ld_hl_a_inc(): number {
    // current hl as of the time execution of this operation begins
    const cur_hl = this.getr('hl') as UInt16;
    this.mem.writeByte(cur_hl as Address, this.getr('a') as UInt8);
    // increment hl with 16-bit wrap-around using bitwise and
    this.setr('hl', (cur_hl + 1) & 0xFFFF);
    this.inc_pc(1);
    return 2;
  }

  // -----------------------
  // 16-BIT LOAD INSTUCTIONS
  // -----------------------
  // Load TO r16 FROM immediate two bytes
  ld_r16_imm16(r16: Reg16): number {
    this.setr(r16, this.imm16());
    this.inc_pc(3);
    return 3;
  }

  // Load TO the data at absolute address specified by immediate two bytes FROM sp
  ld_imm16ptr_sp(): number {
    this.mem.writeByte(this.imm16() as Address, this.sp);
    this.inc_pc(3);
    return 5;
  }

  // Load TO sp FROM hl
  ld_sp_hl(): number {
    this.sp = this.getr('hl') as UInt16;
    this.inc_pc(1);
    return 2;
  }

  // Push TO stack memory FROM r16
  push_r16(r16: Reg16): number {
    // current sp as of the time execution of this operation begins
    const cur_sp = this.sp;
    // words in memory are stored little-endian; the least significant byte is first
    // registers are big-endian; the most significant byte is first
    // grab the msb and lsb from r16
    const r16_val = this.getr(r16) as UInt16;
    const r16_msb = (r16_val & 0xFF00) >> 8;
    const r16_lsb = (r16_val) & 0xFF;

    // write the msb first (at a higher position in memory)
    this.mem.writeByte(((cur_sp - 1) & 0xFFFF) as Address, r16_msb as UInt8);
    // write the lsb second (at a lower position in memory)
    // being at a lower position, it comes 'first' in memory -- little-endian
    this.mem.writeByte(((cur_sp - 2) & 0xFFFF) as Address, r16_lsb as UInt8);

    // set the sp to its new value
    this.sp = ((cur_sp - 2) & 0xFFFF) as UInt16;
    this.inc_pc(1);
    return 4;
  }

  // Pop TO r16 FROM stack memory
  pop_r16(r16: Reg16): number {
    // current sp as of the time execution of this operation begins
    const cur_sp = this.sp;

    // words in memory are stored little-endian; the least significant byte is first
    // registers are big-endian; the most significant byte is first
    // since r16 is denoted by a string, we can index is to grab its constituent 8-bit registers
    // then set them accordingly (lsb from earlier in memory, msb from later in memory)
    this.setr(r16[0] as Reg8, this.mem.readByte(((cur_sp + 1) & 0xFFFF) as Address)); // set msb
    this.setr(r16[1] as Reg8, this.mem.readByte(cur_sp as Address)); // set lsb

    //set the sp to its new value
    this.sp = ((cur_sp + 2) & 0xFFFF) as UInt16;

    // while 'pop af' completely re-writes the f register, flag updates are handled in setr
    this.inc_pc(1);
    return 3;
  }

  // Load TO hl FROM adjusted sp
  ld_hl_sp_plus_e(): number {
    // 'adjusted sp' refers to sp plus signed imm8
    const adj_sp = this.add16_signed8(this.sp, this.imm8());
    this.setr('hl', adj_sp);
    this.inc_pc(2);
    return 3;
  }
} 