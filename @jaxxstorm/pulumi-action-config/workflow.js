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
;
// A base job, all of these have the same required steps
class BaseJob {
    constructor(name, params) {
        this["runs-on"] = "ubuntu-latest";
        this.steps = [
            {
                name: "Checkout Repo",
                uses: "actions/checkout@v2"
            },
            {
                name: "Unshallow clone for tags",
                run: "git fetch --prune --unshallow"
            },
            {
                name: "Install Go",
                uses: "actions/setup-go@v2",
                with: {
                    "go-version": "1.13.x",
                }
            },
            {
                name: "Install tf2pulumi",
                uses: "jaxxstorm/action-install-gh-release@release/v1-alpha",
                with: {
                    repo: "pulumi/tf2pulumi",
                }
            },
            {
                name: "Install pulumictl",
                uses: "jaxxstorm/action-install-gh-release@release/v1-alpha",
                with: {
                    repo: "pulumi/pulumictl",
                }
            }
        ];
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
    constructor() {
        super(...arguments);
        this.strategy = {
            "fail-fast": true,
            matrix: {
                language: ["nodejs", "python", "dotnet"]
            }
        };
        this.steps = this.steps.concat([
            {
                name: "Setup Node",
                uses: "actions/setup-node@v1",
                with: {
                    "node-version": '13.x',
                    "registry-url": "https://registry.npmjs.org"
                }
            },
            {
                name: "Setup DotNet",
                uses: "actions/setup-dotnet@v1",
                with: {
                    "dotnet-version": '3.1.201',
                }
            },
            {
                name: "Setup Python",
                uses: "actions/setup-python@v1",
                with: {
                    "python-version": "3.x",
                }
            },
            {
                name: "Download provider + tfgen binaries",
                uses: "actions/download-artifact@v2",
                with: {
                    name: "pulumi-${{ env.PROVIDER }}",
                    path: "${{ github.workspace }}/bin",
                }
            },
            {
                name: "Restore binary perms",
                run: "find ${{ github.workspace }} -name 'pulumi-*-${{ env.PROVIDER }}' -print -exec chmod +x {} \\;"
            }
        ]);
    }
}
export class GithubWorkflow {
    constructor(name, env, on, params) {
        this.on = {
            pull_request: { branches: ["master"] }
        };
        // env = new Env(this.provider);
        this.jobs = {
            lint: new BaseJob("lint", { container: "golangci/golangci-lint:v1.25.1" }).addStep({
                name: "Run golangci",
                run: "make lint_provider",
            }),
            prerequisites: new BaseJob("prerequisites")
                .addStep({
                name: "Build tfgen & provider binaries",
                run: "make provider",
            })
                .addStep({
                name: "Upload artifacts",
                uses: "actions/upload-artifact@v2",
                with: {
                    name: "pulumi-${{ env.PROVIDER }}",
                    path: "${{ github.workspace }}/bin"
                }
            }),
            build_sdk: new MultilangJob("build_sdk", {
                needs: "prerequisites",
            })
                .addStep({
                name: "Build SDK",
                run: "make build_${{ matrix.language }}"
            })
                .addStep({
                name: "Upload artifacts",
                uses: "actions/upload-artifact@v2",
                with: {
                    name: "${{ matrix.language  }}-sdk",
                    path: "${{ github.workspace}}/sdk/${{ matrix.language }}"
                }
            }),
            test: new MultilangJob("test", {
                needs: "build_sdk",
            })
                .addStep({
                name: "Download SDK",
                uses: "actions/download-artifact@v2",
                with: {
                    name: "${{ matrix.language  }}-sdk",
                    path: "${{ github.workspace}}/sdk/${{ matrix.language }}",
                }
            })
                .addStep({
                name: "Update path",
                run: "echo ::add-path::${{ github.workspace }}/bin",
            })
                .addStep({
                name: "Install Pulumi CLI",
                uses: "pulumi/action-install-pulumi-cli@releases/v1"
            })
                .addStep({
                name: "Install pipenv",
                uses: "dschep/install-pipenv-action@v1",
            })
                .addStep({
                name: "Install dependencies",
                run: "./scripts/install-${{ matrix.language}}-sdk"
            })
                .addStep({
                name: "Run tests",
                run: "cd examples && go test -v -count=1 -cover -timeout 2h -tags=${{ matrix.langage }} -parallel 4 .",
                env: {
                    PULUMI_ACCESS_TOKEN: "${{ secrets.PULUMI_ACCESS_TOKEN }}",
                    PULUMI_API: "https://api.pulumi-staging.io",
                    RANCHER_ACCESS_KEY: "token-74zzn",
                    RANCHER_SECRET_KEY: "${{ secrets.RANCHER_SECRET_KEY }}",
                    RANCHER_INSECURE: "true",
                    RANCHER_URL: "${{ secrets.RANCHER_URL }}",
                    PULUMI_LOCAL_NUGET: "${{ github.workspace }}/nuget",
                }
            }),
        };
        Object.assign(this, { name }, { env }, on, params);
    }
}
export class GithubReleaseWorkFlow extends GithubWorkflow {
    constructor() {
        super(...arguments);
        this.jobs = Object.assign(this.jobs, {
            publish: {
                "runs-on": "ubuntu-latest",
                needs: "test",
                on: {
                    push: { tags: ["v*.[0-99]"] }
                },
                steps: [
                    {
                        name: "Checkout",
                        uses: "actions/checkout@v2",
                    },
                    {
                        name: "Configure AWS Credentials",
                        uses: "aws-actions/configure-aws-credentials@v1",
                        with: {
                            "aws-access-key-id": "${{ secrets.AWS_ACCESS_KEY_ID }}",
                            "aws-secret-access-key": "${{ secrets.AWS_SECRET_ACCESS_KEY }}",
                            "aws-region": "us-east-2",
                            "role-to-assume": "${{ secrets.AWS_UPLOAD_ROLE_ARN }}",
                            "role-external-id": "upload-pulumi-release",
                            "role-duration-seconds": 3600,
                            "role-session-name": "${{ env.PROVIDER}}@githubActions",
                        }
                    },
                    {
                        name: "Setup Go",
                        uses: "actions/setup-go@v2",
                        with: {
                            "go-version": "1.13.x"
                        }
                    },
                    {
                        name: "Run GoRelease",
                        uses: "goreleaser/goreleaser-action@v2",
                        with: {
                            version: "latest",
                            args: "release --rm-dist"
                        },
                        env: {
                            "GITHUB_TOKEN": "${{ secrets.GITHUB_TOKEN }}",
                        }
                    }
                ]
            }
        });
    }
}
