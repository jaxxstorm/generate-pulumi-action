.PHONY: dist clean gen test

all: dist

dist:
	npx tsc
	cp README.md LICENSE package.json @jaxxstorm/pulumi-action-config

clean:
	rm -rf @jaxxstorm
