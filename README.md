# Pulumi Action Generator

This repo will generate github action workflow files for a Pulumi provider

## Dependencies

You'll need:

- [jkcfg](https://github.com/jkcfg/jk/releases)
- typescript
- Make
- npm

## Building

First, build the module:

```
$ make dist
npx tsc
cp README.md LICENSE package.json @jaxxstorm/pulumi-action-config
```

This will generate the module into `@jaxxstorm/pulumi-action-config`

## Using

Once you have the module built, build a provider!

```
make config PROVIDER=rancher2
```


