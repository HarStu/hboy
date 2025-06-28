/**
 * Types for the GameBoy emulator
 * These provide type safety and documentation for emulator values
 */

/** 8-bit unsigned integer (0-255) */
export type UInt8 = number;

/** 16-bit unsigned integer (0-65535) */
export type UInt16 = number;

/** 16-bit memory address (0x0000-0xFFFF) */
export type Address = number;

/** CPU instruction opcode (0x00-0xFF) */
export type Opcode = UInt8;

/** 8-bit CPU register names */
export type Reg8 = 'a' | 'b' | 'c' | 'd' | 'e' | 'h' | 'l' | 'f';

/** 16-bit CPU register names */
export type Reg16 = 'bc' | 'de' | 'hl' | 'af' | 'sp' | 'pc';

/** CPU flags in the F register */
export type CpuFlag = 'z' | 'n' | 'h' | 'c';

/** Memory bank number */
export type BankNumber = number;

/** Clock cycles for instruction timing */
export type Cycles = number;