import { Mem } from './mem.js';
import { UInt8, UInt16, Address } from './types.js';

/**
 * Game Boy Emulator Entry Point
 */
function main(): void {
  console.log('🎮 Game Boy Emulator Starting...');

  // Initialize memory system
  const memory = new Mem();

  // Test basic memory operations
  const testAddr: Address = 0x8000;
  const testValue: UInt8 = 0xFF;

  try {
    memory.writeByte(testAddr, testValue);
    const readValue = memory.readByte(testAddr);

    console.log(`Memory test: wrote 0x${testValue.toString(16)}, read 0x${readValue.toString(16)}`);

    if (readValue === testValue) {
      console.log('✅ Basic memory operations working');
    } else {
      console.log('❌ Memory test failed');
    }

    // Test word operations
    const wordAddr: Address = 0x8100;
    const wordValue: UInt16 = 0x1234;

    memory.writeWord(wordAddr, wordValue);
    const readWord = memory.readWord(wordAddr);

    console.log(`Word test: wrote 0x${wordValue.toString(16)}, read 0x${readWord.toString(16)}`);

    if (readWord === wordValue) {
      console.log('✅ Word operations working');
    } else {
      console.log('❌ Word test failed');
    }

  } catch (error) {
    console.error('❌ Error during memory tests:', error);
  }
}

// Run the emulator
main();