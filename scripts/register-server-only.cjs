/** Allow tsx scripts to import `server-only` modules outside Next.js. */
const Module = require("module");
const path = require("path");
const empty = path.join(__dirname, "empty-module.cjs");
const original = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === "server-only") return empty;
  return original.call(this, request, parent, isMain, options);
};
