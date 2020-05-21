import * as g from '@jaxxstorm/pulumi-action-config/workflow';
import * as param from '@jkcfg/std/param';

const provider = param.String('provider');
const prWorkflow = name => new g.GithubWorkflow('pull-request',
  // eslint-disable-next-line no-template-curly-in-string
                                                { GITHUB_TOKEN: '${{ secrets.GITHUB_TOKEN }}', GO111MODULE: 'on', PROVIDER: provider });

const releaseWorkflow = name => new g.GithubReleaseWorkFlow('release',
  // eslint-disable-next-line no-template-curly-in-string
                                                            { GITHUB_TOKEN: '${{ secrets.GITHUB_TOKEN }}', GO111MODULE: 'on', PROVIDER: provider });

export default [
  { value: prWorkflow('pull-request'), file: 'pull-request.yml' },
  { value: releaseWorkflow('release'), file: 'release.yml' },

];
