import fs from 'node:fs';
import path from 'path';

export const isNodeProject = (rootDir: string): boolean => fs.existsSync(path.join(rootDir, 'package.json'));

export const rmDirSync = (dirPath: string) => {
  if (fs.existsSync(dirPath)) {
    fs.readdirSync(dirPath).forEach((file) => {
      const curPath = path.join(dirPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        // recurse
        rmDirSync(curPath);
      } else {
        // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(dirPath);
  }
};