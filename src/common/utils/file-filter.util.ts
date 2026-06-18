import * as path from 'path';
import { BadRequestException } from '@nestjs/common';

// Extensions that can execute code or carry malware payloads
const BLOCKED_EXTENSIONS = new Set([
  // Windows executables & installers
  'exe', 'com', 'cmd', 'bat', 'msi', 'msp', 'mst', 'pif', 'scr', 'cpl', 'inf',
  // Windows shortcuts / registry / management
  'lnk', 'reg', 'msc', 'gadget', 'application',
  // Windows scripts
  'ps1', 'psm1', 'psd1', 'psc1', 'vbs', 'vbe', 'jse', 'wsf', 'wsh', 'hta',
  // Unix/macOS scripts & shared libs
  'sh', 'bash', 'zsh', 'csh', 'ksh', 'fish', 'command', 'run',
  'so', 'dylib',
  // JVM
  'jar', 'class', 'war', 'ear', 'jnlp',
  // Native libraries
  'dll',
  // Macro-enabled Office formats
  'docm', 'dotm', 'xlsm', 'xlam', 'xla', 'pptm', 'potm', 'ppam', 'sldm',
  // Other risky
  'ade', 'adp', 'app', 'bas', 'chm', 'crt', 'hlp', 'isp', 'mdb',
  'mde', 'mdt', 'mdw', 'mdz', 'nsh', 'ops', 'pcd', 'prg', 'url',
  'wsc', 'xbap',
]);

// Extract ALL extensions from a filename (catches double-extension tricks like virus.exe.txt)
function getAllExtensions(filename: string): string[] {
  const parts = filename.split('.');
  if (parts.length <= 1) return [];
  return parts.slice(1).map((e) => e.toLowerCase().trim());
}

export function validateFileExtension(originalname: string): void {
  const allExts = getAllExtensions(path.basename(originalname));

  if (allExts.length === 0) return; // no extension, allow (e.g. Makefile)

  for (const ext of allExts) {
    if (BLOCKED_EXTENSIONS.has(ext)) {
      throw new BadRequestException(
        `File type ".${ext}" is not allowed for security reasons`,
      );
    }
  }
}

// Multer fileFilter callback — used in MulterModule config
export function multerFileFilter(
  req: any,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
): void {
  try {
    validateFileExtension(file.originalname);
    callback(null, true);
  } catch (err) {
    callback(err as Error, false);
  }
}
