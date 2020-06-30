#! /usr/bin/env node
const path = require("path")
const fs = require("fs")
const frida = require("frida")
const syscalls = require("./dist/syscalls")

const read = (...args) => fs.readFileSync(path.join(__dirname, ...args))
const tracer = read("dist", "tracer.js")

process.stdin.setRawMode(true);

async function run(name) {
  let device = await frida.getUsbDevice()
  const apps = await device.enumerateApplications()
  const app = apps.find(app => app.name === name || app.identifier === name)
  if (!app)
    throw new Error(`Unable to find app: ${name}`)

  const pid = await device.spawn(app.identifier)
  const session = await device.attach(pid)
  await session.enableJit()
  const script = await session.createScript(tracer)
  await script.load()
  script.message.connect(msg => {
    if (msg.type === "send") {
      const payload = msg.payload
      // console.log(payload)
      const calledNum = payload.calledNumber
      if (calledNum > 0) {
        console.log(`${syscalls[String(calledNum)]} ${payload.moduleAddress}`)
      } else {
        console.log(`Mach Trap(${calledNum}) ${payload.moduleAddress}`)
      }
    }
  });
  await device.resume(pid)
}

async function main() {
  const program = require("commander")

  program
    .arguments("iostrace <app>")
    .action(run)
    await program.parseAsync(process.argv)
}

main().catch(e => {
  console.error(e)
  process.exit()
})