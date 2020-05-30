const { ipcRenderer, remote } = require("electron");
const customTitlebar = require("custom-electron-titlebar");
const pdfjsLib = require("./assets/libs/pdfjs/build/pdf.js");
const path = require("path");

// IPC RECEIVED ///////////////////////////

ipcRenderer.on("render-page-info", (event, pageNum, numPages) => {
  if (numPages === 0) pageNum = -1; // hack to make it show 00 / 00 @ start
  document.getElementById("page-slider").value = pageNum + 1;
  document.getElementById("page-slider").max = numPages;
  document.getElementById("toolbar-page-numbers").innerHTML =
    pageNum + 1 + " / " + numPages;
});

ipcRenderer.on("render-pdf-page", (event, pageNum) => {
  renderPdfPage(pageNum);
});

ipcRenderer.on("refresh-pdf-page", (event) => {
  refreshPdfPage();
});

ipcRenderer.on("update-title", (event, title) => {
  document.title = title;
  titlebar.updateTitle();
});

ipcRenderer.on("render-img", (event, img64) => {
  document.querySelector(".centered-block").style.display = "none";

  //webFrame.clearCache();
  let element = '<img class="page" src="' + img64 + '" />';
  let container = document.getElementById("page-container");
  container.innerHTML = element;

  // ref: https://www.w3schools.com/howto/howto_js_scroll_to_top.asp
  //document.documentElement.scrollTop = 0;
  document.querySelector(".container-after-titlebar").scrollTop = 0;
  //webFrame.clearCache(); // don't know if this does anything, haven't tested, I'm afraid of memory leaks changing imgs
});

ipcRenderer.on("load-pdf", (event, filePath) => {
  document.querySelector(".centered-block").style.display = "none";

  let container = document.getElementById("page-container");
  container.innerHTML = "";
  var canvas = document.createElement("canvas");
  canvas.id = "pdf-canvas";
  container.appendChild(canvas);

  loadPdf(filePath);
});

ipcRenderer.on("set-scrollbar", (event, isVisible) => {
  if (isVisible) {
    showScrollBar();
  } else {
    hideScrollBar();
  }
  // alt to toggle: element.classList.contains(class);
});

ipcRenderer.on("show-menu-bar", (event, show) => {
  showMenuBar(show);
});

ipcRenderer.on("update-menu", (event, menu) => {
  titlebar.updateMenu(menu);
});

// PDF ////////////////
let currentPdf = null;
let currentPdfPage = null;

function loadPdf(filePath) {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "./assets/libs/pdfjs/build/pdf.worker.js";
  var loadingTask = pdfjsLib.getDocument(filePath);
  loadingTask.promise.then(function (pdf) {
    currentPdf = pdf;
    ipcRenderer.send("pdf-loaded", true, filePath, currentPdf.numPages);
    renderPdfPage(1);
  });
}

function renderPdfPage(pageNum) {
  currentPdf.getPage(pageNum).then(function (page) {
    // you can now use *page* here
    // var scale = 1.5;
    // var viewport = page.getViewport({ scale: scale });
    currentPdfPage = page;

    var canvas = document.getElementById("pdf-canvas");
    var context = canvas.getContext("2d");

    var desiredWidth = canvas.offsetWidth; //document.body.clientWidth;
    var viewport = currentPdfPage.getViewport({ scale: 1 });
    var scale = desiredWidth / viewport.width;
    var scaledViewport = currentPdfPage.getViewport({ scale: scale });

    canvas.height = scaledViewport.height; // viewport.height;
    canvas.width = desiredWidth; //scaledViewport.width; // viewport.width;

    var renderContext = {
      canvasContext: context,
      viewport: scaledViewport,
    };
    currentPdfPage.render(renderContext);

    document.querySelector(".container-after-titlebar").scrollTop = 0;
  });
}

function refreshPdfPage() {
  if (currentPdfPage === undefined) return;
  var desiredWidth = window.innerWidth;
  var viewport = currentPdfPage.getViewport({ scale: 1 });
  var scale = desiredWidth / viewport.width;
  var scaledViewport = currentPdfPage.getViewport({ scale: scale });

  var canvas = document.getElementById("pdf-canvas");
  var context = canvas.getContext("2d");
  canvas.height = scaledViewport.height; // viewport.height;
  canvas.width = scaledViewport.width; // viewport.width;

  var renderContext = {
    canvasContext: context,
    viewport: scaledViewport,
  };
  currentPdfPage.render(renderContext);
}

///////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////

let titlebar = new customTitlebar.Titlebar({
  backgroundColor: customTitlebar.Color.fromHex("#818181"),
  itemBackgroundColor: customTitlebar.Color.fromHex("#bbb"),
  icon: "./assets/images/icon_256x256.png",
});
// titlebar.updateTitle();

document.onkeydown = function (evt) {
  evt = evt || window.event;
  // ref: http://gcctech.org/csc/javascript/javascript_keycodes.htm
  if (evt.keyCode == 34 || evt.keyCode == 39) {
    // page down or arrow right
    ipcRenderer.send("mouse-click", true);
  } else if (evt.keyCode == 33 || evt.keyCode == 37) {
    // page up or arrow left
    ipcRenderer.send("mouse-click", false);
  } else if (evt.keyCode == 40) {
    // arrow down
    let container = document.querySelector(".container-after-titlebar");
    let amount = container.offsetHeight / 5;
    container.scrollBy(0, amount);
  } else if (evt.keyCode == 38) {
    // arrow up
    let container = document.querySelector(".container-after-titlebar");
    let amount = container.offsetHeight / 5;
    document.querySelector(".container-after-titlebar").scrollBy(0, -amount);
  } else if (evt.keyCode == 27) {
    // escape
    ipcRenderer.send("escape-pressed");
  }
};

document.onclick = function (event) {
  if (event.target.className === "page" || event.target.id === "pdf-canvas") {
    ipcRenderer.send("mouse-click", true);
  }
  //if (event.target.className !== "container-after-titlebar") return;
};

document.oncontextmenu = function (event) {
  if (event.target.className === "page" || event.target.id === "pdf-canvas") {
    ipcRenderer.send("mouse-click", false);
  }
};

// TOOLBAR /////////////////////////

function addButtonEvent(buttonName) {
  document.getElementById(buttonName).addEventListener("click", (event) => {
    ipcRenderer.send("toolbar-button-clicked", buttonName);
  });
}

addButtonEvent("toolbar-button-next");
addButtonEvent("toolbar-button-prev");
addButtonEvent("toolbar-button-fit-width");
addButtonEvent("toolbar-button-fit-height");
addButtonEvent("toolbar-button-fullscreen");

document.getElementById("page-slider").addEventListener("mouseup", (event) => {
  ipcRenderer.send("toolbar-slider-changed", event.currentTarget.value);
});
document.getElementById("page-slider").addEventListener("input", (event) => {
  document.getElementById("toolbar-page-numbers").innerHTML =
    event.currentTarget.value + " / " + event.currentTarget.max;
});

// SCROLL BAR //////////////////////

// ref: https://stackoverflow.com/questions/4481485/changing-css-pseudo-element-styles-via-javascript
function hideScrollBar() {
  // generic:
  document.body.classList.add("hidden-scrollbar");
  // if custom title bar enabled:
  document
    .querySelector(".container-after-titlebar")
    .classList.add("hidden-scrollbar");
}

function showScrollBar() {
  // generic:
  document.body.classList.remove("hidden-scrollbar");
  // if custom title bar enabled:
  document
    .querySelector(".container-after-titlebar")
    .classList.remove("hidden-scrollbar");
}

function showMenuBar(show) {
  if (show) {
    document.querySelector(".titlebar").classList.remove("display-none");
    document
      .querySelector(".container-after-titlebar")
      .classList.remove("set-top-zero");
  } else {
    document.querySelector(".titlebar").classList.add("display-none");
    document
      .querySelector(".container-after-titlebar")
      .classList.add("set-top-zero");
  }
}
