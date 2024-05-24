/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');
const archiver = require('archiver');
const { execSync } = require('child_process');

const EXT_NAME = 'gzker-plus';
const { version } = require('./package.json');

const distPath = path.resolve(__dirname, 'dist');
const outputDir = path.resolve(__dirname, '.output');
const chromeZipFileName = `${EXT_NAME}-${version}-chromium.zip`;
const firefoxZipFileName = `${EXT_NAME}-${version}-firefox.zip`;
const sourcesZipFileName = `${EXT_NAME}-${version}-sources.zip`;
const chromeOutputPath = path.resolve(outputDir, chromeZipFileName);
const firefoxOutputPath = path.resolve(outputDir, firefoxZipFileName);
const sourcesOutputPath = path.resolve(outputDir, sourcesZipFileName);

// eslint-disable-next-line max-params
function compressFolder(inputPath, outputPath, zipFileName, ignore) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      console.log(`🎉 ${zipFileName} compression completed`);
      resolve();
    });

    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        console.warn(err);
      } else {
        reject(err);
      }
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);

    archive.glob('**', {
      cwd: inputPath,
      ignore,
      dot: true,
    });

    archive.finalize();
  });
}

async function runCompression() {
  try {
    // 创建输出文件夹
    if (fs.existsSync(outputDir)) {
      fse.emptyDirSync(outputDir);
    } else {
      fs.mkdirSync(outputDir);
    }

    // 执行 pnpm build 构建 Chrome 版本
    console.log('📦 start compressing the chrome version...');
    execSync('pnpm build', { stdio: 'ignore' });

    // 压缩 Chrome 版本
    await compressFolder(distPath, chromeOutputPath, chromeZipFileName);

    // 执行 pnpm build:ff 构建 Firefox 版本
    console.log('📦 start compressing the firefox version...');
    execSync('pnpm build:ff', { stdio: 'ignore' });

    // 压缩 Firefox 版本
    await compressFolder(distPath, firefoxOutputPath, firefoxZipFileName);

    console.log('📦 start compressing the source code of the project...');

    // 压缩项目源码
    await compressFolder(__dirname, sourcesOutputPath, sourcesZipFileName, [
      '**/{.git,.github,.output,dist,node_modules}/**',
      '.webextrc.json',
    ]);
  } catch (err) {
    console.error('An error occurred:', err);
  }
}

runCompression();
