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
    cpu.set(r, snap[r])
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
}

const test = JSON.parse(
  fs.readFileSync(
    new URL('../tests/test.json', import.meta.url), 'utf8'
  )
)

// build a gb
const gb = new GB()

test.initial.ram.forEach(([addr, val]) => gb.mem.writeByte(addr, val))
['a', 'b', 'c', 'd', 'e', 'f', 'h', 'l', 'pc', 'sp'].forEach(r => gb.cpu.setr(r, test.initial[r]))

const op = gb.mem.readByte(cpu.getr('pc'))
gb.cpu.opcodes[op]();

const regsOk = ['a', 'b', 'c', 'd', 'e', 'f', 'h', 'l', 'pc', 'sp'].every(r => gb.cpu.get(r) === test.final[r])
const ramOk = test.final.ram.every(([addr, val]) => gb.mem.readByte(addr) === val)

console.log(regsOK && ramOK ? 'Pass' : 'Fail')