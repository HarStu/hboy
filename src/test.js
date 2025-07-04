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

test.initial.ram.forEach(([addr, val]) => gb.mem.writeByte(addr, val));

console.log(test);

['a', 'b', 'c', 'd', 'e', 'f', 'h', 'l', 'pc', 'sp'].forEach(r => {
  console.log(`setting ${r}`)
  return gb.cpu.setr(r, test.initial[r], true)
});

const op = gb.mem.readByte(gb.cpu.getr('pc'))
gb.cpu.opcodes[op]();

const regsOK = ['a', 'b', 'c', 'd', 'e', 'f', 'h', 'l', 'pc', 'sp'].every(r => gb.cpu.getr(r) === test.final[r])
const ramOK = test.final.ram.every(([addr, val]) => gb.mem.readByte(addr) === val)

console.log(regsOK)
console.log(ramOK)