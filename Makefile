.PHONY: dist clean gen test

all: dist

ifndef PROVIDER
$(error PROVIDER is not set)
endif

dist:
	npx tsc
	cp README.md LICENSE package.json @jaxxstorm/pulumi-action-config

config:
	rm pull-request.yml release.yml
	jk generate workflow.js -p provider=$(PROVIDER)

clean:
	rm -rf @jaxxstorm
	
