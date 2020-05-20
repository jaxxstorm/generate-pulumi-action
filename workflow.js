import * as g from '@jaxxstorm/generate-pulumi-action/workflow';

const workflow = name => new g.GithubWorkflow(`release`)

export default [
  { value: workflow('pull-request'), file: 'pull-request.yml' },
  { value: workflow('release'), file: 'release.yml' },

];
