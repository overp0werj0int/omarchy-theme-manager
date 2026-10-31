const test = require("node:test")
const assert = require("node:assert/strict")

const model = require("../v0200/ThemeManagerModel.js")

test("recognizes only paths from the Omarchy theme preview cache", () => {
  assert.equal(
    model.themeNameForPath("/home/test/.cache/omarchy/theme-selector/previews/amberbyte.png"),
    "amberbyte"
  )
  assert.equal(model.themeNameForPath("/home/test/Pictures/backgrounds/amberbyte.png"), "")
  assert.equal(model.isThemePreviewPath("/tmp/omarchy/theme-selector/previews/no-extension"), false)
})

test("validates theme names before they can reach a destructive command", () => {
  for (const name of ["amberbyte", "tokyo-night", "catppuccin_mocha", "theme.v2"])
    assert.equal(model.isSafeThemeName(name), true, name)

  for (const name of ["", ".", "..", "../theme", "theme/name", " theme", "theme name", "-theme"])
    assert.equal(model.isSafeThemeName(name), false, name)
})

test("builds a de-duplicated inventory and ignores unsafe output", () => {
  const themes = model.themeMapFromText(
    ["amberbyte", "tokyo-night", "../outside", "amberbyte", ""].join("\n")
  )

  assert.deepEqual(themes, { amberbyte: true, "tokyo-night": true })
  assert.equal(model.hasTheme(themes, "amberbyte"), true)
  assert.equal(model.hasTheme(themes, "outside"), false)
  assert.equal(model.hasTheme(themes, "../outside"), false)
})

test("parses user, stock, and Git-origin inventory rows", () => {
  const inventory = model.themeInventoryFromText(
    [
      "user\tamberbyte\tgit@github.com:tahfizhabib/omarchy-amberbyte-theme.git\tYaru-dark",
      "stock\tmiasma\t\tYaru-red",
      "user\t../outside\thttps://github.com/example/outside\tEvil",
      "stock\tretro-82\t\tYaru-wartybrown"
    ].join("\n")
  )

  assert.deepEqual(inventory.installedThemes, { amberbyte: true })
  assert.deepEqual(inventory.stockThemes, { miasma: true, "retro-82": true })
  assert.deepEqual(inventory.installedRepositories, [
    "git@github.com:tahfizhabib/omarchy-amberbyte-theme.git"
  ])
  assert.deepEqual(inventory.packageIcons, {
    amberbyte: "Yaru-dark",
    miasma: "Yaru-red",
    "retro-82": "Yaru-wartybrown"
  })
})

test("removes an inventory entry without mutating the source object", () => {
  const themes = { amberbyte: true, ash: true }
  const result = model.withoutTheme(themes, "amberbyte")

  assert.deepEqual(result, { ash: true })
  assert.deepEqual(themes, { amberbyte: true, ash: true })
})

test("removes only the named theme row without mutating the source array", () => {
  const images = [
    { filePath: "/cache/aetheria.png" },
    { filePath: "/cache/amberbyte.png" },
    { filePath: "/cache/ash.png" }
  ]

  const result = model.withoutNamedImage(images, "amberbyte")

  assert.deepEqual(
    result.map((item) => model.fileStem(item.filePath)),
    ["aetheria", "ash"]
  )
  assert.equal(images.length, 3)
})

test("formats theme names for user-facing confirmation and errors", () => {
  assert.equal(model.labelForThemeName("catppuccin_mocha"), "Catppuccin Mocha")
  assert.equal(model.labelForThemeName("tokyo-night"), "Tokyo Night")
})

test("includes every installed theme even when a theme has no preview", () => {
  const previews = "/home/test/.cache/omarchy/theme-selector/previews"
  const nord = {
    filePath: previews + "/nord.jpg",
    fileName: "nord.jpg",
    thumbnailPath: "/cache/nord.jpg"
  }
  const rows = model.withInventoryThemes(
    [nord],
    { azure: true },
    { nord: true, "osaka-jade": true },
    previews
  )
  assert.deepEqual(
    rows.map((row) => model.themeNameForPath(row.filePath)),
    ["azure", "nord", "osaka-jade"]
  )
  assert.equal(rows[1], nord)
  assert.equal(rows[0].thumbnailPath, "")
  assert.equal(rows[2].thumbnailPath, "")
  assert.equal(
    model.withInventoryThemes(rows, { azure: true }, { nord: true, "osaka-jade": true }, previews)
      .length,
    3
  )
})
