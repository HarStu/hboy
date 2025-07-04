import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { GB } from './gb.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const testDir = path.resolve(__dirname, '/Users/h/Files/Repos/GameboyCPUTests/v2/')
const test_files = await fs.readdir(testDir)

let passCount = 0
let failCount = 0
let unimpCount = 0

const failMap = new Map()
const passMap = new Map()

for (const test_file of test_files) {
  if (!test_file.endsWith('.json')) {
    continue;
  } else {
    const filePath = path.join(testDir, test_file)
    const fileContent = await fs.readFile(filePath, 'utf-8')
    const test_collection = JSON.parse(fileContent)

    for (const test of test_collection) {
      // build a gb
      const gb = new GB()

      // setup ram from intial test values
      test.initial.ram.forEach(([addr, val]) => gb.mem.writeByte(addr, val));
      // setup registers from initial test values
      ['a', 'b', 'c', 'd', 'e', 'f', 'h', 'l', 'pc', 'sp'].forEach(r => gb.cpu.setr(r, test.initial[r], true));

      // To accomodate tests starting from post-fetch mid-fde state, back up pc by one byte
      gb.cpu.setr('pc', (test.initial['pc'] - 1) & 0xFFFF)

      // while PC is not at its final value, run op
      let noUnimp = true
      let cycleCount = 0
      while (gb.cpu.getr('pc') !== test.final['pc'] && cycleCount < 100 && noUnimp) {
        const res = gb.cpu.test_fde()
        if (res === -1) {
          noUnimp = false
          break;
        }
        cycleCount++
      }

      if (!noUnimp) {
        unimpCount++
      } else {
        // check if registers match
        const regCheck = ['a', 'b', 'c', 'd', 'e', 'f', 'h', 'l', 'pc', 'sp'].every(r => {
          // console.log(`for reg ${r}:\n\tgb:   ${gb.cpu.getr(r, true)}\n\ttest: ${test.final[r]}`)
          return gb.cpu.getr(r, true) === test.final[r]
        })
        // check if ram matches
        const ramCheck = test.final.ram.every(([addr, val]) => gb.mem.readByte(addr) === val)

        if (regCheck && ramCheck) {
          console.log(`PASS: test ${test.name}`)
          passCount++
        } else {
          console.log(`FAIL: test ${test.name}\n\tregCheck: ${regCheck}\n\tramCheck: ${ramCheck}\n\tcycles:  ${cycleCount}`)
          failCount++
        }
      }
    }
  }
}

console.log(`\nPASS: ${passCount}\nFAIL: ${failCount}\nUNIMPLEMENTED: ${unimpCount}`)