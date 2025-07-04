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

const test = JSON.parse(
  fs.readFileSync(
    new URL('../tests/test.json', import.meta.url), 'utf8'
  )
)

// build a gb
const gb = new GB()

// setup ram from intial test values
test.initial.ram.forEach(([addr, val]) => gb.mem.writeByte(addr, val));
// setup registers from initial test values
['a', 'b', 'c', 'd', 'e', 'f', 'h', 'l', 'pc', 'sp'].forEach(r => gb.cpu.setr(r, test.initial[r], true));


// while PC is not at its final value, run op
let cycleCount = 0
while (gb.cpu.getr('pc') !== test.final['pc'] && cycleCount < 1000) {
  gb.cpu.cycle()
  cycleCount++
}

// check if registers match
const regsOK = ['a', 'b', 'c', 'd', 'e', 'f', 'h', 'l', 'pc', 'sp'].every(r => {
  console.log(`for reg ${r}:\n\tgb:   ${gb.cpu.getr(r)}\n\ttest: ${test.final[r]}`)
  return gb.cpu.getr(r) === test.final[r]
})
// check if ram matches
const ramOK = test.final.ram.every(([addr, val]) => gb.mem.readByte(addr) === val)

// output result
console.log(regsOK)
console.log(ramOK)
console.log(cycleCount)