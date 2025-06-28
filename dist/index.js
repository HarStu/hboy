// @bun
// src/mem.ts
class Mem {
  romBanks;
  crb;
  vram;
  eramBanks;
  cerb;
  wram;
  oam;
  io;
  hram;
  ie;
  constructor(ROM) {
    this.romBanks = [];
    this.romBanks[0] = new Uint8Array(16384);
    this.crb = 1;
    this.vram = new Uint8Array(8192);
    this.eramBanks = [];
    this.cerb = -1;
    this.wram = new Uint8Array(8192);
    this.oam = new Uint8Array(159);
    this.io = new Uint8Array(127);
    this.hram = new Uint8Array(126);
    this.ie = new Uint8Array(1);
    if (ROM) {
      const romSize = Math.min(ROM.length, 16384);
      this.romBanks[0].set(ROM.subarray(0, romSize));
    }
  }
  readByte(addr) {
    if (addr >= 0 && addr < 16384) {
      const bank = this.romBanks[0];
      if (!bank) {
        throw new Error("ROM bank 0 not initialized");
      }
      const value = bank[addr];
      return value ?? 255;
    } else if (addr >= 16384 && addr < 32768) {
      const bank = this.romBanks[this.crb];
      if (!bank) {
        console.log(`WARN in Mem.readByte: ROM bank ${this.crb} not available`);
        return 255;
      }
      const value = bank[addr - 16384];
      return value ?? 255;
    } else if (addr >= 32768 && addr < 40960) {
      const value = this.vram[addr - 32768];
      return value ?? 255;
    } else if (addr >= 40960 && addr < 49152) {
      if (this.cerb !== -1) {
        const bank = this.eramBanks[this.cerb];
        if (!bank) {
          console.log(`WARN in Mem.readByte: External RAM bank ${this.cerb} not available`);
          return 255;
        }
        const value = bank[addr - 40960];
        return value ?? 255;
      } else {
        console.log(`WARN in Mem.readByte: Attempt to load from non-existent external RAM bank at ${addr.toString(16)}`);
        return 255;
      }
    } else if (addr >= 49152 && addr < 57344) {
      const value = this.wram[addr - 49152];
      return value ?? 255;
    } else if (addr >= 57344 && addr < 65024) {
      console.log(`WARN in Mem.readByte: Loaded from 'Echo Ram' at addr ${addr.toString(16)}`);
      const value = this.wram[addr - 57344];
      return value ?? 255;
    } else if (addr >= 65024 && addr < 65184) {
      const value = this.oam[addr - 65024];
      return value ?? 255;
    } else if (addr >= 65184 && addr < 65280) {
      console.log(`Error in Mem.readByte: Attempt to load unusable memory at addr ${addr.toString(16)}`);
      return 255;
    } else if (addr >= 65280 && addr < 65408) {
      const value = this.io[addr - 65280];
      return value ?? 255;
    } else if (addr >= 65408 && addr < 65535) {
      const value = this.hram[addr - 65408];
      return value ?? 255;
    } else if (addr === 65535) {
      const value = this.ie[0];
      return value ?? 255;
    } else {
      console.log(`Error in Mem.readByte: Attempt to load from outside memory map at ${addr.toString(16)}`);
      return 255;
    }
  }
  writeByte(addr, val) {
    if (val < 0 || val > 255) {
      console.log(`ERROR in Mem.writeByte: Attempt to write non-byte val ${val}`);
      return;
    }
    if (addr >= 0 && addr < 16384) {
      console.log(`TODO in Mem.writeByte: Attempt to write to Fixed ROM bank at ${addr.toString(16)}`);
    } else if (addr >= 16384 && addr < 32768) {
      console.log(`TODO in Mem.writeByte: Attempt to write to Switchable ROM bank at ${addr.toString(16)}`);
    } else if (addr >= 32768 && addr < 40960) {
      const offset = addr - 32768;
      if (offset < this.vram.length) {
        this.vram[offset] = val;
      }
    } else if (addr >= 40960 && addr < 49152) {
      if (this.cerb !== -1) {
        const bank = this.eramBanks[this.cerb];
        if (bank) {
          const offset = addr - 40960;
          if (offset < bank.length) {
            bank[offset] = val;
          }
        } else {
          console.log(`WARN in Mem.writeByte: External RAM bank ${this.cerb} not available`);
        }
      } else {
        console.log(`WARN in Mem.writeByte: Attempt to write to non-existent external RAM bank at ${addr.toString(16)}`);
      }
    } else if (addr >= 49152 && addr < 57344) {
      const offset = addr - 49152;
      if (offset < this.wram.length) {
        this.wram[offset] = val;
      }
    } else if (addr >= 57344 && addr < 65024) {
      console.log(`WARN in Mem.writeByte: Wrote to 'Echo Ram' at addr ${addr.toString(16)}`);
      const offset = addr - 57344;
      if (offset < this.wram.length) {
        this.wram[offset] = val;
      }
    } else if (addr >= 65024 && addr < 65184) {
      const offset = addr - 65024;
      if (offset < this.oam.length) {
        this.oam[offset] = val;
      }
    } else if (addr >= 65184 && addr < 65280) {
      console.log(`Error in Mem.writeByte: Attempt to write to unusable memory at addr ${addr.toString(16)}`);
    } else if (addr >= 65280 && addr < 65408) {
      console.log(`TODO in Mem.writeByte: Write to I/O at ${addr.toString(16)}`);
      const offset = addr - 65280;
      if (offset < this.io.length) {
        this.io[offset] = val;
      }
    } else if (addr >= 65408 && addr < 65535) {
      const offset = addr - 65408;
      if (offset < this.hram.length) {
        this.hram[offset] = val;
      }
    } else if (addr === 65535) {
      this.ie[0] = val;
    } else {
      console.log(`Error in Mem.writeByte: Attempted to write outside memory map at ${addr.toString(16)}`);
    }
  }
  readWord(addr) {
    const low = this.readByte(addr);
    const high = this.readByte(addr + 1);
    return high << 8 | low;
  }
  writeWord(addr, val) {
    this.writeByte(addr, val & 255);
    this.writeByte(addr + 1, val >> 8 & 255);
  }
}

// src/cpu.ts
class CPU {
  r;
  sp;
  pc;
  flags;
  mem;
  constructor(mem) {
    this.r = {
      a: 0,
      b: 0,
      c: 0,
      d: 0,
      e: 0,
      h: 0,
      l: 0,
      f: 0
    };
    this.sp = 0;
    this.pc = 0;
    this.flags = {
      z: false,
      n: false,
      h: false,
      c: false
    };
    this.mem = mem;
  }
  setr(reg, val) {
    if (reg in this.r && reg !== "f") {
      this.r[reg] = val & 255;
    } else if (["bc", "de", "hl", "af"].includes(reg)) {
      const reg16 = reg;
      this.r[reg16[0]] = (val & 65535) >> 8;
      this.r[reg16[1]] = val & 255;
      if (reg === "af") {
        this.flags.z = Boolean(this.r.f & 128);
        this.flags.n = Boolean(this.r.f & 64);
        this.flags.h = Boolean(this.r.f & 32);
        this.flags.c = Boolean(this.r.f & 16);
        this.r.f = this.r.f & 240;
      }
    } else if (["sp", "pc"].includes(reg)) {
      this[reg] = val & 65535;
    } else {
      console.log(`Error in CPU.setr: invalid register ${reg}`);
    }
  }
  getr(reg) {
    if (reg in this.r && reg !== "f") {
      return this.r[reg];
    } else if (["bc", "de", "hl", "af"].includes(reg)) {
      const reg16 = reg;
      const hi = this.r[reg16[0]];
      const lo = this.r[reg16[1]];
      if (reg === "af") {
        return hi << 8 | lo & 240;
      } else {
        return hi << 8 | lo;
      }
    } else if (["sp", "pc"].includes(reg)) {
      return this[reg];
    } else {
      console.log(`Error in CPU.getr: invalid register ${reg}`);
      return null;
    }
  }
  setf(flag, val) {
    if (["z", "n", "h", "c"].includes(flag) && typeof val === "boolean") {
      if (flag === "z") {
        this.flags.z = val;
      } else if (flag === "n") {
        this.flags.n = val;
      } else if (flag === "h") {
        this.flags.h = val;
      } else if (flag === "c") {
        this.flags.c = val;
      }
    } else {
      console.log(`Error in CPU.setf: invalid parameter(s): flag ${flag}, val ${val}`);
      return null;
    }
    let newf = 0;
    if (this.flags.z) {
      newf = newf | 128;
    }
    if (this.flags.n) {
      newf = newf | 64;
    }
    if (this.flags.h) {
      newf = newf | 32;
    }
    if (this.flags.c) {
      newf = newf | 16;
    }
    this.r.f = newf;
    return newf;
  }
  inc_pc(bytes) {
    this.pc = this.pc + bytes;
  }
  imm8() {
    return this.mem.readByte(this.getr("pc") + 1);
  }
  imm16() {
    const pc = this.getr("pc");
    return this.mem.readByte(pc + 2) << 8 | this.mem.readByte(pc + 1);
  }
  add8(a, b, sub = false) {
    let raw_result = 0;
    if (sub) {
      raw_result = a - b;
    } else {
      raw_result = a + b;
    }
    const trim_result = raw_result & 255;
    if (raw_result > 255 || sub && a < b) {
      this.setf("c", true);
    } else {
      this.setf("c", false);
    }
    if (sub) {
      if ((b & 15) > (a & 15)) {
        this.setf("h", true);
      } else {
        this.setf("h", false);
      }
    } else {
      if ((a & 15) + (b & 15) > 15) {
        this.setf("h", true);
      } else {
        this.setf("h", false);
      }
    }
    if (trim_result === 0) {
      this.setf("z", true);
    } else {
      this.setf("z", false);
    }
    if (sub) {
      this.setf("n", true);
    } else {
      this.setf("n", false);
    }
    return trim_result;
  }
  add16(a, b, sub = false) {
    let raw_result = 0;
    if (sub) {
      raw_result = a - b;
    } else {
      raw_result = a + b;
    }
    const trim_result = raw_result & 65535;
    if (raw_result > 65535 || sub && a < b) {
      this.setf("c", true);
    } else {
      this.setf("c", false);
    }
    if (sub) {
      if ((b & 4095) > (a & 4095)) {
        this.setf("h", true);
      } else {
        this.setf("h", false);
      }
    } else {
      if ((a & 4095) + (b & 4095) > 4095) {
        this.setf("h", true);
      } else {
        this.setf("h", false);
      }
    }
    if (trim_result === 0) {
      this.setf("z", true);
    } else {
      this.setf("z", false);
    }
    if (sub) {
      this.setf("n", true);
    } else {
      this.setf("n", false);
    }
    return trim_result;
  }
  add16_signed8(a16, b8) {
    let b8_signed;
    if (b8 > 127) {
      b8_signed = b8 - 256;
    } else {
      b8_signed = b8;
    }
    const raw_result = a16 + b8_signed;
    const trim_result = raw_result & 65535;
    if ((a16 & 255) + b8 > 255) {
      this.setf("c", true);
    } else {
      this.setf("c", false);
    }
    if ((a16 & 15) + (b8 & 15) > 15) {
      this.setf("h", true);
    } else {
      this.setf("h", false);
    }
    this.setf("z", false);
    this.setf("n", false);
    return trim_result;
  }
  ld_r8_r8(r8_1, r8_2) {
    this.setr(r8_1, this.getr(r8_2));
    this.inc_pc(1);
    return 1;
  }
  ld_r8_imm8(r8) {
    this.setr(r8, this.imm8());
    this.inc_pc(2);
    return 2;
  }
  ld_r8_r16ptr(r8, r16ptr) {
    this.setr(r8, this.mem.readByte(this.getr(r16ptr)));
    this.inc_pc(1);
    return 2;
  }
  ld_r16ptr_r8(r16ptr, r8) {
    this.mem.writeByte(this.getr(r16ptr), this.getr(r8));
    this.inc_pc(1);
    return 2;
  }
  ld_r16ptr_imm8(r16ptr) {
    this.mem.writeByte(this.getr(r16ptr), this.imm8());
    this.inc_pc(2);
    return 3;
  }
  ld_r8_imm16ptr(r8) {
    this.setr(r8, this.mem.readByte(this.imm16()));
    this.inc_pc(3);
    return 4;
  }
  ld_imm16ptr_r8(r8) {
    this.mem.writeByte(this.imm16(), this.getr(r8));
    this.inc_pc(3);
    return 4;
  }
  ld_a_ffcptr() {
    this.setr("a", this.mem.readByte(this.getr("c") + 65280));
    this.inc_pc(1);
    return 2;
  }
  ld_ffcptr_a() {
    this.mem.writeByte(this.getr("c") + 65280, this.getr("a"));
    this.inc_pc(1);
    return 2;
  }
  ld_a_ffimm8ptr() {
    this.setr("a", this.mem.readByte(this.imm8() + 65280));
    this.inc_pc(2);
    return 3;
  }
  ld_ffimm8ptr_a() {
    this.mem.writeByte(this.imm8() + 65280, this.getr("a"));
    this.inc_pc(2);
    return 3;
  }
  ld_a_hl_dec() {
    const cur_hl = this.getr("hl");
    this.setr("a", this.mem.readByte(cur_hl));
    this.setr("hl", cur_hl - 1 & 65535);
    this.inc_pc(1);
    return 2;
  }
  ld_hl_a_dec() {
    const cur_hl = this.getr("hl");
    this.mem.writeByte(cur_hl, this.getr("a"));
    this.setr("hl", cur_hl - 1 & 65535);
    this.inc_pc(1);
    return 2;
  }
  ld_a_hl_inc() {
    const cur_hl = this.getr("hl");
    this.setr("a", this.mem.readByte(cur_hl));
    this.setr("hl", cur_hl + 1 & 65535);
    this.inc_pc(1);
    return 2;
  }
  ld_hl_a_inc() {
    const cur_hl = this.getr("hl");
    this.mem.writeByte(cur_hl, this.getr("a"));
    this.setr("hl", cur_hl + 1 & 65535);
    this.inc_pc(1);
    return 2;
  }
  ld_r16_imm16(r16) {
    this.setr(r16, this.imm16());
    this.inc_pc(3);
    return 3;
  }
  ld_imm16ptr_sp() {
    this.mem.writeByte(this.imm16(), this.sp);
    this.inc_pc(3);
    return 5;
  }
  ld_sp_hl() {
    this.sp = this.getr("hl");
    this.inc_pc(1);
    return 2;
  }
  push_r16(r16) {
    const cur_sp = this.sp;
    const r16_val = this.getr(r16);
    const r16_msb = (r16_val & 65280) >> 8;
    const r16_lsb = r16_val & 255;
    this.mem.writeByte(cur_sp - 1 & 65535, r16_msb);
    this.mem.writeByte(cur_sp - 2 & 65535, r16_lsb);
    this.sp = cur_sp - 2 & 65535;
    this.inc_pc(1);
    return 4;
  }
  pop_r16(r16) {
    const cur_sp = this.sp;
    this.setr(r16[0], this.mem.readByte(cur_sp + 1 & 65535));
    this.setr(r16[1], this.mem.readByte(cur_sp));
    this.sp = cur_sp + 2 & 65535;
    this.inc_pc(1);
    return 3;
  }
  ld_hl_sp_plus_e() {
    const adj_sp = this.add16_signed8(this.sp, this.imm8());
    this.setr("hl", adj_sp);
    this.inc_pc(2);
    return 3;
  }
}

// src/disasm.ts
import fs from "fs";
function readROM(filename) {
  try {
    return fs.readFileSync(filename);
  } catch (error) {
    console.error(`Error reading file: ${error.message}`);
    process.exit(1);
  }
}
function grab8BitArg(rom, addr) {
  if (addr + 1 < rom.length) {
    return "$" + rom[addr + 1].toString(16).padStart(2, "0").toUpperCase();
  } else {
    console.error("Error: tried to fetch out-of-bounds argument");
    process.exit(1);
  }
}
function grab16BitArg(rom, addr) {
  if (addr + 2 < rom.length) {
    return "$" + (rom[addr + 1] | rom[addr + 2] << 8).toString(16).padStart(4, "0").toUpperCase();
  } else {
    console.error("Error: tried to fetch out-of-bounds argument");
    process.exit(1);
  }
}
function disassemble(rom, startAddr, length) {
  let addr = startAddr;
  const endAddr = startAddr + length;
  const instructions = [];
  while (addr < endAddr) {
    const [instruction, bytes] = decodeOpcode(rom, addr);
    instructions.push(instruction);
    addr += bytes;
  }
  console.log("completed disassembly");
  for (let i = 0;i < instructions.length; i++) {
    console.log(instructions[i]);
  }
}
function disassembleInstruction(rom, addr) {
  const [instruction, bytes] = decodeOpcode(rom, addr);
  return { instruction, bytes };
}
var r8 = {
  0: "B",
  1: "C",
  2: "D",
  3: "E",
  4: "H",
  5: "L",
  6: "[HL]",
  7: "A"
};
var r16 = {
  0: "BC",
  1: "DE",
  2: "HL",
  3: "SP"
};
var r16stk = {
  0: "BC",
  1: "DE",
  2: "HL",
  3: "AF"
};
var r16mem = {
  0: "BC",
  1: "DE",
  2: "HL+",
  3: "HL-"
};
var cond = {
  0: "NZ",
  1: "Z",
  2: "NC",
  3: "C"
};
function decodeOpcode(rom, addr) {
  let bytes = 1;
  let opcode = rom[addr];
  let instruction = `***ILLEGAL INSTRUCTION***: $${opcode.toString(16).padStart(2, "0").toUpperCase()}`;
  const pat1 = (opcode & 192) >> 6;
  const pat2 = (opcode & 48) >> 4;
  const pat3 = (opcode & 56) >> 3;
  const pat4 = (opcode & 24) >> 3;
  const pat5 = opcode & 7;
  const pat6 = opcode & 15;
  const pat7 = opcode & 63;
  if (opcode == 203) {
    console.log("CB opcodes -- todo!");
    instruction = "--CB PLACEHOLDER--";
    bytes += 1;
    if (addr + 1 < rom.length) {
      opcode = rom[addr + 1];
      switch (pat1) {
        case 0:
          switch (pat3) {
            case 0:
              instruction = `RLC ${r8[pat5]}`;
              break;
            case 1:
              instruction = `RRC ${r8[pat5]}`;
              break;
            case 2:
              instruction = `RL ${r8[pat5]}`;
              break;
            case 3:
              instruction = `RR ${r8[pat5]}`;
              break;
            case 4:
              instruction = `SLA ${r8[pat5]}`;
              break;
            case 5:
              instruction = `SRA ${r8[pat5]}`;
              break;
            case 6:
              instruction = `SWAP ${r8[pat5]}`;
              break;
            case 7:
              instruction = `SRL ${r8[pat5]}`;
              break;
          }
          break;
        case 1:
          instruction = `BIT $${pat3.toString(16).padStart(2, "0")}, ${r8[pat5]}`;
          break;
        case 2:
          instruction = `RES $${pat3.toString(16).padStart(2, "0")}, ${r8[pat5]}`;
          break;
        case 3:
          instruction = `SET $${pat3.toString(16).padStart(2, "0")}, ${r8[pat5]}`;
          break;
      }
    } else {
      console.error("Error: tried to fetch out-of-bounds followup to CB opcode");
      process.exit(1);
    }
  } else {
    switch (pat1) {
      case 0:
        switch (pat6) {
          case 0:
            instruction = "NOP";
            break;
          case 1:
            bytes += 2;
            instruction = `LD ${r16[pat2]}, ${grab16BitArg(rom, addr)}`;
            break;
          case 2:
            instruction = `LD ${r16mem[pat2]}, A`;
            break;
          case 10:
            instruction = `LD A, ${r16mem[pat2]}`;
            break;
          case 8:
            bytes += 2;
            instruction = `LD ${grab16BitArg(rom, addr)}, SP`;
            break;
          case 3:
            instruction = `INC ${r16[pat2]}`;
            break;
          case 11:
            instruction = `DEC ${r16[pat2]}`;
            break;
          case 9:
            instruction = `ADD HL, ${r16[pat2]}`;
            break;
          default:
            switch (pat5) {
              case 4:
                instruction = `INC ${r8[pat2]}`;
                break;
              case 5:
                instruction = `DEC ${r8[pat2]}`;
                break;
              case 6:
                bytes += 1;
                instruction = `LD ${r8[pat2]}, ${grab8BitArg(rom, addr)}`;
                break;
              case 7:
                switch (pat3) {
                  case 0:
                    instruction = "RLCA";
                    break;
                  case 1:
                    instruction = "RRCA";
                    break;
                  case 2:
                    instruction = "RLA";
                    break;
                  case 3:
                    instruction = "RRA";
                    break;
                  case 4:
                    instruction = "DAA";
                    break;
                  case 5:
                    instruction = "CPL";
                    break;
                  case 6:
                    instruction = "SCF";
                    break;
                  case 7:
                    instruction = "CCF";
                    break;
                }
                break;
              case 0:
                switch (pat3) {
                  case 3:
                    bytes += 1;
                    instruction = `JR ${grab8BitArg(rom, addr)}`;
                    break;
                  case 2:
                    instruction = "STOP";
                    break;
                }
                break;
            }
            break;
        }
        break;
      case 1:
        if (opcode == 118) {
          instruction = "HALT";
        } else {
          instruction = `LD ${r8[pat3]}, ${r8[pat5]}`;
        }
        break;
      case 2:
        switch (pat3) {
          case 0:
            instruction = `ADD A, ${r8[pat5]}`;
            break;
          case 1:
            instruction = `ADC A, ${r8[pat5]}`;
            break;
          case 2:
            instruction = `SUB A, ${r8[pat5]}`;
            break;
          case 3:
            instruction = `SBC A, ${r8[pat5]}`;
            break;
          case 4:
            instruction = `AND A, ${r8[pat5]}`;
            break;
          case 5:
            instruction = `XOR A, ${r8[pat5]}`;
            break;
          case 6:
            instruction = `OR A, ${r8[pat5]}`;
            break;
          case 7:
            instruction = `CP A, ${r8[pat5]}`;
            break;
        }
        break;
      case 3:
        if (pat5 == 6) {
          switch (pat3) {
            case 0:
              bytes += 1;
              instruction = `ADD A, ${grab8BitArg(rom, addr)}`;
              break;
            case 1:
              bytes += 1;
              instruction = `ADC A, ${grab8BitArg(rom, addr)}`;
              break;
            case 2:
              bytes += 1;
              instruction = `SUB A, ${grab8BitArg(rom, addr)}`;
              break;
            case 3:
              bytes += 1;
              instruction = `SBC A, ${grab8BitArg(rom, addr)}`;
              break;
            case 4:
              bytes += 1;
              instruction = `AND A, ${grab8BitArg(rom, addr)}`;
              break;
            case 5:
              bytes += 1;
              instruction = `XOR A, ${grab8BitArg(rom, addr)}`;
              break;
            case 6:
              bytes += 1;
              instruction = `OR A, ${grab8BitArg(rom, addr)}`;
              break;
            case 7:
              bytes += 1;
              instruction = `CP A, ${grab8BitArg(rom, addr)}`;
              break;
          }
        } else {
          switch (pat7) {
            case 9:
              instruction = "RET";
              break;
            case 25:
              instruction = "RETI";
              break;
            case 3:
              bytes += 2;
              instruction = `JP ${grab16BitArg(rom, addr)}`;
              break;
            case 41:
              instruction = `JP HL`;
              break;
            case 205:
              bytes += 2;
              instruction = `CALL ${grab16BitArg(rom, addr)}`;
              break;
            case 34:
              instruction = `LDH [${r8[1]}], A`;
              break;
            case 32:
              bytes += 1;
              instruction = `LDH [${grab8BitArg(rom, addr)}], A`;
              break;
            case 42:
              bytes += 2;
              instruction = `LD [${grab16BitArg(rom, addr)}], A`;
              break;
            case 50:
              bytes += 2;
              instruction = `LDH A, [${r8[1]}]`;
              break;
            case 48:
              bytes += 1;
              instruction = `LDH A, [${grab8BitArg(rom, addr)}]`;
              break;
            case 58:
              bytes += 2;
              instruction = `LD A, [${grab16BitArg(rom, addr)}]`;
              break;
            case 40:
              bytes += 1;
              instruction = `ADD SP, ${grab8BitArg(rom, addr)}`;
              break;
            case 56:
              bytes += 1;
              instruction = `LD HL, SP + ${grab8BitArg(rom, addr)}`;
              break;
            case 57:
              instruction = `LD SP, HL`;
              break;
            case 51:
              instruction = "DI";
              break;
            case 59:
              instruction = "EI";
              break;
            default:
              switch (pat5) {
                case 0:
                  instruction = `RET ${cond[pat4]}`;
                  break;
                case 2:
                  bytes += 2;
                  instruction = `JP ${cond[pat4]}, ${grab16BitArg(rom, addr)}`;
                  break;
                case 4:
                  bytes += 2;
                  instruction = `CALL ${cond[pat4]}, ${grab16BitArg(rom, addr)}`;
                  break;
                case 7:
                  instruction = `RST ${(8 * pat3).toString(16).padStart(2, "0")}`;
                  break;
                case 1:
                  instruction = `POP ${r16stk[pat2]}`;
                  break;
                case 5:
                  instruction = `PUSH ${r16stk[pat2]}`;
                  break;
              }
              break;
          }
        }
        break;
    }
  }
  return [instruction, bytes];
}
if (process.argv[1] && process.argv[1].endsWith("disasm.ts") || process.argv[1] && process.argv[1].endsWith("disasm.js")) {
  if (process.argv.length < 3) {
    console.log("Usage: node disasm.js <rom-file> [start-address] [length]");
    process.exit(1);
  }
  const romFile = process.argv[2];
  const startAddr = process.argv[3] ? parseInt(process.argv[3], 16) : 0;
  const length = process.argv[4] ? parseInt(process.argv[4], 16) : 256;
  if (romFile) {
    try {
      const rom = readROM(romFile);
      disassemble(rom, startAddr, length);
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  }
}

// src/gb.ts
class GB {
  mem;
  cpu;
  constructor(rom) {
    this.mem = new Mem(rom);
    this.cpu = new CPU(this.mem);
  }
  run() {
    console.log("GameBoy emulator running...");
  }
  step() {
    const pc = this.cpu.getr("pc");
    console.log(`PC: 0x${pc.toString(16).padStart(4, "0")}`);
  }
  disassembleAtPC() {
    const pc = this.cpu.getr("pc");
    const rom = new Uint8Array(32768);
    const result = disassembleInstruction(rom, pc);
    return result.instruction;
  }
  getMem() {
    return this.mem;
  }
  getCPU() {
    return this.cpu;
  }
  reset() {
    this.cpu.setr("pc", 256);
    this.cpu.setr("sp", 65534);
    this.cpu.setr("af", 432);
    this.cpu.setr("bc", 19);
    this.cpu.setr("de", 216);
    this.cpu.setr("hl", 333);
  }
}

// src/index.ts
function main() {
  console.log("\uD83C\uDFAE Game Boy Emulator Starting...");
  console.log(`
--- Testing Memory System ---`);
  testMemorySystem();
  console.log(`
--- Testing CPU System ---`);
  testCPUSystem();
  console.log(`
--- Testing Full Game Boy System ---`);
  testGameBoySystem();
  console.log(`
\u2705 All systems operational!`);
}
function testMemorySystem() {
  const memory = new Mem;
  const testAddr = 32768;
  const testValue = 255;
  try {
    memory.writeByte(testAddr, testValue);
    const readValue = memory.readByte(testAddr);
    console.log(`Memory test: wrote 0x${testValue.toString(16)}, read 0x${readValue.toString(16)}`);
    if (readValue === testValue) {
      console.log("\u2705 Basic memory operations working");
    } else {
      console.log("\u274C Memory test failed");
    }
    const wordAddr = 33024;
    const wordValue = 4660;
    memory.writeWord(wordAddr, wordValue);
    const readWord = memory.readWord(wordAddr);
    console.log(`Word test: wrote 0x${wordValue.toString(16)}, read 0x${readWord.toString(16)}`);
    if (readWord === wordValue) {
      console.log("\u2705 Word operations working");
    } else {
      console.log("\u274C Word test failed");
    }
  } catch (error) {
    console.error("\u274C Error during memory tests:", error);
  }
}
function testCPUSystem() {
  const memory = new Mem;
  const cpu = new CPU(memory);
  try {
    cpu.setr("a", 66);
    cpu.setr("bc", 4660);
    const regA = cpu.getr("a");
    const regBC = cpu.getr("bc");
    console.log(`CPU register test: A=0x${regA.toString(16)}, BC=0x${regBC.toString(16)}`);
    if (regA === 66 && regBC === 4660) {
      console.log("\u2705 CPU register operations working");
    } else {
      console.log("\u274C CPU register test failed");
    }
    cpu.setf("z", true);
    cpu.setf("c", false);
    console.log("\u2705 CPU flag operations working");
    const result = cpu.add8(16, 32);
    console.log(`CPU arithmetic test: 0x10 + 0x20 = 0x${result.toString(16)}`);
    if (result === 48) {
      console.log("\u2705 CPU arithmetic working");
    } else {
      console.log("\u274C CPU arithmetic test failed");
    }
  } catch (error) {
    console.error("\u274C Error during CPU tests:", error);
  }
}
function testGameBoySystem() {
  try {
    const gameboy = new GB;
    gameboy.reset();
    const cpu = gameboy.getCPU();
    const pc = cpu.getr("pc");
    const sp = cpu.getr("sp");
    console.log(`Game Boy initialized: PC=0x${pc.toString(16)}, SP=0x${sp.toString(16)}`);
    if (pc === 256 && sp === 65534) {
      console.log("\u2705 Game Boy system initialization working");
    } else {
      console.log("\u274C Game Boy initialization test failed");
    }
    const instruction = gameboy.disassembleAtPC();
    console.log(`Disassembly at PC: ${instruction}`);
    console.log("\u2705 Disassembler integration working");
  } catch (error) {
    console.error("\u274C Error during Game Boy tests:", error);
  }
}
main();

//# debugId=AD4FB59149EF5BA264756E2164756E21
//# sourceMappingURL=index.js.map
