import firebaseRulesPlugin from '@firebase/eslint-plugin-security-rules';

export default [
  {
    ignores: ['dist/**/*', 'node_modules/**/*', '*.ts', '*.tsx', '*.js', '*.mjs', '*.cjs', '*.html', '*.json', '*.css']
  },
  firebaseRulesPlugin.configs['flat/recommended'],
];
