/**
 * @license
 * Copyright 2020-2023 Álvaro García
 * www.binarynonsense.com
 * SPDX-License-Identifier: BSD-2-Clause
 */

const path = require("path");
const os = require("os");
const fs = require("fs");
const log = require("./logger");

///////////////////////////////////////////////////////////////////////////////
// MOVE ///////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

exports.moveFile = function (oldPath, newPath) {
  try {
    fs.renameSync(oldPath, newPath);
  } catch (error) {
    if (error.code === "EXDEV") {
      // EXDEV = cross-device link not permitted.
      fs.copyFileSync(oldPath, newPath);
      fs.unlinkSync(oldPath);
    } else {
      throw error;
    }
  }
};

///////////////////////////////////////////////////////////////////////////////
// EXTENSIONS /////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

function getMimeType(filePath) {
  let mimeType = path.extname(filePath).substring(1);
  return mimeType;
}
exports.getMimeType = getMimeType;

function hasImageExtension(filePath) {
  const allowedFileExtensions = [
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".bmp",
    ".avif",
  ];
  let fileExtension = path.extname(filePath).toLowerCase();
  for (i = 0; i < allowedFileExtensions.length; i++) {
    if (fileExtension === allowedFileExtensions[i]) {
      return true;
    }
  }
  return false;
}
exports.hasImageExtension = hasImageExtension;

exports.hasBookExtension = function (filePath) {
  const allowedFileExtensions = [".cbz", ".cbr", ".pdf", ".epub", ".cb7"];
  let fileExtension = path.extname(filePath).toLowerCase();
  for (i = 0; i < allowedFileExtensions.length; i++) {
    if (fileExtension === allowedFileExtensions[i]) {
      return true;
    }
  }
  return false;
};

exports.hasComicBookExtension = function (filePath) {
  const allowedFileExtensions = [".cbz", ".cbr", ".pdf", ".epub", ".cb7"];
  let fileExtension = path.extname(filePath).toLowerCase();
  for (i = 0; i < allowedFileExtensions.length; i++) {
    if (fileExtension === allowedFileExtensions[i]) {
      return true;
    }
  }
  return false;
};

exports.hasEpubExtension = function (filePath) {
  let fileExtension = path.extname(filePath).toLowerCase();
  if (fileExtension === ".epub") {
    return true;
  }
  return false;
};

exports.hasPdfKitCompatibleImageExtension = function (filePath) {
  const allowedFileExtensions = [".jpg", ".jpeg", ".png"];
  let fileExtension = path.extname(filePath).toLowerCase();
  for (i = 0; i < allowedFileExtensions.length; i++) {
    if (fileExtension === allowedFileExtensions[i]) {
      return true;
    }
  }
  return false;
};

exports.hasEpubSupportedImageExtension = function (filePath) {
  const allowedFileExtensions = [".jpg", ".jpeg", ".png"]; // gif?
  let fileExtension = path.extname(filePath).toLowerCase();
  for (i = 0; i < allowedFileExtensions.length; i++) {
    if (fileExtension === allowedFileExtensions[i]) {
      return true;
    }
  }
  return false;
};

///////////////////////////////////////////////////////////////////////////////
// GET IMAGES /////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

const getImageFilesInFolderRecursive = function (folderPath) {
  let filesArray = [];
  let dirs = [];

  if (fs.existsSync(folderPath)) {
    let nodes = fs.readdirSync(folderPath);
    nodes.forEach((node) => {
      const nodePath = path.join(folderPath, node);
      if (fs.lstatSync(nodePath).isDirectory()) {
        dirs.push(nodePath); // check later so this folder's imgs come first
      } else {
        if (hasImageExtension(nodePath)) {
          filesArray.push(nodePath);
        }
      }
    });
    // now check inner folders
    dirs.forEach((dir) => {
      filesArray = filesArray.concat(getImageFilesInFolderRecursive(dir));
    });
  }
  return filesArray;
};
exports.getImageFilesInFolderRecursive = getImageFilesInFolderRecursive;

function getImageFilesInFolder(folderPath) {
  if (fs.existsSync(folderPath) && fs.lstatSync(folderPath).isDirectory()) {
    let filesInFolder = fs.readdirSync(folderPath);
    if (filesInFolder.length === 0) {
      return [];
    } else {
      return filesInFolder.filter(hasImageExtension);
    }
  } else {
    return [];
  }
}
exports.getImageFilesInFolder = getImageFilesInFolder;

///////////////////////////////////////////////////////////////////////////////
// GET COMIC INFO FILE ////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

const getComicInfoFileInFolderRecursive = function (folderPath) {
  let filesArray = [];
  let dirs = [];

  if (fs.existsSync(folderPath)) {
    let nodes = fs.readdirSync(folderPath);
    nodes.forEach((node) => {
      const nodePath = path.join(folderPath, node);
      if (fs.lstatSync(nodePath).isDirectory()) {
        dirs.push(nodePath); // check later so this folder's imgs come first
      } else {
        let fileName = path.basename(nodePath);
        if (fileName.toLowerCase() === "comicinfo.xml") {
          filesArray.push(nodePath);
        }
      }
    });
    // now check inner folders
    dirs.forEach((dir) => {
      filesArray = filesArray.concat(getComicInfoFileInFolderRecursive(dir));
    });
  }

  // NOTE: could there be more than one? I'll just return the first one for now, if any
  if (filesArray.length > 0) return filesArray[0];
  else return undefined;
};
exports.getComicInfoFileInFolderRecursive = getComicInfoFileInFolderRecursive;

///////////////////////////////////////////////////////////////////////////////
// DELETE /////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

function deleteFolderRecursive(
  folderPath,
  logToConsole,
  pathStartsWith,
  nameStartsWith
) {
  if (fs.existsSync(folderPath)) {
    if (nameStartsWith) {
      const folderName = path.basename(folderPath);
      if (!folderName.startsWith(nameStartsWith)) {
        return;
      }
    }
    if (pathStartsWith) {
      if (!folderPath.startsWith(pathStartsWith)) {
        return;
      }
    }
    let files = fs.readdirSync(folderPath);
    files.forEach((file) => {
      const entryPath = path.join(folderPath, file);
      if (fs.lstatSync(entryPath).isDirectory()) {
        deleteFolderRecursive(entryPath, logToConsole);
      } else {
        fs.unlinkSync(entryPath); // delete the file
      }
    });
    try {
      fs.rmdirSync(folderPath);
      if (logToConsole) log.debug("deleted folder: " + folderPath);
    } catch (error) {
      if (error.code == "ENOTEMPTY") {
        // TODO: retry?
        // this can happen if for examplethe temp folder is the same
        // as the one the conversion is outputing to
      }
      log.error("Error: " + error.code);
      log.error("couldn't delete folder: " + folderPath);
    }
  }
}
exports.deleteFolderRecursive = deleteFolderRecursive;

///////////////////////////////////////////////////////////////////////////////
// TEMP FOLDER ////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

let g_tempFolderPath = undefined;
let g_tempFolderParentPath = undefined;

function getTempFolderPath() {
  return g_tempFolderPath;
}
exports.getTempFolderPath = getTempFolderPath;

function getTempFolderParentPath() {
  return g_tempFolderParentPath;
}
exports.getTempFolderParentPath = getTempFolderParentPath;

function setTempFolderParentPath(folderPath) {
  g_tempFolderParentPath = folderPath;
}
exports.setTempFolderParentPath = setTempFolderParentPath;

function getSystemTempFolderPath() {
  return os.tmpdir();
}
exports.getSystemTempFolderPath = getSystemTempFolderPath;

function createTempFolder(keepTrack = true) {
  let tempFolderPath = fs.mkdtempSync(
    path.join(g_tempFolderParentPath, "acbr-")
  );
  if (keepTrack) {
    g_tempFolderPath = tempFolderPath;
  }
  return tempFolderPath;
}
exports.createTempFolder = createTempFolder;

function cleanUpTempFolder(tempFolderPath) {
  if (tempFolderPath) {
    deleteFolderRecursive(tempFolderPath, false, undefined, "acbr-");
  } else {
    if (g_tempFolderPath === undefined) return;
    deleteFolderRecursive(g_tempFolderPath, true, undefined, "acbr-");
    g_tempFolderPath = undefined;
  }
}
exports.cleanUpTempFolder = cleanUpTempFolder;
