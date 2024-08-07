/**
 * @license
 * Copyright 2024 Álvaro García
 * www.binarynonsense.com
 * SPDX-License-Identifier: BSD-2-Clause
 */

import {
  sendIpcToMain as coreSendIpcToMain,
  sendIpcToMainAndWait as coreSendIpcToMainAndWait,
} from "../../core/renderer.js";
import * as modals from "../../shared/renderer/modals.js";
import axios from "../../assets/libs/axios/dist/esm/axios.js";

let g_searchInput;
let g_searchButton;

let g_engineSelect;

let g_urlInput;
let g_openInputInACBRButton;
let g_openInputInBrowserButton;

let g_localizedSearchPlaceholderText;
let g_localizedModalCancelButtonText;
let g_localizedModalCloseButtonText;
let g_localizedModalSearchingTitleText;
let g_localizedModalLoadingTitleText;
let g_localizedModalOpenInPlayerTitleText;
let g_localizedModalAddToPlaylistButtonText;
let g_localizedModalNewPlaylistButtonText;

///////////////////////////////////////////////////////////////////////////////
// SETUP //////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

let g_isInitialized = false;

function init() {
  if (!g_isInitialized) {
    // things to start only once go here
    g_isInitialized = true;
  }
  document.getElementById("tools-columns-right").scrollIntoView({
    behavior: "instant",
    block: "start",
    inline: "nearest",
  });
  // menu buttons
  document
    .getElementById("tool-cbp-back-button")
    .addEventListener("click", (event) => {
      sendIpcToMain("close");
    });
  // sections menu
  for (let index = 0; index < 5; index++) {
    document
      .getElementById(`tool-cbp-section-${index}-button`)
      .addEventListener("click", (event) => {
        switchSection(index);
      });
  }
  ////////////////////////////////////////
  // search
  g_searchButton = document.getElementById("tool-cbp-search-button");
  g_searchButton.addEventListener("click", (event) => {
    onSearch();
  });

  g_searchInput = document.getElementById("tool-cbp-search-input");
  g_searchInput.placeholder = g_localizedSearchPlaceholderText;
  g_searchInput.addEventListener("input", function (event) {
    if (g_searchInput.value !== "") {
      g_searchButton.classList.remove("tools-disabled");
    } else {
      g_searchButton.classList.add("tools-disabled");
    }
  });
  g_searchInput.addEventListener("keypress", function (event) {
    if (
      event.key === "Enter" &&
      !document
        .getElementById("tool-search-input-div")
        .classList.contains("set-display-none")
    ) {
      event.preventDefault();
      if (g_searchInput.value) {
        onSearch();
      }
    }
  });
  g_searchInput.focus();
  // url
  g_urlInput = document.getElementById("tool-cbp-url-input");
  g_openInputInACBRButton = document.getElementById(
    "tool-cbp-open-input-url-acbr-button"
  );
  g_openInputInBrowserButton = document.getElementById(
    "tool-cbp-open-input-url-browser-button"
  );

  g_urlInput.addEventListener("input", (event) => {
    if (event.target.value.startsWith("https://comicbookplus.com/?dlid=")) {
      g_openInputInACBRButton.classList.remove("tools-disabled");
      g_openInputInBrowserButton.classList.remove("tools-disabled");
    } else {
      g_openInputInACBRButton.classList.add("tools-disabled");
      g_openInputInBrowserButton.classList.add("tools-disabled");
    }
  });
  g_openInputInACBRButton.addEventListener("click", (event) => {
    onOpenComicUrlInACBR();
  });
  g_openInputInBrowserButton.addEventListener("click", (event) => {
    onOpenComicUrlInBrowser();
  });
  // options
  g_engineSelect = document.getElementById(
    "tool-cbp-options-search-engine-select"
  );
  // about
  document
    .getElementById("tool-cbp-open-cbp-browser-button")
    .addEventListener("click", (event) => {
      openCBPLink(`https://comicbookplus.com`);
    });
  // donate
  document
    .getElementById("tool-cbp-open-donate-browser-button")
    .addEventListener("click", (event) => {
      openCBPLink(`https://comicbookplus.com/?cbplus=sponsorcomicbookplus`);
    });

  ////////////////////////////////////////
  updateColumnsHeight();
}

export function initIpc() {
  initOnIpcCallbacks();
}

function updateColumnsHeight(scrollTop = false) {
  const left = document.getElementById("tools-columns-left");
  const right = document.getElementById("tools-columns-right");
  left.style.minHeight = right.offsetHeight + "px";
  if (scrollTop) {
    document.getElementById("tools-columns-right").scrollIntoView({
      behavior: "instant",
      block: "start",
      inline: "nearest",
    });
  }
}

function switchSection(id) {
  for (let index = 0; index < 5; index++) {
    if (id === index) {
      document
        .getElementById(`tool-cbp-section-${index}-button`)
        .classList.add("tools-menu-button-selected");
      document
        .getElementById(`tool-cbp-section-${index}-content-div`)
        .classList.remove("set-display-none");
    } else {
      document
        .getElementById(`tool-cbp-section-${index}-button`)
        .classList.remove("tools-menu-button-selected");
      document
        .getElementById(`tool-cbp-section-${index}-content-div`)
        .classList.add("set-display-none");
    }

    if (index === 0) {
      g_searchInput.focus();
    }
  }
  updateColumnsHeight(true);
}

//////////////////////////////////////////////////////////////////////////////
// IPC SEND ///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

export function sendIpcToMain(...args) {
  coreSendIpcToMain("tool-cbp", ...args);
}

async function sendIpcToMainAndWait(...args) {
  return await coreSendIpcToMainAndWait("tool-cbp", ...args);
}

///////////////////////////////////////////////////////////////////////////////
// IPC RECEIVE ////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

let g_onIpcCallbacks = {};

export function onIpcFromMain(args) {
  const callback = g_onIpcCallbacks[args[0]];
  if (callback) callback(...args.slice(1));
  return;
}

function on(id, callback) {
  g_onIpcCallbacks[id] = callback;
}

function initOnIpcCallbacks() {
  on("show", (outputFolderPath) => {
    init(outputFolderPath);
  });

  on("hide", () => {});

  on(
    "update-localization",
    (
      searchPlaceHolder,
      modalLoadingTitleText,
      modalSearchingTitleText,
      modalCloseButtonText,
      modalCancelButtonText,
      modalOpenInPlayerTitleText,
      modalAddToPlaylistButtonText,
      modalNewPlaylistButtonText,
      localization
    ) => {
      g_localizedSearchPlaceholderText = searchPlaceHolder;
      g_localizedModalLoadingTitleText = modalLoadingTitleText;
      g_localizedModalSearchingTitleText = modalSearchingTitleText;
      g_localizedModalCloseButtonText = modalCloseButtonText;
      g_localizedModalCancelButtonText = modalCancelButtonText;
      g_localizedModalOpenInPlayerTitleText = modalOpenInPlayerTitleText;
      g_localizedModalAddToPlaylistButtonText = modalAddToPlaylistButtonText;
      g_localizedModalNewPlaylistButtonText = modalNewPlaylistButtonText;
      for (let index = 0; index < localization.length; index++) {
        const element = localization[index];
        const domElement = document.querySelector("#" + element.id);
        if (domElement !== null) {
          domElement.innerHTML = element.text;
        }
      }
    }
  );

  on("update-window", () => {
    updateColumnsHeight();
  });

  on("close-modal", () => {
    if (g_openModal) {
      modals.close(g_openModal);
      modalClosed();
    }
  });

  /////////////////////////////////////////////////////////////////////////////

  on("modal-update-title-text", (text) => {
    updateModalTitleText(text);
  });

  on("update-info-text", (text) => {
    updateInfoText(text);
  });

  on("update-log-text", (text) => {
    updateLogText(text);
  });

  /////////////////////////////////////////////////////////////////////////////

  on("update-results", (results, openInAcbrText, openInBrowserText) => {
    document
      .querySelector("#tool-search-results-h3")
      .classList.remove("set-display-none");
    const searchResultsDiv = document.querySelector(
      "#tool-cbp-search-results-div"
    );
    searchResultsDiv.innerHTML = "";
    // pagination top
    if (results.hasNext || results.hasPrev) {
      searchResultsDiv.appendChild(generatePaginationHtml(results));
    }
    // list
    let ul = document.createElement("ul");
    ul.className = "tools-collection-ul";
    if (results && results.links && results.links.length > 0) {
      for (let index = 0; index < results.links.length; index++) {
        const result = results.links[index];
        let li = document.createElement("li");
        li.className = "tools-buttons-list-li";
        let buttonSpan = document.createElement("span");
        buttonSpan.className = "tools-buttons-list-button";
        let iconText = "fas fa-question";
        if (result.type === "book") {
          iconText = "fas fa-file";
        } else if (result.type === "audio") {
          iconText = "fas fa-file-audio";
        }
        buttonSpan.innerHTML = `<i class="${iconText} fa-2x"></i>`;
        buttonSpan.title = openInAcbrText;
        let multilineText = document.createElement("span");
        multilineText.className = "tools-buttons-list-li-multiline-text";
        {
          let text = document.createElement("span");
          text.innerText = `${result.name}`;
          multilineText.appendChild(text);
          if (result.summary) {
            let text = document.createElement("span");
            text.innerText = `${result.summary}`;
            multilineText.appendChild(text);
          }
        }
        buttonSpan.appendChild(multilineText);
        buttonSpan.addEventListener("click", (event) => {
          onSearchResultClicked(result.id, 0);
        });
        li.appendChild(buttonSpan);
        {
          let buttonSpan = document.createElement("span");
          buttonSpan.className = "tools-buttons-list-button";
          buttonSpan.innerHTML = `<i class="fas fa-external-link-alt"></i>`;
          buttonSpan.title = openInBrowserText;
          buttonSpan.addEventListener("click", (event) => {
            onSearchResultClicked(result.id, 1);
          });
          li.appendChild(buttonSpan);
        }
        ul.appendChild(li);
      }
    } else {
      let li = document.createElement("li");
      li.className = "tools-collection-li";
      let text = document.createElement("span");
      // when 0 results/error openInAcbrText stores the text for that
      text.innerText = openInAcbrText;
      li.appendChild(text);
      ul.appendChild(li);
    }
    searchResultsDiv.appendChild(ul);
    // pagination top
    if (results.hasNext || results.hasPrev) {
      searchResultsDiv.appendChild(generatePaginationHtml(results));
    }

    updateColumnsHeight();
    document.getElementById("tools-columns-right").scrollIntoView({
      behavior: "smooth",
      block: "start",
      inline: "nearest",
    });
    closeModal();
  });
}

function generatePaginationHtml(results) {
  let paginationDiv = document.createElement("div");
  paginationDiv.className = "tools-collection-pagination";
  if (results.engine === "cbp" || results.engine === "disroot") {
    if (results.pageNum > 1) {
      let span = document.createElement("span");
      span.className = "tools-collection-pagination-button";
      span.innerHTML = '<i class="fas fa-angle-double-left"></i>';
      span.addEventListener("click", (event) => {
        onSearch({ pageNum: 1, query: results.query });
      });
      paginationDiv.appendChild(span);
    }
    if (results.hasPrev) {
      let span = document.createElement("span");
      span.className = "tools-collection-pagination-button";
      span.innerHTML = '<i class="fas fa-angle-left"></i>';
      span.addEventListener("click", (event) => {
        onSearch({ pageNum: results.pageNum - 1, query: results.query });
      });
      paginationDiv.appendChild(span);
    }
    // let span = document.createElement("span");
    // span.innerHTML = ` | `;
    // paginationDiv.appendChild(span);
    if (results.hasNext) {
      let span = document.createElement("span");
      span.className = "tools-collection-pagination-button";
      span.innerHTML = '<i class="fas fa-angle-right"></i>';
      span.addEventListener("click", (event) => {
        onSearch({ pageNum: results.pageNum + 1, query: results.query });
      });
      paginationDiv.appendChild(span);
    }
    // NOTE: don't know the total number of pages, so can't add a button to
    // go to the end directly
  } else if (results.engine === "duckduckgo") {
    if (results.firstUrl) {
      let span = document.createElement("span");
      span.className = "tools-collection-pagination-button";
      span.innerHTML = '<i class="fas fa-angle-double-left"></i>';
      span.addEventListener("click", (event) => {
        onSearch({
          query: results.query,
          url: results.firstUrl,
          firstUrl: results.firstUrl,
        });
      });
      paginationDiv.appendChild(span);
    }
    if (results.hasPrev) {
      let span = document.createElement("span");
      span.className = "tools-collection-pagination-button";
      span.innerHTML = '<i class="fas fa-angle-left"></i>';
      span.addEventListener("click", (event) => {
        onSearch({
          query: results.query,
          url: results.prevUrl,
          firstUrl: results.firstUrl,
        });
      });
      paginationDiv.appendChild(span);
    }
    // let span = document.createElement("span");
    // span.innerHTML = ` | `;
    // paginationDiv.appendChild(span);
    if (results.hasNext) {
      let span = document.createElement("span");
      span.className = "tools-collection-pagination-button";
      span.innerHTML = '<i class="fas fa-angle-right"></i>';
      span.addEventListener("click", (event) => {
        onSearch({
          query: results.query,
          url: results.nextUrl,
          firstUrl: results.firstUrl,
        });
      });
      paginationDiv.appendChild(span);
    }
    // NOTE: don't know the total number of pages, so can't add a button to
    // go to the end directly
  }
  return paginationDiv;
}

///////////////////////////////////////////////////////////////////////////////
// TOOL ///////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

async function onSearch(data) {
  if (!g_openModal) showProgressModal(); // TODO: check if first time?
  updateModalTitleText(g_localizedModalSearchingTitleText);
  let engine = g_engineSelect.value;
  if (!data) data = {};
  if (engine === "cbp") {
    if (!data.pageNum) data.pageNum = 1;
    if (!data.query) {
      data.query = g_searchInput.value;
    }
    sendIpcToMain("search-window", {
      engine,
      query: data.query,
      pageNum: data.pageNum,
    });
  } else if (engine === "disroot") {
    if (!data.pageNum) data.pageNum = 1;
    if (!data.query) {
      data.query = g_searchInput.value + " site:comicbookplus.com";
    }
    sendIpcToMain("search-window", {
      engine,
      query: data.query,
      pageNum: data.pageNum,
    });
  } else if (engine === "duckduckgo") {
    // ref: https://duckduckgo.com/duckduckgo-help-pages/results/syntax/
    if (!data.query) {
      data.query = g_searchInput.value + " inurl:dlid site:comicbookplus.com";
    }
    sendIpcToMain("search-window", {
      engine,
      query: data.query,
      url: data.url,
      firstUrl: data.firstUrl,
    });
  }
}

async function onSearchResultClicked(dlid, openWith) {
  if (openWith === 0) {
    try {
      let url = `https://comicbookplus.com/?dlid=${dlid}`;
      onOpenComicUrlInACBR(url);
    } catch (error) {
      console.log(error);
    }
  } else {
    let url = `https://comicbookplus.com/?dlid=${dlid}`;
    openCBPLink(url);
  }
}

//////////////////////////////////////

async function onOpenComicUrlInACBR(url) {
  showProgressModal();
  updateModalTitleText(g_localizedModalLoadingTitleText);
  try {
    if (!url) url = g_urlInput.value;
    const tmp = document.createElement("a");
    tmp.href = url;
    if (tmp.host === "comicbookplus.com") {
      let comicId;
      let parts = url.split("dlid=");
      if (parts.length === 2 && isValidId(parts[1])) {
        comicId = parts[1];
      }
      if (!comicId) return;

      let page = await getFirstPageInfo(comicId, 1);
      if (page && page.url) {
        let comicData = {
          source: "cbp",
          comicId: comicId,
          name: page.name,
          numPages: page.numPages,
          url: `https://comicbookplus.com/?dlid=${comicId}`,
        };
        if (page.url) {
          sendIpcToMain("open", comicData);
        }
      } else if (page && page.audioUrl) {
        showModalOpenInPlayer(
          page,
          g_localizedModalOpenInPlayerTitleText,
          g_localizedModalCancelButtonText,
          g_localizedModalAddToPlaylistButtonText,
          g_localizedModalNewPlaylistButtonText
        );
        return;
      }
      closeModal();
    }
  } catch (error) {
    console.error(error);
    closeModal();
  }
}

function onOpenComicUrlInBrowser(url) {
  if (!url) url = g_urlInput.value;
  openCBPLink(url);
}

function openCBPLink(url) {
  const tmp = document.createElement("a");
  tmp.href = url;
  if (tmp.host === "comicbookplus.com") {
    sendIpcToMain("open-url-in-browser", url);
  }
}

//////////////////////////////////////

async function getFirstPageInfo(comicId) {
  try {
    const response = await axios.get(
      `https://comicbookplus.com/?dlid=${comicId}`,
      { timeout: 15000 }
    );
    let numPages;
    let regex = /comicnumpages=(.*);/;
    let match = response.data.match(regex);
    if (match && match.length > 0) {
      numPages = match[1];
    }

    const parser = new DOMParser().parseFromString(response.data, "text/html");
    let title = parser.title.replace(" - Comic Book Plus", "");
    //e.g. <img src="https://box01.comicbookplus.com/viewer/5e/5e287e0a63a5733bb2fd0e5c49f80f4d/9.jpg" id="maincomic" width="975" alt="Book Cover For Space Action 1" onclick="turnpage(1)" itemprop="image">
    let imageUrl = parser.getElementById("maincomic")?.src;
    if (imageUrl) return { url: imageUrl, numPages: numPages, name: title };

    // maybe it's an mp3
    regex = /href="(http.*?).mp3">/;
    match = response.data.match(regex);
    if (match && match.length > 0) {
      const audioUrl = match[1] + ".mp3";
      return { audioUrl, name: title };
    }
    return undefined;
  } catch (error) {
    console.error(error);
    return undefined;
  }
}

//////////////////////////////////////

// ref: https://stackoverflow.com/questions/10834796/validate-that-a-string-is-a-positive-integer
function isValidId(str) {
  let n = Math.floor(Number(str));
  return n !== Infinity && String(n) === str && n >= 0;
}

function reduceString(input) {
  if (!input) return undefined;
  let length = 80;
  input =
    input.length > length
      ? "..." + input.substring(input.length - length, input.length)
      : input;
  return input;
}

///////////////////////////////////////////////////////////////////////////////
// EVENT LISTENERS ////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

export function onInputEvent(type, event) {
  if (getOpenModal()) {
    modals.onInputEvent(getOpenModal(), type, event);
    return;
  }
  switch (type) {
    case "onkeydown": {
      if (event.key == "Tab") {
        event.preventDefault();
      }
      break;
    }
  }
}

export function onContextMenu(params) {
  if (getOpenModal()) {
    return;
  }
  sendIpcToMain("show-context-menu", params);
}

///////////////////////////////////////////////////////////////////////////////
// MODALS /////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

let g_openModal;

export function getOpenModal() {
  return g_openModal;
}

function closeModal() {
  if (g_openModal) {
    modals.close(g_openModal);
    modalClosed();
  }
}

function modalClosed() {
  g_openModal = undefined;
}

function showProgressModal() {
  if (g_openModal) {
    return;
  }
  g_openModal = modals.show({
    title: " ",
    message: " ",
    zIndexDelta: 5,
    frameWidth: 600,
    close: {
      callback: () => {
        modalClosed();
      },
      // key: "Escape",
      hide: true,
    },
    progressBar: {},
  });
}

function showModalOpenInPlayer(
  page,
  title,
  textButtonBack,
  textButtonAddToPlayList,
  textButtonNewPlaylist,
  showFocus
) {
  if (g_openModal) {
    closeModal();
  }
  let buttons = [];
  buttons.push({
    text: textButtonAddToPlayList.toUpperCase(),
    fullWidth: true,
    callback: () => {
      modalClosed();
      sendIpcToMain("open-audio", page.audioUrl, page.name, 0);
    },
  });
  buttons.push({
    text: textButtonNewPlaylist.toUpperCase(),
    fullWidth: true,
    callback: () => {
      modalClosed();
      sendIpcToMain("open-audio", page.audioUrl, page.name, 1);
    },
  });
  buttons.push({
    text: textButtonBack.toUpperCase(),
    fullWidth: true,
    callback: () => {
      modalClosed();
    },
  });
  g_openModal = modals.show({
    showFocus: showFocus,
    title: title,
    message: page.audioUrl,
    frameWidth: 400,
    zIndexDelta: 5,
    close: {
      callback: () => {
        modalClosed();
      },
      key: "Escape",
    },
    buttons: buttons,
  });
}

function updateModalTitleText(text) {
  if (g_openModal) g_openModal.querySelector(".modal-title").innerHTML = text;
}

function updateInfoText(text) {
  if (g_openModal) g_openModal.querySelector(".modal-message").innerHTML = text;
}

function updateLogText(text, append = true) {
  if (g_openModal) {
    const log = g_openModal.querySelector(".modal-log");
    if (append) {
      log.innerHTML += "\n" + text;
    } else {
      log.innerHTML = text;
    }
    log.scrollTop = log.scrollHeight;
  }
}
