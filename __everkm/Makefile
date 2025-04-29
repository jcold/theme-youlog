.PHONY: tag
tag:
	@if [ "$(TAG)" != "" ]; then \
		git tag -f $(TAG); \
		git push -f github $(TAG); \
	fi


ifneq (, $(shell echo $$DEBUG))
  EKMP = /Users/dayu/Coder/everkm/everkm2/be/everkm-publish/target/debug/everkm-publish
else
  EKMP = ./node_modules/.bin/everkm-publish
endif


print-ekmp:
	@echo $(EKMP)
	@$(EKMP) --version
	

work: print-ekmp
	@RUST_BACKTRACE=0 EVERKM_LOG=everkm_publish=debug,tpls=debug,info \
		$(EKMP) serve \
		--work-dir ../ \
		--theme youlog \
		--listen=0.0.0.0:9081

export-all: print-ekmp
	@EVERKM_LOG=info,everkm_publish=info \
		$(EKMP) serve \
		--work-dir ../ \
		--theme youlog \
		--export

# package-theme: print-ekmp
# 	@RUST_BACKTRACE=0 \
# 		EVERKM_LOG=info \
# 		$(EKMP) theme pack \
# 		--dev-dir ./ 


dist: 
	cd theme/youlog && $(MAKE) fe-build
	$(MAKE) export-all

dist-theme:
	@rm -rf dist youlog
	cd theme/youlog && $(MAKE) fe-build
	cp -r theme/youlog/templates dist/
	cp theme/youlog/assets-manifest.json dist/
	cp theme/youlog/everkm-theme.yaml dist/
	# 将 everkm_version 写入 everkm-theme.yaml
	# 如果 EVERKM_VERSION 为空或未定义，则使用 0.0.0
	@if [ -z "$${EVERKM_VERSION}" ]; then \
		VERSION=0.0.0; \
	else \
		VERSION=$${EVERKM_VERSION}; \
	fi; \
	if [ "$$(uname)" = "Darwin" ]; then \
		sed -i '' "s/version: .*/version: $${VERSION}/" dist/everkm-theme.yaml; \
	else \
		sed -i "s/version: .*/version: $${VERSION}/" dist/everkm-theme.yaml; \
	fi
	mv dist youlog && zip -r youlog.zip youlog


preview:
	@$(EKMP) web \
		--work-dir dist

pnpm-install:
	pnpm install

