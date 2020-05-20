export class On {
    constructor(params) {
        this.pull_request = {
            branches: ["master"]
        };
        Object.assign(this, params);
    }
}
export class Env {
    constructor(PROVIDER, params) {
        this.GO111MODULE = "on";
        this.GITHUB_TOKEN = "${{ secrets.GITHUB_TOKEN }}";
        Object.assign(this, { PROVIDER }, params);
    }
}
export class Legend {
    constructor(params) {
        this.show = true;
        this.values = false;
        this.min = false;
        this.max = false;
        this.current = false;
        this.total = false;
        this.avg = false;
        this.alignAsTable = false;
        this.rightSide = false;
        this.hideEmpty = undefined;
        this.hideZero = undefined;
        this.sort = undefined;
        this.sortDesc = undefined;
        Object.assign(this, params);
    }
}
/*
class Jobs {
  lint = new Lint();
}

class Lint {
  "runs-on" = true;
  container = "golangci/golangci-lint:v1.25.1";
  steps: any[] = [];
  constructor(params?: Partial<Lint>) {
    Object.assign(this, params);
  }
}
*/
// A base job, all of these have the same required steps
class BaseJob {
    constructor(name, params) {
        this.steps = [
            {
                name: "Checkout Repo",
                uses: "actions/checkout@v2"
            },
            {
                name: "Unshallow clone for tags",
                runs: "git fetch --prune --unshallow"
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
}
export class Job extends BaseJob {
}
export class GithubWorkflow {
    constructor(name, params) {
        this.on = new On();
        this.env = new Env("rancher2");
        this.jobs = {
            lint: new Job("lint"),
            prerequisites: new Job("prerequisites"),
            build_sdk: new Job("build_sdk", {
                needs: "prerequisites",
            }),
            test: new Job("test", {
                needs: "build_sdk",
            }),
        };
        Object.assign(this, { name }, params);
    }
}
