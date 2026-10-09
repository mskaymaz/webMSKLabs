import fs from 'fs';
import path from 'path';

/**
 * TEST-003 / AGENTS.md — Line Limit Quality Gate Validator (Max 450 lines per file)
 */
export interface LineCheckResult {
  passed: boolean;
  totalFilesChecked: number;
  exceededFiles: Array<{ filePath: string; lineCount: number }>;
}

export function getAllCodeFiles(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.git') && !file.includes('dist') && !file.includes('.wrangler')) {
        getAllCodeFiles(filePath, fileList);
      }
    } else if (/\.(ts|tsx|js|jsx)$/.test(file)) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

export function checkLineLimits(
  targetDirs = [
    path.join(process.cwd(), 'src'),
    path.join(process.cwd(), 'scripts')
  ],
  maxLines = 450
): LineCheckResult {
  const exceededFiles: Array<{ filePath: string; lineCount: number }> = [];
  let totalFilesChecked = 0;

  targetDirs.forEach(dir => {
    const codeFiles = getAllCodeFiles(dir);
    totalFilesChecked += codeFiles.length;

    codeFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      if (lines.length > maxLines) {
        exceededFiles.push({ filePath: file, lineCount: lines.length });
      }
    });
  });

  return {
    passed: exceededFiles.length === 0,
    totalFilesChecked,
    exceededFiles
  };
}

// CLI Execution
if (process.argv[1] && process.argv[1].includes('check_line_limit')) {
  const res = checkLineLimits();
  console.log(`[CI QUALITY GATE] Line Limit Check: ${res.totalFilesChecked} files checked.`);
  if (!res.passed) {
    console.error(`[CI QUALITY GATE ERROR] The following files exceed the ${450}-line limit:`);
    res.exceededFiles.forEach(f => console.error(` - ${f.filePath}: ${f.lineCount} lines`));
    process.exit(1);
  } else {
    console.log('[CI QUALITY GATE SUCCESS] All files are under 450 lines.');
  }
}
