.PHONY: dist clean gen test

all: dist

dist:
	npx tsc
	cp README.md LICENSE package.json @jaxxstorm/generate-pulumi-action

clean:
	rm -rf @jaxxstorm
