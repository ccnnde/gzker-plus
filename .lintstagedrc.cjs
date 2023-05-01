module.exports = {
  '*': 'prettier --cache --ignore-unknown --write',
  '*.{css,vue}': 'stylelint --cache --fix',
  '*.{js,jsx,ts,tsx,vue}': 'eslint --cache --max-warnings 0 --fix',
  '*.{ts,tsx,vue}': () => 'vue-tsc --noEmit --skipLibCheck',
};
