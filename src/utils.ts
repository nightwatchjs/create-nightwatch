import fs from 'fs';
import path from 'path';

/**
   * Strips out all control characters from a string
   * However, excludes newline and carriage return
   *
   * @param {string} input String to remove invisible chars from
   * @returns {string} Initial input string but without invisible chars
   */
  export const stripControlChars = (input: string): string => {
  return input && input.replace(
    // eslint-disable-next-line no-control-regex
    /[\x00-\x09\x0B-\x0C\x0E-\x1F\x7F-\x9F]/g,
    ''
  );
}

export const symbols = () => {
  let ok = String.fromCharCode(10004);
  let fail = String.fromCharCode(10006);

  if (process.platform === 'win32') {
    ok = '\u221A';
    fail = '\u00D7';
  }

  return {
    ok: ok,
    fail: fail
  };
}

export const copy = (src: string, dest: string, excludeDir: string[]): void => {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    copyDir(src, dest, excludeDir);
  } else {
    fs.copyFileSync(src, dest);
  }
}

const copyDir = (srcDir: string, destDir: string, excludeDir: string[]): void => {
  if (excludeDir.some((dir) => srcDir.endsWith(dir))) return;

  fs.mkdirSync(destDir, { recursive: true });
  for (const file of fs.readdirSync(srcDir)) {
    const srcFile = path.resolve(srcDir, file);
    const destFile = path.resolve(destDir, file);
    copy(srcFile, destFile, excludeDir);
  }
}
