import type { ChangelogConfig } from 'changelogen';

const config: Partial<ChangelogConfig> = {
  types: {
    feat: { title: '🚀 新增', semver: 'minor' },
    perf: { title: '🔥 优化', semver: 'patch' },
    fix: { title: '🐞 修复', semver: 'patch' },
    refactor: false,
    docs: false,
    build: false,
    types: false,
    chore: false,
    examples: false,
    test: false,
    style: false,
    ci: false,
  },
  noAuthors: true,
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
