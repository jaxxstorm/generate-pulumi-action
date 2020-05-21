.PHONY: dist clean gen test

PROVIDER = "false"

all: dist

dist:
	npx tsc
	cp README.md LICENSE package.json @jaxxstorm/pulumi-action-config

config:
ifeq ($(PROVIDER), "false")
	$(error PROVIDER is not set, run `make config PROVIDER=foo`)
endif
	rm -f pull-request.yml release.yml prerelease.yml || true
	jk generate workflow.js -p provider=$(PROVIDER)

clean:
	rm -rf @jaxxstorm

