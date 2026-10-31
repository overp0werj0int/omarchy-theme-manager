const test = require("node:test")
const assert = require("node:assert/strict")
const { readFileSync } = require("node:fs")
const { runInNewContext } = require("node:vm")
const ThemeManagerModel = require("../v0200/ThemeManagerModel.js")
const ImagePickerModel = require("../v0200/ImagePickerModel.js")
const WallpaperBrowserModel = require("../v0200/WallpaperBrowserModel.js")
const source = readFileSync("v0200/ImagePicker.qml", "utf8")

const loadFunction = (name, state) => {
  const match = source.match(new RegExp("  function " + name + "\\([^]*?\\n  \\}"))
  assert.ok(match, name)
  runInNewContext(match[0], state)
}

test("the native themes payload opens themes rather than the previous image directory", () => {
  const calls = []
  const state = {
    imageDirs: "/home/example/Pictures",
    selectedImage: "",
    openThemes: () => calls.push("themes"),
    openSelector: (...args) => calls.push(args)
  }
  loadFunction("open", state)
  state.open('{"source":"themes"}')
  assert.deepEqual(calls, ["themes"])
})

test("native theme selection applies the theme without a legacy selection file", () => {
  const calls = []
  const state = {
    themeRequest: { rows: "", opened: true },
    selectionFile: "",
    ThemeManagerModel,
    omarchyBin: "/usr/share/omarchy/bin",
    switcherRun: { start: () => calls.push([...state.switcherRun.command]) },
    cancel: () => calls.push("cancel")
  }
  loadFunction("finishSelection", state)
  state.finishSelection("/home/example/.cache/omarchy/theme-selector/previews/nord.png")
  assert.deepEqual(calls, [["/usr/share/omarchy/bin/omarchy-theme-set", "nord"], "cancel"])
})

test("a native theme request waits for inventory and opens once even without previews", () => {
  const calls = []
  const state = {
    themeRequest: { rows: "", opened: false },
    themeManager: { inventoryReady: false },
    ImagePickerModel,
    ThemeManagerModel,
    currentThemeName: "nord",
    themePreviewRoot: "/home/example/.cache/omarchy/theme-selector/previews",
    openSelector: (...args) => {
      calls.push(args)
      state.themeRequest = null
    }
  }
  state.root = state
  loadFunction("openThemeRequest", state)
  state.openThemeRequest()
  assert.equal(calls.length, 0)
  state.themeManager.inventoryReady = true
  state.openThemeRequest()
  state.openThemeRequest()
  assert.equal(calls.length, 1)
  assert.deepEqual(calls[0], ["", "\n", state.themePreviewRoot + "/nord.png", "", "", true, true])
  assert.equal(state.themeRequest.opened, true)
})

test("a cancelled native theme request cannot reopen when its listing finishes", () => {
  const state = { themeRequest: null }
  loadFunction("openThemeRequest", state)
  state.openThemeRequest()
  assert.equal(state.themeRequest, null)
})

test("reopening cached previews includes themes installed without a preview since the last open", () => {
  const previewRoot = "/home/example/.cache/omarchy/theme-selector/previews"
  const rows = previewRoot + "/nord.png\t/cache/nord.jpg\n"
  const state = {
    themeRequest: { rows, opened: false },
    themeManager: {
      inventoryReady: true,
      installedThemes: { "new-theme": true },
      stockThemes: { nord: true }
    },
    inventoryReady: true,
    themeCollectionsActive: true,
    ImagePickerModel,
    ThemeManagerModel,
    WallpaperBrowserModel,
    currentThemeName: "nord",
    themePreviewRoot: previewRoot,
    loadedImageRows: rows,
    imageArray: ImagePickerModel.loadRows(rows),
    wallpaperApply: { cancel: () => {} },
    ensureFooterIconsReady: () => {},
    catalogMode: false,
    folderMode: false,
    wallhavenMode: false,
    iconsBrowseMode: false,
    iconsMode: false,
    wallpaperPickerActive: false,
    localWallpaperMode: false,
    requestActive: false,
    requestSerial: 0,
    select: () => {},
    selectedImageIndex: () => 0,
    revealWhenSettled: () => {},
    indexForSelectedImage: (images) =>
      ImagePickerModel.indexForSelectedImage(images, state.selectedImage),
    replaceImageArray: (images) => {
      state.imageArray = images
    }
  }
  state.root = state
  for (const name of ["openThemeRequest", "openSelector", "loadRows"]) loadFunction(name, state)
  const callback = source.match(/onInventoryReadyChanged: \{([^]*?)\n    \}/)
  assert.ok(callback)
  runInNewContext("function inventoryChanged() {" + callback[1] + "\n}", state)
  state.inventoryChanged()
  assert.deepEqual(
    state.imageArray.map((row) => ThemeManagerModel.themeNameForPath(row.filePath)),
    ["new-theme", "nord"]
  )
})
