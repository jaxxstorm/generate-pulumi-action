import * as g from '@jaxxstorm/pulumi-action-config/workflow';
import * as param from '@jkcfg/std/param';

const provider = param.String('provider');
// eslint-disable-next-line no-template-curly-in-string
const branchWorkflow = name => new g.GithubWorkflow('branches', { GITHUB_TOKEN: '${{ secrets.GITHUB_TOKEN }}', GO111MODULE: 'on', PROVIDER: provider });

// eslint-disable-next-line no-template-curly-in-string
const releaseWorkflow = name => new g.GithubReleaseWorkFlow('release', { GITHUB_TOKEN: '${{ secrets.GITHUB_TOKEN }}', GO111MODULE: 'on', PROVIDER: provider });

// eslint-disable-next-line no-template-curly-in-string
const preReleaseWorkflow = name => new g.GithubPrereleaseWorkflow('prerelease', { GITHUB_TOKEN: '${{ secrets.GITHUB_TOKEN }}', GO111MODULE: 'on', PROVIDER: provider });

export default [
  { value: branchWorkflow('branch'), file: 'branches.yml' },
  { value: releaseWorkflow('release'), file: 'release.yml' },
  { value: preReleaseWorkflow('prerelease'), file: 'prerelease.yml' },


];
