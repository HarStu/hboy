// Import the file system module
import fs from 'fs';
import { constants } from 'os';

// Check if we have enough command line arguments
if (process.argv.length < 3) {
    console.log('Usage: node disasm.js <rom-file> [start-address] [length]');
    process.exit(1);
}


// Get the ROM filename from command line arguments
const romFile = process.argv[2];
// Get the start address (optional, default to 0)
const startAddr = process.argv[3] ? parseInt(process.argv[3], 16) : 0;
// Get optional length (default 100 bytes)
const length = process.argv[4] ? parseInt(process.argv[4], 16) : 0x100;

function readROM(filename) {
    try {
        // Read the file synchronously as a buffer (array of bytes)
        return fs.readFileSync(filename);
    } catch (error) {
        console.error(`Error reading file ${error.message}`);
        process.exit(1);
    }
}

function grab8BitArg(rom, addr) {
    if (addr + 1 < rom.length) {
        return "$" + (rom[addr+1]).toString(16).padStart(2, '0').toUpperCase();
    } else {
        console.error("Error: tried to fetch out-of-bounds argument");
        process.exit(1);
    }
}

function grab16BitArg(rom, addr) {       
    if (addr + 2 < rom.length) {
    return "$" + (rom[addr+1] | rom[addr+2] << 8).toString(16).padStart(4, '0').toUpperCase();
    } else {
        console.error("Error: tried to fetch out-of-bounds argument");
        process.exit(1)
    }
}

function disassemble(rom, startAddr, length) {
    let addr = startAddr
    const endAddr = startAddr + length;
    const instructions = [];

    while (addr < endAddr) {
        const [instruction, bytes] = decodeOpcode(rom, addr);
        instructions.push(instruction);
        addr += bytes;
    }

    console.log("completed disassembly");
    for (let i = 0; i < instructions.length; i++) {
        console.log(instructions[i]);
    }
}

// Many opcodes vary only in register paramters
// Within these opcodes registers in question are denoted by the associated value
const r8 = {
    0b000: "B",
    0b001: "C",
    0b010: "D",
    0b011: "E",
    0b100: "H",
    0b101: "L",
    0b110: "[HL]",
    0b111: "A"
};

const r16 = {
    0b000: "BC",
    0b001: "DE",
    0b010: "HL",
    0b011: "SP",
}

const r16stk = {
    0b000: "BC",
    0b001: "DE",
    0b010: "HL",
    0b011: "AF",
}

const r16mem = {
    0b000: "BC",
    0b001: "DE",
    0b010: "HL+",
    0b011: "HL-",
}

const cond = {
    0b000: "NZ",
    0b001: "Z",
    0b010: "NC",
    0b011: "C"
}

function decodeOpcode(rom, addr) {
    // Assume the instruction has no additional data bytes after the opcode until shown 
    // otherwise
    let bytes = 1;

    // Grab the opcode 
    let opcode = rom[addr];

    // By default, we don't know what this is
    let instruction = `***ILLEGAL INSTRUCTION***: $${opcode.toString(16).padStart(2, '0').toUpperCase()}`;

    // Grab some bit patterns from within the opcode
    // At some point I might want better names for these 
    // 11000000
    const pat1 = (opcode & 0b11000000) >> 6;

    // 00110000
    const pat2 = (opcode & 0b00110000) >> 4;

    // 00111000
    const pat3 = (opcode & 0b00111000) >> 3;

    // 00011000
    const pat4 = (opcode & 0b00011000) >> 3;

    // 00000111
    const pat5 = (opcode & 0b00000111);

    // 00001111
    const pat6 = (opcode & 0b00001111);

    // 00111111
    const pat7 = (opcode & 0b00111111);

    // Process CB opcodes
    if (opcode == 0xCB) {
        console.log("CB opcodes -- todo!")
        instruction = "--CB PLACEHOLDER--";

        // All CB-opcode instructions are two bytes
        // The first is the CB prefix, the second actually details the behavior
        // in this sense, the second 'is' the opcode, rather than a conventional argument
        bytes += 1

        if (addr + 1 < rom.length) {
            opcode = rom[addr+1]
            switch (pat1) {
                case 0b00:
                    switch (pat3) {
                        case 0b000:
                            instruction = `RLC ${r8[pat5]}`;
                            break;
                        case 0b001:
                            instruction = `RRC ${r8[pat5]}`;
                            break;
                        case 0b010:
                            instruction = `RL ${r8[pat5]}`;
                            break;
                        case 0b011:
                            instruction = `RR ${r8[pat5]}`;
                            break;
                        case 0b100:
                            instruction = `SLA ${r8[pat5]}`;
                            break;
                        case 0b101:
                            instruction = `SRA ${r8[pat5]}`;
                            break;
                        case 0b110:
                            instruction = `SWAP ${r8[pat5]}`;
                            break;
                        case 0b111:
                            instruction = `SRL ${r8[pat5]}`;
                            break;
                    }
                    break;
                case 0b01:
                    instruction = `BIT $${pat3.toString(16).padStart(2, '0')}, ${r8[pat5]}`;
                    break;
                case 0b10:
                    instruction = `RES $${pat3.toString(16).padStart(2, '0')}, ${r8[pat5]}`;
                    break;
                case 0b11:
                    instruction = `SET $${pat3.toString(16).padStart(2, '0')}, ${r8[pat5]}`;
                    break;
            }
        } else {
            console.error("Error: tried to fetch out-of-bounds followup to CB opcode");
            process.exit(1);
        }
       
    // Process non-CB opcodes
    } else {
        
        // Switch statment for first two bits
        switch (pat1) {
            // Case for first two bits 00
            case 0b00:
                // Switch on first-two 00 opcodes distinguished by last four bits
                switch (pat6) {
                    case 0b0000:
                        instruction = "NOP";
                        break;
                    case 0b0001:
                        bytes += 2;
                        instruction = `LD ${r16[pat2]}, ${grab16BitArg(rom, addr)}`;
                        break;
                    case 0b0010:
                        instruction = `LD ${r16mem[pat2]}, A`;
                        break;
                    case 0b1010:
                        instruction = `LD A, ${r16mem[pat2]}`;
                        break;
                    case 0b1000:
                        bytes += 2;
                        instruction = `LD ${grab16BitArg(rom, addr)}, SP`;
                        break;
                    case 0b0011:
                        instruction = `INC ${r16[pat2]}`;
                        break;
                    case 0b1011:
                        instruction = `DEC ${r16[pat2]}`;
                        break;
                    case 0b1001:
                        instruction = `ADD HL, ${r16[pat2]}`;
                        break;
        
                    // Now handle the first-two 00 opcodes distinguished by the last three bits
                    default: 
                        switch (pat5) {
                            case 0b100:
                                instruction = `INC ${r8[pat2]}`;
                                break;
                            case 0b101:
                                instruction = `DEC ${r8[pat2]}`;
                                break;
                            case 0b110:
                                bytes += 1;
                                instruction = `LD ${r8[pat2]}, ${grab8BitArg(rom, addr)}`; 
                                break;
                            case 0b111:
                                // Eight unique single-instruction opcodes make up the first-two
                                // 00 AND last-three 000 opcodes
                                switch (pat3) {
                                    case 0b000:
                                        instruction = "RLCA";
                                        break;
                                    case 0b001:
                                        instruction = "RRCA";
                                        break;
                                    case 0b010:
                                        instruction = "RLA";
                                        break;
                                    case 0b011:
                                        instruction = "RRA";
                                        break;
                                    case 0b100:
                                        instruction = "DAA";
                                        break;
                                    case 0b101:
                                        instruction = "CPL";
                                        break;
                                    case 0b110:
                                        instruction = "SCF";
                                        break;
                                    case 0b111:
                                        instruction = "CCF";
                                        break;
                                }
                                break;
                            case 0b000:
                                switch (pat3) {
                                    case 0b011:
                                        bytes += 1
                                        instruction = `JR ${grab8BitArg(rom, addr)}`;
                                        break;
                                    case 0b010:
                                        instruction = "STOP";
                                        break;
                                }
                                break;
                        }
                    break;
                }
                break;

            // Case for first two bits 01
            case 0b01:
                // Halt instruction is a unqiue case of the 8-bit register-to-register load
                // Specifically, LD [HL], [HL]
                if (opcode == 0b01110110) {
                    instruction = "HALT";
                } else {
                    instruction = `LD ${r8[pat3]}, ${r8[pat5]}`;
                }
                break;

            // Case for first two bits 10
            case 0b10:
                // All of this is 8-bit arithmetic, split on pat3
                switch(pat3) {
                    case 0b000:
                        instruction = `ADD A, ${r8[pat5]}`;
                        break
                    case 0b001:
                        instruction = `ADC A, ${r8[pat5]}`;
                        break;
                    case 0b010:
                        instruction = `SUB A, ${r8[pat5]}`;
                        break;
                    case 0b011:
                        instruction = `SBC A, ${r8[pat5]}`;
                        break;
                    case 0b100:
                        instruction = `AND A, ${r8[pat5]}`;
                        break;
                    case 0b101:
                        instruction = `XOR A, ${r8[pat5]}`;
                        break;
                    case 0b110:
                        instruction = `OR A, ${r8[pat5]}`;
                        break;
                    case 0b111:
                        instruction = `CP A, ${r8[pat5]}`;
                        break;
                }
                break; 
            
            // Case for first two bits on 11
            case 0b11:
                // First-two 11, last-three 110 instructions are all 8-bit arithmetic between
                // a register and an argument
                if (pat5 == 0b110) {
                    switch(pat3) {
                        case 0b000:
                            bytes += 1;
                            instruction = `ADD A, ${grab8BitArg(rom, addr)}`;
                            break;
                        case 0b001:
                            bytes += 1;
                            instruction = `ADC A, ${grab8BitArg(rom, addr)}`;
                            break;
                        case 0b010:
                            bytes += 1;
                            instruction = `SUB A, ${grab8BitArg(rom, addr)}`;
                            break;
                        case 0b011:
                            bytes += 1;
                            instruction = `SBC A, ${grab8BitArg(rom, addr)}`;
                            break;
                        case 0b100:
                            bytes += 1;
                            instruction = `AND A, ${grab8BitArg(rom, addr)}`;
                            break;
                        case 0b101:
                            bytes += 1;
                            instruction = `XOR A, ${grab8BitArg(rom, addr)}`;
                            break;
                        case 0b110:
                            bytes += 1;
                            instruction = `OR A, ${grab8BitArg(rom, addr)}`;
                            break;
                        case 0b111:
                            bytes += 1;
                            instruction = `CP A, ${grab8BitArg(rom, addr)}`;
                            break;
                    }
                } else {
                    // Many one-off unique opcodes here, and few that use reg bit patterns
                    // We'll do all the one-offs, then handle the patterns in the default case
                    //
                    // This particular organization probably makes sense for the disassembler
                    // but might be worth revisiting when developing the emulator
                    switch (pat7) {
                        case 0b001001:
                            instruction = "RET";
                            break;
                        case 0b011001:
                            instruction = "RETI";
                            break;
                        case 0b000011:
                            bytes += 2;
                            instruction = `JP ${grab16BitArg(rom, addr)}`;
                            break;
                        case 0b101001:
                            instruction = `JP HL`;
                            break;
                        case 0b11001101:
                            bytes += 2
                            instruction = `CALL ${grab16BitArg(rom, addr)}`;
                            break;
                        case 0b100010:
                            instruction = `LDH [${r8[0b001]}], A`;
                            break;
                        case 0b100000:
                            bytes += 1;
                            instruction = `LDH [${grab8BitArg(rom, addr)}], A`;
                            break;
                        case 0b101010:
                            bytes += 2;
                            instruction = `LD [${grab16BitArg(rom, addr)}], A`;
                            break;
                        case 0b110010:
                            bytes += 2;
                            instruction = `LDH A, [${r8[0b001]}]`;
                            break;
                        case 0b110000:
                            bytes += 1;
                            instruction = `LDH A, [${grab8BitArg(rom, addr)}]`;
                            break;
                        case 0b111010:
                            bytes += 2;
                            instruction = `LD A, [${grab16BitArg(rom, addr)}]`;
                            break;
                        case 0b101000:
                            bytes += 1;
                            instruction = `ADD SP, ${grab8BitArg(rom, addr)}`;
                            break;
                        case 0b111000:
                            bytes += 1;
                            instruction = `LD HL, SP + ${grab8BitArg(rom, addr)}`;
                            break;
                        case 0b111001:
                            instruction = `LD SP, HL`;
                            break;
                        case 0b110011:
                            instruction = "DI"
                            break;
                        case 0b111011:
                            instruction = "EI"
                            break;

                        default:
                            switch (pat5) {
                                case 0b000:
                                    instruction = `RET ${cond[pat4]}`;
                                    break;
                                case 0b010:
                                    bytes += 2;
                                    instruction = `JP ${cond[pat4]}, ${grab16BitArg(rom, addr)}`
                                    break;
                                case 0b100:
                                    bytes += 2;
                                    instruction = `CALL ${cond[pat4]}, ${grab16BitArg(rom, addr)}`
                                    break;
                                case 0b111:
                                    instruction = `RST ${(8 * pat3).toString(16).padStart(2, "0")}`;
                                    break;
                                case 0b001:
                                    instruction = `POP ${r16stk[pat2]}`;
                                    break; 
                                case 0b101:
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

// Main execution
try {
    const rom = readROM(romFile);
    disassemble(rom, startAddr, length);
} catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
}