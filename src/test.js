import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { GB } from './gb.js'

function primeMemory(mem, pairs) {
  for (const [addr, val] of pairs) {
    mem.writeByte(addr, val)
  }
}

function loadRegisters(cpu, snap) {
  for (const r of ['a', 'b', 'c', 'd', 'e', 'f', 'h', 'l', 'pc', 'sp']) {
    cpu.setr(r, snap[r])
  }
}

function checkRegisters(cpu, exp) {
  for (const r of ['a', 'b', 'c', 'd', 'e', 'f', 'h', 'l', 'pc', 'sp']) {
    if (cpu.getr(r) !== exp[r]) {
      return false
    }
  }
  return true
}

function checkRam(mem, pairs) {
  for (const [addr, val] of pairs) {
    if (mem.readByte(addr) !== val) {
      return false
    }
  }
  return true
}

const test_col = JSON.parse(
  fs.readFileSync(
    new URL('/Users/h/Files/Repos/GameboyCPUTests/v2/00.json', import.meta.url), 'utf8'
  )
)
for (const test of test_col) {
  // build a gb
  const gb = new GB()

  // setup ram from intial test values
  test.initial.ram.forEach(([addr, val]) => gb.mem.writeByte(addr, val));
  // setup registers from initial test values
  ['a', 'b', 'c', 'd', 'e', 'f', 'h', 'l', 'pc', 'sp'].forEach(r => gb.cpu.setr(r, test.initial[r], true));

  // To accomodate tests starting from post-fetch mid-fde state, back up pc by one byte
  gb.cpu.setr('pc', (test.initial['pc'] - 1) & 0xFFFF)

  // while PC is not at its final value, run op
  let cycleCount = 0
  let noUnimp
  while (gb.cpu.getr('pc') !== test.final['pc'] && cycleCount < 1000 && noUnimp) {
    const res = gb.cpu.test_fde()
    if (res === -1) {
      noUnimp = false
    }
    cycleCount++
  }

  if (!noUnimp) {
    console.log(`test ${test.name} contains unimplemented instructions`)
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
    } else {
      console.log(`FAIL: test ${test.name}\n\tregCheck: ${regCheck}\n\tramCheck: ${ramCheck}\n\tcycles:  ${cycleCount}`)
    }
  }
}