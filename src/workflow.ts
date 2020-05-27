/*
export class On {
  pull_request = {
    branches: ["master"]
  };
  constructor(params?: Partial<On>) {
    Object.assign(this, params)
  }
}

export class Env {

  constructor(PROVIDER, params?: Partial<Env>) {
    Object.assign(this, PROVIDER, params);
  }
}
*/

interface Step {
  name?: string;
  uses?: string;
  run?: string;
  with?: any;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface Steps extends Array<Step>{}

interface Job {
  name: string;
  on: any;
  needs?: string;
  steps: Steps;
}

// A base job, all of these have the same required steps
class BaseJob implements Job {
  name: string;
  needs?: string;
  container?: string;
  strategy?: any; // FIXME: Stop cheating, this should be an interface
  on: any;
  'runs-on' = 'ubuntu-latest';
  steps: Steps = [
    {
      name: 'Checkout Repo',
      uses: 'actions/checkout@v2',
    },
    {
      name: 'Checkout Scripts Repo',
      uses: 'actions/checkout@v2',
      with: {
        repository: 'pulumi/scripts',
        path: 'ci-scripts',
      },
    },
    {
      name: 'Unshallow clone for tags',
      run: 'git fetch --prune --unshallow',
    },
    {
      name: 'Install Go',
      uses: 'actions/setup-go@v2',
      with: {
        'go-version': '1.13.x', // FIXME make this configurable
      },
    },
    {
      name: 'Install tf2pulumi',
      uses: 'jaxxstorm/action-install-gh-release@release/v1-alpha',
      with: {
        repo: 'pulumi/tf2pulumi',
      },
    },
    {
      name: 'Install pulumictl',
      uses: 'jaxxstorm/action-install-gh-release@release/v1-alpha',
      with: {
        repo: 'pulumi/pulumictl',
      },
    },
    {
      name: 'Install Pulumi CLI',
      uses: 'pulumi/action-install-pulumi-cli@releases/v1',
    },
  ];
  constructor(name, params?: Partial<BaseJob>) {
    Object.assign(this, { name }, params);
  }

  // FIXME: we should accept an array here and flatten it
  // but for now, let's just make this a single operation
  addStep(step) {
    this.steps.push(step);
    return this;
  }
}

export class MultilangJob extends BaseJob {
  strategy = {
    'fail-fast': true,
    matrix: {
      language: ['nodejs', 'python', 'dotnet'],
    },
  };
  steps = this.steps.concat([
    {
      name: 'Setup Node',
      uses: 'actions/setup-node@v1',
      with: {
        'node-version': '13.x',
        'registry-url': 'https://registry.npmjs.org',
      },
    },
    {
      name: 'Setup DotNet',
      uses: 'actions/setup-dotnet@v1',
      with: {
        'dotnet-version': '3.1.201',
      },
    },
    {
      name: 'Setup Python',
      uses: 'actions/setup-python@v1',
      with: {
        'python-version': '3.x',
      },
    },
    {
      name: 'Download provider + tfgen binaries',
      uses: 'actions/download-artifact@v2',
      with: {
        // eslint-disable-next-line no-template-curly-in-string
        name: 'pulumi-${{ env.PROVIDER }}',
        // eslint-disable-next-line no-template-curly-in-string
        path: '${{ github.workspace }}/bin',
      },
    },
    {
      name: 'Restore binary perms',
      // eslint-disable-next-line no-template-curly-in-string
      run: 'find ${{ github.workspace }} -name "pulumi-*-${{ env.PROVIDER }}" -print -exec chmod +x {} \\;',
    },
  ]);
}

interface Workflow {
  name: string;
  jobs: any;
}


export class GithubWorkflow implements Workflow {
  name: string;
  env: object;
  on: any = {
    pull_request: { branches: ['master'] },
    push: { branches: ['master'] },
  };
  // env = new Env(this.provider);
  jobs: any = {
    lint: new BaseJob('lint', { container: 'golangci/golangci-lint:v1.25.1' }).addStep(
      {
        name: 'Run golangci',
        run: 'make -f Makefile.github lint_provider',
      },
    ),
    prerequisites: new BaseJob('prerequisites')
      .addStep({
        name: 'Build tfgen & provider binaries',
        run: 'make  -f Makefile.github provider',
      })
      .addStep(
        {
          name: 'Upload artifacts',
          uses: 'actions/upload-artifact@v2',
          with: {
            // eslint-disable-next-line no-template-curly-in-string
            name: 'pulumi-${{ env.PROVIDER }}',
            // eslint-disable-next-line no-template-curly-in-string
            path: '${{ github.workspace }}/bin',
          },
        },
      ),
    build_sdk: new MultilangJob('build_sdk', {
      needs: 'prerequisites',
    })
      .addStep({
        name: 'Build SDK',
        // eslint-disable-next-line no-template-curly-in-string
        run: 'make -f Makefile.github build_${{ matrix.language }}',
      })
      .addStep({
        name: 'Check worktree clean',
        run: './ci-scripts/ci/check-worktree-is-clean',
      })
      .addStep({
        name: 'Upload artifacts',
        uses: 'actions/upload-artifact@v2',
        with: {
          // eslint-disable-next-line no-template-curly-in-string
          name: '${{ matrix.language  }}-sdk',
          // eslint-disable-next-line no-template-curly-in-string
          path: '${{ github.workspace}}/sdk/${{ matrix.language }}',
        },
      }),
    test: new MultilangJob('test', {
      needs: 'build_sdk',
    })
      .addStep({
        name: 'Download SDK',
        uses: 'actions/download-artifact@v2',
        with: {
          // eslint-disable-next-line no-template-curly-in-string
          name: '${{ matrix.language  }}-sdk',
          // eslint-disable-next-line no-template-curly-in-string
          path: '${{ github.workspace}}/sdk/${{ matrix.language }}',
        },
      })
      .addStep({
        name: 'Check worktree clean',
        uses: 'jaxxstorm/action-git-worktree-clean@release/v1-alpha',
      })
      .addStep({
        name: 'Update path',
        // eslint-disable-next-line no-template-curly-in-string
        run: 'echo ::add-path::${{ github.workspace }}/bin',
      })
      .addStep({
        name: 'Install pipenv',
        uses: 'dschep/install-pipenv-action@v1',
      })
      .addStep({
        name: 'Install dependencies',
        // eslint-disable-next-line no-template-curly-in-string
        run: 'make -f Makefile.github install_${{ matrix.language}}_sdk',
      })
      .addStep({
        name: 'Run tests',
        // eslint-disable-next-line no-template-curly-in-string
        run: 'cd examples && go test -v -count=1 -cover -timeout 2h -tags=${{ matrix.language }} -parallel 4 .',
        env: {
          // eslint-disable-next-line no-template-curly-in-string
          PULUMI_ACCESS_TOKEN: '${{ secrets.PULUMI_ACCESS_TOKEN }}',
          PULUMI_API: 'https://api.pulumi-staging.io',
          RANCHER_ACCESS_KEY: 'token-74zzn',
          // eslint-disable-next-line no-template-curly-in-string
          RANCHER_SECRET_KEY: '${{ secrets.RANCHER_SECRET_KEY }}',
          RANCHER_INSECURE: 'true',
          // eslint-disable-next-line no-template-curly-in-string
          RANCHER_URL: '${{ secrets.RANCHER_URL }}',
          // eslint-disable-next-line no-template-curly-in-string
          PULUMI_LOCAL_NUGET: '${{ github.workspace }}/nuget',
        },
      }),
  }

  constructor(name, env, on, params?: Partial<GithubWorkflow>) {
    Object.assign(this, { name }, { env }, on, params);
  }
}

export class GithubReleaseWorkFlow extends GithubWorkflow {
  on = {
    push: { tags: ['v*.*.*-**'] },
  }
  jobs = Object.assign(this.jobs, {
    publish: {
      'runs-on': 'ubuntu-latest',
      needs: 'test',
      steps: [
        {
          name: 'Checkout',
          uses: 'actions/checkout@v2',
        },
        {
          name: 'Configure AWS Credentials',
          uses: 'aws-actions/configure-aws-credentials@v1',
          with: {
            // eslint-disable-next-line no-template-curly-in-string
            'aws-access-key-id': '${{ secrets.AWS_ACCESS_KEY_ID }}',
            // eslint-disable-next-line no-template-curly-in-string
            'aws-secret-access-key': '${{ secrets.AWS_SECRET_ACCESS_KEY }}',
            'aws-region': 'us-east-2',
            // eslint-disable-next-line no-template-curly-in-string
            'role-to-assume': '${{ secrets.AWS_UPLOAD_ROLE_ARN }}',
            'role-external-id': 'upload-pulumi-release',
            'role-duration-seconds': 3600,
            // eslint-disable-next-line no-template-curly-in-string
            'role-session-name': '${{ env.PROVIDER}}@githubActions',
          },
        },
        {
          name: 'Setup Go',
          uses: 'actions/setup-go@v2',
          with: {
            'go-version': '1.13.x',
          },
        },
        {
          name: 'Run GoReleaser',
          uses: 'goreleaser/goreleaser-action@v2',
          with: {
            version: 'latest',
            args: 'release --rm-dist',
          },
          env: {
            // eslint-disable-next-line no-template-curly-in-string
            GITHUB_TOKEN: '${{ secrets.GITHUB_TOKEN }}',
          },
        },
      ],
    },
  })
}

export class GithubPrereleaseWorkflow extends GithubWorkflow {
  on = {
    push: { tags: ['v*.*.*-**'] },
  }
  jobs = Object.assign(this.jobs, {
    publish: {
      'runs-on': 'ubuntu-latest',
      needs: 'test',
      steps: [
        {
          name: 'Checkout',
          uses: 'actions/checkout@v2',
        },
        {
          name: 'Configure AWS Credentials',
          uses: 'aws-actions/configure-aws-credentials@v1',
          with: {
            // eslint-disable-next-line no-template-curly-in-string
            'aws-access-key-id': '${{ secrets.AWS_ACCESS_KEY_ID }}',
            // eslint-disable-next-line no-template-curly-in-string
            'aws-secret-access-key': '${{ secrets.AWS_SECRET_ACCESS_KEY }}',
            'aws-region': 'us-east-2',
            // eslint-disable-next-line no-template-curly-in-string
            'role-to-assume': '${{ secrets.AWS_UPLOAD_ROLE_ARN }}',
            'role-external-id': 'upload-pulumi-release',
            'role-duration-seconds': 3600,
            // eslint-disable-next-line no-template-curly-in-string
            'role-session-name': '${{ env.PROVIDER}}@githubActions',
          },
        },
        {
          name: 'Setup Go',
          uses: 'actions/setup-go@v2',
          with: {
            'go-version': '1.13.x',
          },
        },
        {
          name: 'Run GoReleaser',
          uses: 'goreleaser/goreleaser-action@v2',
          with: {
            version: 'latest',
            args: 'release --rm-dist --config=.goreleaser.prelease.yml',
          },
          env: {
            // eslint-disable-next-line no-template-curly-in-string
            GITHUB_TOKEN: '${{ secrets.GITHUB_TOKEN }}',
          },
        },
      ],
    },
  })
}
