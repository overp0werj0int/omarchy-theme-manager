const test = require("node:test")
const assert = require("node:assert/strict")
const { readFileSync } = require("node:fs")
const { runInNewContext } = require("node:vm")
const source = readFileSync("v0200/ImagePicker.qml", "utf8")

test("the supervised theme switch waits until app retints and hooks finish", () => {
  const run = source.match(/Run \{\n\s+id: switcherRun\n([^]*?)\n  \}/)
  assert.ok(run)
  const expression = run[1].match(/environment: ([^\n]+)/)
  assert.ok(expression)
  const original = { PATH: "/usr/bin:/usr/share/omarchy/bin", HOME: "/home/example" }
  const environment = runInNewContext(expression[1], { root: { omarchyEnvironment: original } })
  assert.equal(environment.OMARCHY_THEME_WAIT, "1")
  assert.equal(environment.PATH, original.PATH)
  assert.equal(environment.HOME, original.HOME)
  assert.equal(original.OMARCHY_THEME_WAIT, undefined)
})
