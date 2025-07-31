// Basic number sizes for clarity
export type Byte = number;
export type Word = number;

// 8-bit registers
export type R8 = 'a' | 'b' | 'c' | 'd' | 'e' | 'h' | 'l' | 'f';

// 16-bit resgisters
export type R16 = 'af' | 'bc' | 'de' | 'hl' | 'sp' | 'pc';

// All register union
export type Reg = R8 | R16;

// Flags 
export type Flag = 'z' | 'n' | 'h' | 'c';

// Opcode related types
export type OpcodeHandler = () => number;
export type OpcodeTable = Record<Byte, OpcodeHandler>
