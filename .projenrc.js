const { typescript } = require('projen');
const project = new typescript.TypeScriptAppProject({
  defaultReleaseBranch: 'main',
  name: 'dashpad-github',
  description: 'GitHub integration for dashpad',

  deps: ['@octokit/graphql', 'yargs'],

  authorName: 'Rico Huijbers',
  authorEmail: 'rix0rrr@gmail.com',

  // Need to explicitly enable both of these for app projects
  release: true,
  package: true,
  releaseToNpm: true,
});

project.synth();