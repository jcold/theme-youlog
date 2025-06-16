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
	cd theme/youlog && $(MAKE) bundle-theme


preview:
	@$(EKMP) web \
		--work-dir dist

pnpm-install:
	pnpm install

