module.exports = {
  '*': 'prettier --cache --ignore-unknown --write',
  '*.{scss,vue}': 'stylelint --cache --fix',
  '*.{js,jsx,ts,tsx,vue}': 'eslint --cache --max-warnings 0 --fix',
  '!(package|settings).json': 'eslint --cache --max-warnings 0 --fix', // https://github.com/eslint/eslint/issues/15010#issuecomment-1461511493
  '*.{ts,tsx,vue}': () => 'vue-tsc --noEmit --skipLibCheck',
};
