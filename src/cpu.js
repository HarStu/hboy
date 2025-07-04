/**
 * Models the state and behavior of the Gameboy's CPU
 */

import { buildOpcodeTable } from "./opcodes.js";

export class CPU {
  constructor(mem) {
    // Initialize 8-bit registers
    this.r = {
      'a': 0x00,
      'b': 0x00,
      'c': 0x00,
      'd': 0x00,
      'e': 0x00,
      'h': 0x00,
      'l': 0x00,
      'f': 0x00
    }
    // Initialize special 16-bit registers
    this.sp = 0x00;
    this.pc = 0x00;

    // Flags, contained within the lower eight bits of the AF register
    // In essence, the 'F' register is where these are stored
    this.flags = {
      // Bit 7 -- Zero Flag
      'z': false,
      // Bit 6 -- Subtraction Flag (BCD)
      'n': false,
      // Bit 5 -- Half Carry flag (BCD)
      'h': false,
      // Bit 4 -- Carry flag
      'c': false
    }

    // The memory associated with the CPU
    this.mem = mem;

    this.opcodes = buildOpcodeTable(this)
  }

  // Set the value of register 'reg' to 'val'
  setr(reg, val, fok = false) {
    // Todo -- maybe apply a warning here where there's an attempt to store values greater
    // than 8/16 bits?

    // NOTE -- accepts 16-bit values in BIG ENDIAN format!
    // So if ('bc', 0xAFCD) is passed as val, 0xAFCD is going straight into r.bc
    // When storing (little-endian) values from memory in 16-bit registers, make sure
    // to swap them from little-to-big-endian first
    if (reg in this.r && (reg != 'f' || fok)) {
      this.r[reg] = (val & 0xFF);
    } else if (['bc', 'de', 'hl', 'af'].includes(reg)) {
      // set Hi value
      this.r[reg[0]] = (val & 0xFFFF) >> 8;
      // set Lo value
      this.r[reg[1]] = (val & 0xFF);

      // If the af register is the one being set, make sure flags are handled
      if (reg == 'af') {
        this.flags.z = Boolean(this.r.f & 0b10000000);
        this.flags.n = Boolean(this.r.f & 0b01000000);
        this.flags.h = Boolean(this.r.f & 0b00100000);
        this.flags.c = Boolean(this.r.f & 0b00010000);
        // Make sure bottom 4 bits are zero'd out
        this.r.f = this.r.f & 0b11110000;
      }
    } else if (['sp', 'pc'].includes(reg)) {
      this[reg] = (val & 0xFFFF);
    } else {
      console.log(`Error in CPU.setr: invalid register ${reg}`);
    }
  }

  // fetch, decode, and execute a single instruction
  fde() {
    const op = this.mem.readByte(this.pc);
    this.inc_pc(1);
    this.opcodes[op]();
  }

  // fde with some extra commentary
  test_fde() {
    const op = this.mem.readByte(this.pc);
    console.log(`fde cycle starting at: ${this.pc}`)
    this.inc_pc(1);
    console.log(`Executing instruction: ${op.toString(16)}`);
    this.opcodes[op]();
  }

  // Get the value of 'reg'
  getr(reg, fok) {
    if (reg in this.r && (reg != 'f' || fok)) {
      return this.r[reg];
    } else if (['bc', 'de', 'hl', 'af'].includes(reg)) {
      const hi = this.r[reg[0]];
      const lo = this.r[reg[1]];
      if (reg == 'af') {
        // Zero out the bottom four bits of af just in case
        // in hardware, these always read as zero
        return (hi << 8 | (lo & 0b11110000));
      } else {
        // otherwise return the combination of hi and lo
        return (hi << 8 | lo);
      }
    } else if (['sp', 'pc'].includes(reg)) {
      return this[reg];
    } else {
      console.log(`Error in CPU.getr: invalid register ${reg}`);
      return null;
    }
  }


  // Set specific flag
  setf(flag, val) {
    // check that parameters are valid and update appropriate flag
    if (['z', 'n', 'h', 'c'].includes(flag) && typeof val === "boolean") {
      if (flag == 'z') {
        this.flags.z = val;
      } else if (flag == 'n') {
        this.flags.n = val;
      } else if (flag == 'h') {
        this.flags.h = val;
      } else if (flag == 'c') {
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
    this.r.f = newf

    return newf
  }

  // Increment the program counter by a number of bytes
  inc_pc(bytes) {
    this.pc = (this.pc + bytes) & 0xFFFF;
  }

  // Grab the byte of data immediately following the program counter
  imm8() {
    const byte = this.mem.readByte(this.getr('pc'));
    this.inc_pc(1);
    return byte;
  }

  // Grab the two bytes of data immediately following the program counter (they are little-endian in memory)
  imm16() {
    const word = this.mem.readByte(this.getr('pc') + 1) << 8 | this.mem.readByte(this.getr('pc'));
    this.inc_pc(2);
    return word;
  }

  // Helper function to make addition arith8 call more immediately readable without repeating code
  add8(a, b, use_cin = false, up_c = true) {
    return this.arith8(a, b, false, use_cin, up_c)
  }

  // Helper function to make subtraction arith8 call more immediately readable without repeating code
  sub8(a, b, use_cin = false, up_c = true) {
    return this.arith8(a, b, true, use_cin, up_c)
  }

  // Add (or subtract) 8-bit values against each other
  arith8(a, b, sub = false, use_cin = false, up_c = true) {
    let raw_result = 0;
    // value of carry flag when the execution begins
    const cin = this.flags.c ? 1 : 0
    if (sub) {
      raw_result = a - b;
      use_cin && (raw_result -= cin);
    } else {
      raw_result = a + b;
      use_cin && (raw_result += cin);
    }
    let trim_result = raw_result & 0xFF;

    // manage carry flag
    if (up_c) {
      if (raw_result > 0xFF || (sub && raw_result < 0)) {
        this.setf('c', true);
      } else {
        this.setf('c', false);
      }
    }

    // manage half carry flag
    if (sub) {
      if ((a & 0xF) - (b & 0xF) - (use_cin ? cin : 0) < 0) {
        this.setf('h', true);
      } else {
        this.setf('h', false)
      }
    } else {
      if ((a & 0xF) + (b & 0xF) + (use_cin ? cin : 0) > 0xF) {
        this.setf('h', true);
      } else {
        this.setf('h', false);
      }
    }

    // manage zero flag
    if (trim_result == 0) {
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
  add16_signed8(a16, b8) {
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
    const b8_signed = (b8 > 127) ? b8 - 256 : b8

    const raw_result = a16 + b8_signed;
    const trim_result = raw_result & 0xFFFF;

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

  skip(info = undefined) {
    if (info) {
      console.log(info)
    }
    return 1;
  }

  // Nop
  nop() {
    return 1;
  }

  // -----------------------
  // 8-BIT LOAD INSTRUCTIONS
  // -----------------------
  // Load TO r8_1 FROM r8_2
  ld_r8_r8(r8_1, r8_2) {
    this.setr(r8_1, this.getr(r8_2));
    return 1;
  }

  // Load TO r8 FROM immediate byte
  ld_r8_imm8(r8) {
    this.setr(r8, this.imm8());
    return 2;
  }

  // Load TO r8 FROM data at absolute address specified by r16
  ld_r8_r16ptr(r8, r16ptr) {
    this.setr(r8, this.mem.readByte(this.getr(r16ptr)));
    return 2;
  }

  // Load TO data at absolute address specified by r16 FROM r8
  ld_r16ptr_r8(r16ptr, r8) {
    this.mem.writeByte(this.getr(r16ptr), this.getr(r8));
    return 2;
  }

  // Load TO data at absolute address specified by r16ptr FROM immediate byte
  ld_r16ptr_imm8(r16ptr) {
    this.mem.writeByte(this.getr(r16ptr), this.imm8());
    return 3;
  }

  // Load TO a FROM data at absolute address specified by immediate two bytes
  ld_a_imm16ptr() {
    this.setr('a', this.mem.readByte(this.imm16()));
    return 4;
  }

  // Load TO data at absolute address specified by immediate two bytes FROM r8
  ld_imm16ptr_r8(r8) {
    this.mem.writeByte(this.imm16(), this.getr(r8));
    return 4;
  }

  // Load TO a FROM data at absolute address specified by register C + 0xFF00
  ld_a_ffcptr() {
    this.setr('a', this.mem.readByte(this.getr('c') + 0xFF00));
    return 2;
  }

  // Load TO data at absolute address specified by register C + 0xFF00 FROM a
  ld_ffcptr_a() {
    this.mem.writeByte(this.getr('c') + 0xFF00, this.getr('a'));
    return 2;
  }

  // Load TO a FROM data at absolute address specified by immediate byte + 0xFF00
  ld_a_ffimm8ptr() {
    this.setr('a', this.mem.readByte(this.imm8() + 0xFF00));
    return 3;
  }

  // Load TO data at absolute address specified by immediate byte + 0xFF00 FROM a
  ld_ffimm8ptr_a() {
    this.mem.writeByte(this.imm8() + 0xFF00, this.getr('a'));
    return 3;
  }

  // Load TO a FROM data at absolute address specified by hl
  // Decrement hl
  ld_a_hl_dec() {
    // current hl as of the time execution of this operation begins
    const cur_hl = this.getr('hl');
    this.setr('a', this.mem.readByte(cur_hl));
    // decrement hl with 16-bit wrap-around using bitwise and
    this.setr('hl', (cur_hl - 1) & 0xFFFF);
    return 2;
  }

  // Load TO data at absolute address specified by hl FROM a
  // Decrement hl
  ld_hl_a_dec() {
    // current hl as of the time execution of this operation begins
    const cur_hl = this.getr('hl');
    this.mem.writeByte(cur_hl, this.getr('a'));
    // decrement hl with 16-bit wrap-around using bitwise and
    this.setr('hl', (cur_hl - 1) & 0xFFFF);
    return 2;
  }

  // Load TO a FROM data at absolute address specified by hl
  // Increment hl
  ld_a_hl_inc() {
    // current hl as of the time execution of this operation begins
    const cur_hl = this.getr('hl');
    this.setr('a', this.mem.readByte(cur_hl));
    // increment hl with 16-bit wrap-around using bitwise and
    this.setr('hl', (cur_hl + 1) & 0xFFFF);
    return 2;
  }

  // Load TO data at absolute address specified by hl FROM a
  // Increment hl
  ld_hl_a_inc() {
    // current hl as of the time execution of this operation begins
    const cur_hl = this.getr('hl');
    this.mem.writeByte(cur_hl, this.getr('a'));
    // increment hl with 16-bit wrap-around using bitwise and
    this.setr('hl', (cur_hl + 1) & 0xFFFF);
    return 2;
  }

  // -----------------------
  // 16-BIT LOAD INSTRUCTIONS
  // -----------------------
  // Load TO r16 FROM immediate two bytes
  ld_r16_imm16(r16) {
    this.setr(r16, this.imm16());
    return 3;
  }

  // Load TO the data at absolute address specified by immediate two bytes FROM sp
  ld_imm16ptr_sp() {
    const sp = this.getr('sp');
    const msb = (sp & 0xFF00) >> 8; // s
    const lsb = (sp & 0x00FF) // p
    this.mem.writeByte(this.imm16(), lsb);
    this.mem.writeByte((this.imm16() + 1) & 0xFFFF, msb)
    return 5;
  }

  // Load TO sp FROM hl
  ld_sp_hl() {
    this.setr('sp', this.getr('hl'));
    return 2;
  }

  // Push TO stack memory FROM r16
  push_r16(r16) {
    // current sp as of the time execution of this operation begins
    const cur_sp = this.getr('sp');
    // words in memory are stored little-endian; the least significant byte is first
    // registers are big-endian; the most significant byte is first
    // grab the msb and lsb from r16
    const r16_msb = (this.getr(r16) & 0xFF00) >> 8;
    const r16_lsb = (this.getr(r16)) & 0xFF

    // write the msb first (at a higher position in memory)
    this.mem.writeByte((cur_sp - 1) & 0xFFFF, r16_msb);
    // write the lsb second (at a lower position in memory)
    // being at a lower position, it comes 'first' in memory -- little-endian
    this.mem.writeByte((cur_sp - 2) & 0xFFFF, r16_lsb);

    // set the sp to its new value
    this.setr('sp', (cur_sp - 2) & 0xFFFF);
    return 4;
  }

  // Pop TO r16 FROM stack memory
  pop_r16(r16) {
    // current sp as of the time execution of this operation begins
    const cur_sp = this.getr('sp');

    // words in memory are stored little-endian; the least significant byte is first
    // registers are big-endian; the most significant byte is first
    // so we grab each of the bytes from memory, build a word with the mem
    const mem_lsb = this.mem.readByte(cur_sp)
    const mem_msb = this.mem.readByte((cur_sp + 1) & 0xFFFF)
    const word = mem_msb << 8 | mem_lsb
    this.setr(r16, word)

    //set the sp to its new value
    this.setr('sp', (cur_sp + 2) & 0xFFFF);

    // while 'pop af' completely re-writes the f register, flag updates are handled in setr
    return 3;
  }

  // Load TO hl FROM adjusted sp
  ld_hl_sp_plus_e() {
    // 'adjusted sp' refers to sp plus signed imm8
    const adj_sp = this.add16_signed8(this.getr('sp'), this.imm8());
    this.setr('hl', adj_sp);
    return 3;
  }

  // -----------------------------
  // 8-BIT ARITHMETIC INSTRUCTIONS
  // -----------------------------
  // Load TO a FROM a + r8
  add_a_r8(r8) {
    const res = this.add8(this.getr('a'), this.getr(r8))
    this.setr('a', res);
    return 1;
  }

  // Load TO a FROM a + data at absolute address specified by hl 
  add_a_hlptr() {
    const res = this.add8(this.getr('a'), this.mem.readByte(this.getr('hl')));
    this.setr('a', res);
    return 2;
  }

  // Load TO a FROM a + immediate byte
  add_a_imm8() {
    const res = this.add8(this.getr('a'), this.imm8());
    this.setr('a', res);
    return 2;
  }

  // Load TO a FROM a + r8 + carry flag 
  adc_a_r8(r8) {
    const res = this.add8(this.getr('a'), this.getr(r8), true);
    this.setr('a', res);
    return 1
  }

  // Load TO a FROM a + data at absolute address specific by hl + carry flag
  adc_a_hlptr() {
    const res = this.add8(this.getr('a'), this.mem.readByte(this.getr('hl')), true);
    this.setr('a', res);
    return 2;
  }

  // Load TO a FROM a + immediate byte + carry flag
  adc_a_imm8() {
    const res = this.add8(this.getr('a'), this.imm8(), true);
    this.setr('a', res);
    return 2;
  }

  // Load TO a FROM a - r8
  sub_a_r8(r8) {
    const res = this.sub8(this.getr('a'), this.getr(r8));
    this.setr('a', res);
    return 1;
  }

  // Load TO a FROM a - data at absolute address specified by hl 
  sub_a_hlptr() {
    const res = this.sub8(this.getr('a'), this.mem.readByte(this.getr('hl')));
    this.setr('a', res);
    return 2;
  }

  // Load TO a FROM a - immediate byte
  sub_a_imm8() {
    const res = this.sub8(this.getr('a'), this.imm8());
    this.setr('a', res);
    return 2;
  }

  // Load TO a FROM a - r8 - carry flag
  sbc_a_r8(r8) {
    const res = this.sub8(this.getr('a'), this.getr(r8), true);
    this.setr('a', res);
    return 1;
  }

  // Load TO a FROM a - data at absolute address specified by hl - carry flag
  sbc_a_hlptr() {
    const res = this.sub8(this.getr('a'), this.mem.readByte(this.getr('hl')), true);
    this.setr('a', res);
    return 2;
  }

  // Load TO a FROM a - immediate byte - carry flag
  sbc_a_imm8() {
    const res = this.sub8(this.getr('a'), this.imm8(), true);
    this.setr('a', res);
    return 2;
  }

  // Compare a WITH r8
  // updates flags like sub_a_r8, but discards the result
  cp_a_r8(r8) {
    this.sub8(this.getr('a'), this.getr(r8));
    return 1;
  }

  // Compare a WITH data at absolute address specified by hl
  // updates flags like sub_a_hlptr, but discards the result
  cp_a_hlptr() {
    this.sub8(this.getr('a'), this.mem.readByte(this.getr('hl')));
    return 2;
  }

  // Compare a WITH immediate byte
  // updates flags like sub_a_imm8, but discards the result
  cp_a_imm8() {
    this.sub8(this.getr('a'), this.imm8());
    return 2;
  }

  // Increment r8
  inc_r8(r8) {
    const res = this.add8(this.getr(r8), 1, false, false);
    this.setr(r8, res);
    return 1;
  }

  // Increment data at absolute address specified by hl
  inc_hlptr() {
    const res = this.add8(this.mem.readByte(this.getr('hl')), 1, false, false);
    this.mem.writeByte(this.getr('hl'), res);
    return 3;
  }

  // Decrement r8
  dec_r8(r8) {
    const res = this.sub8(this.getr(r8), 1, false, false);
    this.setr(r8, res);
    return 1;
  }

  // Decrement data at absolute address specified by hl
  dec_hlptr() {
    const res = this.sub8(this.mem.readByte(this.getr('hl')), 1, false, false);
    this.mem.writeByte(this.getr('hl'), res);
    return 3;
  }

}