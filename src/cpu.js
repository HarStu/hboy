/**
 * Models the state and behavior of the Gameboy's CPU
 */

import Mem from './mem.js';

class CPU {
    constructor() {
        // Initalize 8-bit registers
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
        // Initalize special 16-bit registers
        this.sp = 0x00;
        this.pc = 0x00;

        // Flags, contained within the lower eight bits of the AF register
        // In essense, the 'F' register is where these are stored
        this.flags = {
            // Bit 7 -- Zero Flag
            'z': false,
            // Bit 6 -- Subtraction Flag (BCD)
            'n': false,
            // Bit 5 -- Half Carry flag (BCD)
            'h': false,
            // Big 4 -- Carry flag
            'c': false
        }

        // The memory associated with the CPU
        this.mem = new Mem();
    }

    // Set the value of register 'reg' to 'val'
    setr(reg, val) {
        // Todo -- maybe apply a warning here where there's an attempt to store values greater
        // than 8/16 bits?

        // NOTE -- accepts 16-bit values in BIG ENDIAN format!
        // So if ('bc', 0xAFCD) is passed as val, 0xAFCD is going straight into r.bc
        // When storing (little-endian) values from memory in 16-bit registers, make sure
        // to swap them from little-to-big-endian first
        if (reg in this.r && reg != 'f') {
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
        } else if (['sp', 'pc'].includes(reg)){
            this[reg] = (val & 0xFFFF);
        } else {
            console.log(`Error in CPU.setr: invalid register ${reg}`);
        }
    }

    // Get the value of 'reg'
    getr(reg) {
        if (reg in this.r && reg != 'f') {
            return this.r[reg];
        } else if (['bc', 'de', 'hl', 'af'].includes(reg)) {
            let hi = this.r[reg[0]];
            let lo = this.r[reg[1]];
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

    //Increment the stack pointer by 1
    inc_sp() {
        this.sp++;
    }

    // CPU INSTRUCTIONS
    // All instructions return the duration in machine cycles

    // Load the value of reg2 into reg1
    ld_r8_r8(reg1, reg2) {
        this.setr(reg1, this.getr(reg2));
        this.inc_sp();
        return 1;
    }

    // Load the immediate data n into register reg
    ld_r8_n(reg) {
        this.setr(reg, this.mem.readByte(this.getr('pc')+1));
        this.inc_sp();
        return 2;
    }
}