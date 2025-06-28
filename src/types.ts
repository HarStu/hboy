/**
 * Types for the GameBoy emulator
 * Documentation only, compile to plain numbers
 * Will enhance with runtime validation down the line if necessary
 */

/** 8-bit unsigned integer (0-255) */
export type UInt8 = number;

/** 16-bit unsigned integer (0-65535) */
export type UInt16 = number;

/** 16-bit address (0x0000-0xFFFF) */
export type Address = number;

/** 8-bit register (a, b, c, d, e, h, l, f) */
export type Reg8 = 'a' | 'b' | 'c' | 'd' | 'e' | 'h' | 'l' | 'f';

/** 16-bit register (bc, de, hl, af, sp, pc) */
export type Reg16 = 'bc' | 'de' | 'hl' | 'af' | 'sp' | 'pc';

/** Opcode value (0-255) */
export type Opcode = UInt8;