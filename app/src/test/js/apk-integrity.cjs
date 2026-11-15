"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const crypto = require("node:crypto");
const zlib = require("node:zlib");

const apkPath = process.argv[2];
assert.ok(apkPath, "Usage: node apk-integrity.cjs <signed.apk>");
const apk = fs.readFileSync(apkPath);
let footer = -1;
for (let offset = apk.length - 22; offset >= Math.max(0, apk.length - 65557); offset--) {
  if (apk.readUInt32LE(offset) === 0x06054b50 && offset + 22 + apk.readUInt16LE(offset + 20) === apk.length) {
    footer = offset;
    break;
  }
}
assert.notEqual(footer, -1, "Missing ZIP central directory");
assert.equal(apk.readUInt16LE(footer + 4), 0, "Multi-disk ZIP is unsupported");
const entries = new Map();
const count = apk.readUInt16LE(footer + 10);
let offset = apk.readUInt32LE(footer + 16);
for (let index = 0; index < count; index++) {
  assert.equal(apk.readUInt32LE(offset), 0x02014b50, "Invalid ZIP entry");
  const nameSize = apk.readUInt16LE(offset + 28);
  const extraSize = apk.readUInt16LE(offset + 30);
  const commentSize = apk.readUInt16LE(offset + 32);
  const name = apk.toString("utf8", offset + 46, offset + 46 + nameSize);
  assert.equal(entries.has(name), false, `Duplicate APK entry: ${name}`);
  entries.set(name, {
    method: apk.readUInt16LE(offset + 10),
    compressedSize: apk.readUInt32LE(offset + 20),
    size: apk.readUInt32LE(offset + 24),
    localOffset: apk.readUInt32LE(offset + 42)
  });
  offset += 46 + nameSize + extraSize + commentSize;
}

function readEntry(name) {
  const entry = entries.get(name);
  assert.ok(entry, `Missing packaged asset: ${name}`);
  const header = entry.localOffset;
  assert.equal(apk.readUInt32LE(header), 0x04034b50, `Invalid local entry: ${name}`);
  const start = header + 30 + apk.readUInt16LE(header + 26) + apk.readUInt16LE(header + 28);
  const compressed = apk.subarray(start, start + entry.compressedSize);
  assert.ok(entry.method === 0 || entry.method === 8, `Unsupported compression: ${name}`);
  const bytes = entry.method === 0 ? compressed : zlib.inflateRawSync(compressed);
  assert.equal(bytes.length, entry.size, `Wrong unpacked size: ${name}`);
  return bytes;
}

const manifestName = "assets/cc-assets-manifest.json";
const manifest = JSON.parse(readEntry(manifestName).toString("utf8"));
assert.equal(manifest.hashAlgorithm, "SHA-256");
assert.ok(Array.isArray(manifest.files) && manifest.files.length > 0, "Empty asset manifest");
const declared = new Set();
for (const file of manifest.files) {
  const name = `assets/${file.path}`;
  assert.equal(declared.has(name), false, `Duplicate manifest path: ${name}`);
  declared.add(name);
  const bytes = readEntry(name);
  assert.equal(bytes.length, file.size, `Manifest size mismatch: ${name}`);
  assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"), file.sha256, `Manifest hash mismatch: ${name}`);
}
// Android adds compiled startup profiles; they are not part of the source asset catalog.
const generatedAssets = new Set(["assets/dexopt/baseline.prof", "assets/dexopt/baseline.profm"]);
for (const name of entries.keys()) {
  if (name.startsWith("assets/") && !name.endsWith("/") && name !== manifestName && !generatedAssets.has(name)) {
    assert.ok(declared.has(name), `Undeclared packaged asset: ${name}`);
  }
}
console.log(`Verified ${manifest.files.length} packaged assets and SHA-256 hashes; version ${manifest.version}.`);
console.log(`APK size: ${(apk.length / 1048576).toFixed(2)} MiB (${apk.length} bytes).`);
console.log(`APK SHA-256: ${crypto.createHash("sha256").update(apk).digest("hex")}`);
