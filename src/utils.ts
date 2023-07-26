import fs from 'node:fs';
import path from 'path';

export const isNodeProject = (rootDir: string): boolean => fs.existsSync(path.join(rootDir, 'package.json'));
