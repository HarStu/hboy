// Basic number sizes for clarity
export type Byte = number & { __type: 'byte' };
export type Word = number & { __type: 'word' };

// 8-bit registers
export type R8 = 'a' | 'b' | 'c' | 'd' | 'e' | 'h' | 'l' | 'f';

// 16-bit resgisters
export type R16 = 'af' | 'bc' | 'de' | 'hl' | 'sp' | 'pc';

// All register union
export type Reg = R8 | R16;

// Flags 
export type flag = 'z' | 'n' | 'h' | 'c';
