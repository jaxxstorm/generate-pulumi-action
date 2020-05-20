export class On {
  pull_request = {
    branches: ["master"]
  };
  constructor(params?: Partial<On>) {
    Object.assign(this, params)
  }
}

export class Env {
  PROVIDER: string;
  GO111MODULE = "on";
  GITHUB_TOKEN = "${{ secrets.GITHUB_TOKEN }}";
  constructor(PROVIDER, params?: Partial<Env>) {
    Object.assign(this, {PROVIDER}, params);
  }
}

export class Legend {
  show = true;
  values = false;
  min = false;
  max = false;
  current = false;
  total = false;
  avg = false;
  alignAsTable = false;
  rightSide = false;
  hideEmpty = undefined;
  hideZero = undefined;
  sort = undefined;
  sortDesc = undefined;

  constructor(params?: Partial<Legend>) {
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
  name: string;
  needs?: string;
  steps: any[] = [
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
        "go-version": "1.13.x", // FIXME make this configurable
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
  constructor(name, params?: Partial<BaseJob>) {
    Object.assign(this, { name }, params);
  }
}

export class Job extends BaseJob {
}

export class GithubWorkflow {
  name: string;
  on = new On();
  env = new Env("rancher2");
  jobs = {
    lint: new Job("lint"),
    prerequisites: new Job("prerequisites"),
    build_sdk: new Job("build_sdk", {
      needs: "prerequisites",
    }),
    test: new Job("test", {
      needs: "build_sdk",
    }),
  }

  constructor(name, params?: Partial<GithubWorkflow>) {
    Object.assign(this, { name }, params);
  }
}
