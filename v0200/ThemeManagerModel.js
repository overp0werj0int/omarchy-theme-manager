const stringValue = (value) => String(value || "")
const themeValues = (themes) => (themes && typeof themes === "object" ? themes : {})

const fileStem = (path) =>
  stringValue(path)
    .split("/")
    .pop()
    .replace(/\.[^/.]+$/, "")

const labelForThemeName = (name) =>
  stringValue(name)
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase())

const isThemePreviewPath = (path) =>
  /\/omarchy\/theme-selector\/previews\/[^/]+\.[^/.]+$/.test(stringValue(path))

const themeNameForPath = (path) => (isThemePreviewPath(path) ? fileStem(path) : "")

const isSafeThemeName = (name) => {
  const value = stringValue(name)
  return value !== "." && value !== ".." && /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value)
}

const themeMapFromText = (text) =>
  stringValue(text)
    .split("\n")
    .reduce((themes, rawName) => {
      const name = rawName.trim()
      if (isSafeThemeName(name)) themes[name] = true
      return themes
    }, {})

const packageIconName = (value) => {
  const icons = stringValue(value).trim()
  if (!icons || icons.length > 255 || icons.startsWith(".") || /[\/\0]/.test(icons)) return ""
  if (!/^[A-Za-z0-9][A-Za-z0-9._+-]*$/.test(icons)) return ""
  return icons
}

const themeInventoryFromText = (text) =>
  stringValue(text)
    .split("\n")
    .reduce(
      (inventory, row) => {
        const [kind, rawName, rawRepository = "", rawIcons = ""] = row.split("\t")
        const name = stringValue(rawName).trim()
        if (!isSafeThemeName(name)) return inventory

        if (kind === "user") {
          inventory.installedThemes[name] = true
          const repository = stringValue(rawRepository).trim()
          if (repository) inventory.installedRepositories.push(repository)
        } else if (kind === "stock") {
          inventory.stockThemes[name] = true
        }

        const icons = packageIconName(rawIcons)
        if (icons) inventory.packageIcons[name] = icons

        return inventory
      },
      { installedThemes: {}, stockThemes: {}, installedRepositories: [], packageIcons: {} }
    )

const hasTheme = (themes, name) => isSafeThemeName(name) && themeValues(themes)[name] === true

const withInventoryThemes = (images, installedThemes, stockThemes, previewRoot) => {
  const previews = new Map()
  for (const image of Array.isArray(images) ? images : []) {
    const name = themeNameForPath(image && image.filePath)
    if (isSafeThemeName(name) && !previews.has(name)) previews.set(name, image)
  }
  return Object.keys(Object.assign({}, themeValues(stockThemes), themeValues(installedThemes)))
    .filter(isSafeThemeName)
    .sort()
    .map(
      (name) =>
        previews.get(name) || {
          filePath: stringValue(previewRoot) + "/" + name + ".png",
          fileName: name + ".png",
          thumbnailPath: ""
        }
    )
}

const withoutTheme = (themes, name) =>
  Object.keys(themeValues(themes)).reduce((remainingThemes, themeName) => {
    if (themeName !== name) remainingThemes[themeName] = true
    return remainingThemes
  }, {})

const withoutNamedImage = (images, name) => {
  const values = Array.isArray(images) ? images : []
  return values.filter((image) => fileStem(image && image.filePath) !== name)
}

if (typeof module !== "undefined") {
  module.exports = {
    fileStem,
    labelForThemeName,
    isThemePreviewPath,
    themeNameForPath,
    isSafeThemeName,
    packageIconName,
    themeMapFromText,
    themeInventoryFromText,
    hasTheme,
    withInventoryThemes,
    withoutTheme,
    withoutNamedImage
  }
}
