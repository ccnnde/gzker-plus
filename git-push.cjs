/* eslint-disable @typescript-eslint/no-require-imports */
const { execSync } = require('child_process');
const { version } = require('./package.json');

function gitCommitAndPush() {
  const commitMessage = `🐳 chore(release): v${version}`;
  const tagName = `v${version}`;

  try {
    console.log('🚀 git commit...');
    execSync(`git commit -am "${commitMessage}"`);

    console.log('🚀 git tag...');
    execSync(`git tag ${tagName}`);

    console.log('🚀 git push...');
    execSync('git push');
    execSync('git push --tags');

    console.log('🎉 completed');
  } catch (error) {
    console.error('❌ git error:', error);
  }
}

gitCommitAndPush();
