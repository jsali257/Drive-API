"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateFileExtension = validateFileExtension;
exports.multerFileFilter = multerFileFilter;
const path = require("path");
const common_1 = require("@nestjs/common");
const BLOCKED_EXTENSIONS = new Set([
    'exe', 'com', 'cmd', 'bat', 'msi', 'msp', 'mst', 'pif', 'scr', 'cpl', 'inf',
    'lnk', 'reg', 'msc', 'gadget', 'application',
    'ps1', 'psm1', 'psd1', 'psc1', 'vbs', 'vbe', 'jse', 'wsf', 'wsh', 'hta',
    'sh', 'bash', 'zsh', 'csh', 'ksh', 'fish', 'command', 'run',
    'so', 'dylib',
    'jar', 'class', 'war', 'ear', 'jnlp',
    'dll',
    'docm', 'dotm', 'xlsm', 'xlam', 'xla', 'pptm', 'potm', 'ppam', 'sldm',
    'ade', 'adp', 'app', 'bas', 'chm', 'crt', 'hlp', 'isp', 'mdb',
    'mde', 'mdt', 'mdw', 'mdz', 'nsh', 'ops', 'pcd', 'prg', 'url',
    'wsc', 'xbap',
]);
function getAllExtensions(filename) {
    const parts = filename.split('.');
    if (parts.length <= 1)
        return [];
    return parts.slice(1).map((e) => e.toLowerCase().trim());
}
function validateFileExtension(originalname) {
    const allExts = getAllExtensions(path.basename(originalname));
    if (allExts.length === 0)
        return;
    for (const ext of allExts) {
        if (BLOCKED_EXTENSIONS.has(ext)) {
            throw new common_1.BadRequestException(`File type ".${ext}" is not allowed for security reasons`);
        }
    }
}
function multerFileFilter(req, file, callback) {
    try {
        validateFileExtension(file.originalname);
        callback(null, true);
    }
    catch (err) {
        callback(err, false);
    }
}
//# sourceMappingURL=file-filter.util.js.map