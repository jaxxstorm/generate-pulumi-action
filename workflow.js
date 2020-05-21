import * as g from '@jaxxstorm/generate-pulumi-action/workflow';

const provider = "rancher2";

const prWorkflow = name => new g.GithubWorkflow(`pull-request`,
  { GITHUB_TOKEN: "${{ secrets.GITHUB_TOKEN }}", GO111MODULE: "on", PROVIDER: provider },
  { on: { pull_request: { branches: [ "master" ] } }
  })

const releaseWorkflow = name => new g.GithubReleaseWorkFlow(`release`,
  { GITHUB_TOKEN: "${{ secrets.GITHUB_TOKEN }}", GO111MODULE: "on", PROVIDER: provider },
  { on: { push: { tags: [ "v*" ] } }
  })

export default [
  { value: prWorkflow('pull-request'), file: 'pull-request.yml' },
  { value: releaseWorkflow('release'), file: 'release.yml' },

];
