const {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  dialog,
} = require("electron");

const fs = require("fs");
const path = require("path");
const fileUtils = require("./file-utils");
const barMenu = require("./menu-bar");
const contextMenu = require("./menu-context");

function isDev() {
  return process.argv[2] == "--dev";
}

///////////////////////////////////////////////////////////////////////////////
// SETUP //////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

let g_mainWindow;
let g_resizeEventCounter;
let g_settings = {
  version: 1, // save format version
  date: "",
  fit_mode: 0, // 0: width, 1: height
  page_mode: 0, // 0: single-page, 1: double-page
  maximize: false,
  showMenuBar: true,
  showToolBar: true,
  showScrollBar: true,
};

let g_history = [];

app.on("will-quit", () => {
  saveSettings();
  saveHistory();
  globalShortcut.unregisterAll();
  fileUtils.cleanUpTempFolder();
});

app.on("ready", () => {
  g_mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 700,
    minHeight: 500,
    resizable: true,
    frame: false,
    icon: path.join(__dirname, "assets/images/icon_256x256.png"),
    //autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
    },
    show: false,
  });

  //mainWindow.removeMenu();
  barMenu.buildApplicationMenu();

  // FIX: ugly hack: since I wait to show the window on did-finish-load, if I started it
  // unmaximized the resize controls did nothing until I maximized and unmaximized it... ?? :(
  // so I do it programmatically at the start, hopefully it's not noticeable
  g_mainWindow.maximize();
  g_mainWindow.unmaximize();

  g_mainWindow.loadFile(`${__dirname}/index.html`);

  g_mainWindow.once("ready-to-show", () => {
    g_mainWindow.show();
  });

  g_mainWindow.webContents.on("context-menu", function (e, params) {
    contextMenu.buildContextMenu();
    contextMenu.getContextMenu().popup(g_mainWindow, params.x, params.y);
  });

  g_mainWindow.webContents.on("did-finish-load", function () {
    // if I put the things below inside ready-to-show they aren't called
    renderTitle();

    g_settings = fileUtils.loadSettings(g_settings);
    g_history = fileUtils.loadHistory();

    if (g_settings.fit_mode === 0) {
      setFitToWidth();
    } else {
      setFitToHeight();
    }
    showScrollBar(g_settings.showScrollBar);

    if (g_history.length > 0) {
      let entry = g_history[g_history.length - 1];
      openFile(entry.filePath, entry.pageIndex);
    }
  });

  g_mainWindow.on("resize", function () {
    renderTitle();
    if (
      g_fileData.type === FileDataType.PDF &&
      g_fileData.state === FileDataState.LOADED
    ) {
      // avoid too much pdf resizing
      clearTimeout(g_resizeEventCounter);
      g_resizeEventCounter = setTimeout(onResizeEventFinished, 500);
    }
  });

  g_mainWindow.on("maximize", function () {
    if (
      g_fileData.type === FileDataType.PDF &&
      g_fileData.state === FileDataState.LOADED
    ) {
      g_mainWindow.webContents.send("refresh-pdf-page");
    }
  });
});

function onResizeEventFinished() {
  //g_mainWindow.webContents.send("refresh-pdf-page");
}

// Security
// ref: https://www.electronjs.org/docs/tutorial/security

app.on("web-contents-created", (event, contents) => {
  contents.on("will-navigate", (event, navigationUrl) => {
    event.preventDefault();
  });
});

app.on("web-contents-created", (event, contents) => {
  contents.on("new-window", async (event, navigationUrl) => {
    event.preventDefault();

    //const URL = require('url').URL
    // const parsedUrl = new URL(navigationUrl)
    // if (parsedUrl.origin !== 'https://example.com') {
    //   event.preventDefault()
    // }
  });
});

///////////////////////////////////////////////////////////////////////////////
// SETTINGS / HISTORY /////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

function saveSettings() {
  fileUtils.saveSettings(g_settings);
}

function addCurrentToHistory() {
  let currentFilePath = g_fileData.filePath;
  let currentPageIndex = g_fileData.pageIndex;
  if (currentFilePath != "") {
    let foundIndex = getHistoryIndex(currentFilePath);
    if (foundIndex !== undefined) {
      g_history.splice(foundIndex, 1); // remove, to update and put last
    }
    let newEntry = { filePath: currentFilePath, pageIndex: currentPageIndex };
    g_history.push(newEntry);
    // limit how many are remembered
    if (g_history.length > 10) {
      g_history.splice(0, g_history.length - 10);
    }
  }
}

function getHistoryIndex(filePath) {
  let foundIndex;
  for (let index = 0; index < g_history.length; index++) {
    const element = g_history[index];
    if (element.filePath === filePath) {
      foundIndex = index;
      break;
    }
  }
  return foundIndex;
}

function saveHistory() {
  addCurrentToHistory();
  fileUtils.saveHistory(g_history, g_fileData.filePath, g_fileData.pageIndex);
}

///////////////////////////////////////////////////////////////////////////////
// IPC RECEIVED ///////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

ipcMain.on("pdf-loaded", (event, loadedCorrectly, filePath, numPages) => {
  g_fileData.state = FileDataState.LOADED;
  // TODO double check loaded is the one loading?
  g_fileData.numPages = numPages;
  renderPageInfo();
});

ipcMain.on("escape-pressed", (event) => {
  if (g_mainWindow.isFullScreen()) {
    setFullScreen(false);
  }
});

ipcMain.on("dev-tools-pressed", (event) => {
  if (isDev()) toggleDevTools();
});

ipcMain.on("home-pressed", (event) => {
  goToPage(0);
});

ipcMain.on("end-pressed", (event) => {
  goToPage(g_fileData.numPages - 1);
});

ipcMain.on("mouse-click", (event, arg) => {
  if (arg === true) {
    // left click
    goToNextPage();
  } else {
    // right click
    goToPreviousPage();
  }
});

ipcMain.on("toolbar-button-clicked", (event, name) => {
  switch (name) {
    case "toolbar-button-next":
      goToNextPage();
      break;
    case "toolbar-button-prev":
      goToPreviousPage();
      break;
    case "toolbar-button-fit-to-width":
      setFitToWidth();
      break;
    case "toolbar-button-fit-to-height":
      setFitToHeight();
      break;
    case "toolbar-button-fullscreen-enter":
      toggleFullScreen();
      break;
    case "toolbar-button-fullscreen-exit":
      toggleFullScreen();
      break;
    case "toolbar-button-open":
      onMenuOpenFile();
      break;
  }
});

ipcMain.on("toolbar-slider-changed", (event, value) => {
  value -= 1; // from 1 based to 0 based
  if (g_fileData.state === FileDataState.LOADED) {
    if (value !== g_fileData.pageIndex) {
      goToPage(value);
      return;
    }
  }
  renderPageInfo();
});

///////////////////////////////////////////////////////////////////////////////
// MENU MSGS //////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

exports.onMenuNextPage = function () {
  goToNextPage();
};

exports.onMenuPreviousPage = function () {
  goToPreviousPage();
};

exports.onMenuNextPage = function () {
  goToNextPage();
};

exports.onMenuOpenFile = function () {
  let fileList = fileUtils.chooseFile(g_mainWindow);
  if (fileList === undefined) {
    return;
  }
  let filePath = fileList[0];
  console.log("open file request:" + filePath);
  openFile(filePath);
};

exports.onMenuFitToWidth = function () {
  setFitToWidth();
};

exports.onMenuFitToHeight = function () {
  setFitToHeight();
};

exports.onMenuToggleScrollBar = function () {
  toggleScrollBar();
};

exports.onMenuToggleFullScreen = function () {
  toggleFullScreen();
};

exports.onMenuToggleDevTools = function () {
  toggleDevTools();
};

exports.onMenuAbout = function () {
  dialog.showMessageBox(g_mainWindow, {
    type: "info",
    icon: path.join(__dirname, "assets/images/icon_256x256.png"),
    title: "About ACBR",
    message:
      "ACBR Comic Book Reader\n(c) Álvaro García\nwww.binarynonsense.com",
  });
};

///////////////////////////////////////////////////////////////////////////////
// FILES //////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

const FileDataState = {
  NOT_SET: "not set",
  LOADING: "loading",
  LOADED: "loaded",
};

const FileDataType = {
  NOT_SET: "not set",
  PDF: "pdf",
  IMGS: "imgs",
  ZIP: "zip",
  RAR: "rar",
};

let g_fileData = {
  state: FileDataState.NOT_SET,
  type: FileDataType.NOT_SET,
  filePath: "",
  fileName: "",
  imgsFolderPath: "",
  pagesPaths: [],
  numPages: 0,
  pageIndex: 0,
};

function openFile(filePath, pageIndex = 0) {
  if (filePath === "" || !fs.existsSync(filePath)) return;

  addCurrentToHistory(); // add the one I'm closing to history
  // if in history: open saved position:
  let historyIndex = getHistoryIndex(filePath);
  if (historyIndex !== undefined) {
    pageIndex = g_history[historyIndex].pageIndex;
    if (pageIndex === undefined) pageIndex = 0; // just in case
  }

  let fileExtension = path.extname(filePath);
  if (fileExtension === ".pdf") {
    g_fileData.state = FileDataState.LOADING;
    g_fileData.type = FileDataType.PDF;
    g_fileData.filePath = filePath;
    g_fileData.fileName = path.basename(filePath);
    g_fileData.imgsFolderPath = "";
    g_fileData.pagesPaths = [];
    g_fileData.numPages = 0;
    g_fileData.pageIndex = pageIndex;
    g_mainWindow.webContents.send("load-pdf", filePath, pageIndex + 1); // pdf.j counts from 1
    renderTitle();
  } else {
    let imgsFolderPath = undefined;
    if (fileExtension === ".cbr") {
      //imgsFolderPath = fileUtils.extractRar(filePath);
      let pagesPaths = fileUtils.getRarEntriesList(filePath);
      if (pagesPaths !== undefined && pagesPaths.length > 0) {
        g_fileData.state = FileDataState.LOADED;
        g_fileData.type = FileDataType.RAR;
        g_fileData.filePath = filePath;
        g_fileData.fileName = path.basename(filePath);
        g_fileData.pagesPaths = pagesPaths;
        g_fileData.imgsFolderPath = "";
        g_fileData.numPages = pagesPaths.length;
        g_fileData.pageIndex = pageIndex;
        goToPage(pageIndex);
      }
    } else if (fileExtension === ".cbz") {
      //imgsFolderPath = fileUtils.extractZip(filePath);
      let pagesPaths = fileUtils.getZipEntriesList(filePath);
      if (pagesPaths !== undefined && pagesPaths.length > 0) {
        g_fileData.state = FileDataState.LOADED;
        g_fileData.type = FileDataType.ZIP;
        g_fileData.filePath = filePath;
        g_fileData.fileName = path.basename(filePath);
        g_fileData.pagesPaths = pagesPaths;
        g_fileData.imgsFolderPath = "";
        g_fileData.numPages = pagesPaths.length;
        g_fileData.pageIndex = pageIndex;
        goToPage(pageIndex);
      }
      return;
    } else {
      console.log("not a valid file");
      return;
    }
    if (imgsFolderPath === undefined) return;

    let pagesPaths = fileUtils.getImageFilesInFolderRecursive(imgsFolderPath);
    if (pagesPaths !== undefined && pagesPaths.length > 0) {
      g_fileData.state = FileDataState.LOADED;
      g_fileData.type = FileDataType.IMGS;
      g_fileData.filePath = filePath;
      g_fileData.fileName = path.basename(filePath);
      g_fileData.pagesPaths = pagesPaths;
      g_fileData.imgsFolderPath = imgsFolderPath;
      g_fileData.numPages = pagesPaths.length;
      g_fileData.pageIndex = pageIndex;
      goToPage(pageIndex);
    }
  }
}
exports.openFile = openFile;

///////////////////////////////////////////////////////////////////////////////
// RENDER /////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

function renderTitle() {
  let title = generateTitle();
  g_mainWindow.setTitle(title);
  g_mainWindow.webContents.send("update-title", title);
}

function renderPageInfo() {
  g_mainWindow.webContents.send(
    "render-page-info",
    g_fileData.pageIndex,
    g_fileData.numPages
  );
}

function renderImageFile(filePath) {
  if (!path.isAbsolute(filePath)) {
    // FIXME: mae it absolute somehow?
    return;
  }
  renderTitle();
  let data64 = fs.readFileSync(filePath).toString("base64");
  let img64 =
    "data:image/" + fileUtils.getMimeType(filePath) + ";base64," + data64;
  g_mainWindow.webContents.send("render-img", img64, 0);
}

function renderZipEntry(zipPath, entryName) {
  renderTitle();
  let data64 = fileUtils
    .extractZipEntryData(zipPath, entryName)
    .toString("base64");
  let img64 =
    "data:image/" + fileUtils.getMimeType(entryName) + ";base64," + data64;
  g_mainWindow.webContents.send("render-img", img64, 0);
}

function renderRarEntry(rarPath, entryName) {
  renderTitle();
  let data64 = fileUtils
    .extractRarEntryData(rarPath, entryName)
    .toString("base64");
  let img64 =
    "data:image/" + fileUtils.getMimeType(entryName) + ";base64," + data64;
  g_mainWindow.webContents.send("render-img", img64, 0);
}

function renderPdfPage(pageIndex) {
  renderTitle();
  g_mainWindow.webContents.send("render-pdf-page", pageIndex + 1); // pdf.j counts from 1
}

/////////////////////////////////////////////////

function generateTitle() {
  let title = "---";
  let blankSpace = "           ";
  if (g_fileData.state === FileDataState.NOT_SET) {
    title = "Comic Book Reader - ACBR" + blankSpace;
  } else if (g_mainWindow.getSize()[0] < 600) {
    title = "ACBR" + blankSpace;
  } else {
    title = `${g_fileData.fileName}`;
    var length = 50;
    title =
      title.length > length
        ? title.substring(0, length - 3) + "..."
        : title.substring(0, length);
    title += " - ACBR" + blankSpace;
  }
  return title;
}

///////////////////////////////////////////////////////////////////////////////
// PAGE NAVIGATION ////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

function goToPage(pageIndex) {
  if (
    g_fileData.state !== FileDataState.LOADED ||
    g_fileData.type === FileDataType.NOT_SET
  ) {
    return;
  }
  if (pageIndex < 0 || pageIndex >= g_fileData.numPages) return;
  g_fileData.pageIndex = pageIndex;
  if (g_fileData.type === FileDataType.IMGS) {
    renderImageFile(g_fileData.pagesPaths[g_fileData.pageIndex]);
  } else if (g_fileData.type === FileDataType.PDF) {
    renderPdfPage(g_fileData.pageIndex);
  } else if (g_fileData.type === FileDataType.ZIP) {
    renderZipEntry(
      g_fileData.filePath,
      g_fileData.pagesPaths[g_fileData.pageIndex]
    );
  } else if (g_fileData.type === FileDataType.RAR) {
    renderRarEntry(
      g_fileData.filePath,
      g_fileData.pagesPaths[g_fileData.pageIndex]
    );
  }
  renderPageInfo();
}

function goToFirstPage() {
  goToPage(0);
}

function goToNextPage() {
  if (g_fileData.pageIndex + 1 < g_fileData.numPages) {
    g_fileData.pageIndex++;
    goToPage(g_fileData.pageIndex);
  }
}

function goToPreviousPage() {
  if (g_fileData.pageIndex - 1 >= 0) {
    g_fileData.pageIndex--;
    goToPage(g_fileData.pageIndex);
  }
}

///////////////////////////////////////////////////////////////////////////////
// MODIFIERS //////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

function showScrollBar(isVisible) {
  g_settings.showScrollBar = isVisible;
  g_mainWindow.webContents.send(
    "set-scrollbar-visibility",
    g_settings.showScrollBar
  );
}

function toggleScrollBar() {
  showScrollBar(!g_settings.showScrollBar);
}

function toggleFullScreen() {
  setFullScreen(!g_mainWindow.isFullScreen());
}

function setFullScreen(value) {
  g_mainWindow.setFullScreen(value);
  if (value) {
    g_mainWindow.webContents.send("set-scrollbar-visibility", false);
    g_mainWindow.webContents.send("set-menubar-visibility", false);
    g_mainWindow.webContents.send("set-toolbar-visibility", false);
    g_mainWindow.webContents.send("set-fullscreen-ui", true);
  } else {
    g_mainWindow.webContents.send(
      "set-scrollbar-visibility",
      g_settings.showScrollBar
    );
    g_mainWindow.webContents.send("set-menubar-visibility", true);
    g_mainWindow.webContents.send(
      "set-toolbar-visibility",
      g_settings.showToolBar
    );
    g_mainWindow.webContents.send("set-fullscreen-ui", false);
  }
}

function toggleDevTools() {
  g_mainWindow.toggleDevTools();
}

function setFitToWidth() {
  barMenu.setFitToWidth();
  g_mainWindow.webContents.send("set-fit-to-width");
}

function setFitToHeight() {
  barMenu.setFitToHeight();
  g_mainWindow.webContents.send("set-fit-to-height");
}

function setSinglePage() {}

function setDoublePage() {}

///////////////////////////////////////////////////////////////////////////////
// GLOBAL SHORTCUTS ///////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

// let shortcut = "PageDown";
// const ret = globalShortcut.register(shortcut, () => {
//   console.log("page down");
// });

// if (!ret) {
//   console.log("error adding global shortcut");
// } else {
//   console.log("global shortcut added: " + shortcut);
// }
