import type { ChangelogConfig } from 'changelogen';

const config: Partial<ChangelogConfig> = {
  types: {
    feat: { title: '🚀 新增', semver: 'minor' },
    perf: { title: '🔥 优化', semver: 'patch' },
    fix: { title: '🐞 修复', semver: 'patch' },
  },
  output: 'src/markdown/ChangeLog.md',
  publish: {
    private: false,
    tag: 'latest',
    args: [],
  },
  templates: {
    commitMessage: '🐳 chore(release): v{{newVersion}}',
    tagMessage: 'v{{newVersion}}',
    tagBody: 'v{{newVersion}}',
  },
};

export default config;
