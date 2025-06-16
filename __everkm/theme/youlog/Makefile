# 需要与 build.js 中的输出目录一致
DIST_DIR=../../dist

fe-install:
	cd . && pnpm i

fe-build:
	cd . && NODE_ENV=production pnpm run build
	ls -Rlh $(DIST_DIR)

fe-clean:
	rm -rf $(DIST_DIR)

fe-dev:
	cd . && pnpm run dev

bundle-theme:
	@if [ -d "$(DIST_DIR)" ]; then \
		rm -rf $(DIST_DIR); \
	fi
	@if [ -d ".dist" ]; then \
		rm -rf .dist; \
	fi

	# 构建
	$(MAKE) fe-build
	cp -r templates $(DIST_DIR)
	cp assets-manifest.json $(DIST_DIR)
	cp everkm-theme.yaml $(DIST_DIR)
	
	# 将 everkm_version 写入 everkm-theme.yaml
	# 如果 EVERKM_VERSION 为空或未定义，则使用 0.0.0
	@if [ -z "$${EVERKM_VERSION}" ]; then \
		VERSION=0.0.0; \
	else \
		VERSION=$${EVERKM_VERSION}; \
	fi; \
	if [ "$$(uname)" = "Darwin" ]; then \
		sed -i '' "s/version: .*/version: $${VERSION}/" $(DIST_DIR)/everkm-theme.yaml; \
	else \
		sed -i "s/version: .*/version: $${VERSION}/" $(DIST_DIR)/everkm-theme.yaml; \
	fi
	
	# 打包
	mkdir .dist
	mv $(DIST_DIR) .dist/youlog
	cd .dist && zip -r ../youlog.zip youlog
	rm -rf .dist


analyze:
	# Ref: <https://www.npmjs.com/package/esbuild-visualizer>
	esbuild-visualizer --metadata bundle-analysis.json --filename bundle-stats.html
	open bundle-stats.html

INSTALL_DIR=/Users/dayu/Coder/everkm/tehaochi.cn/packages/thc-www/__everkm/theme/youlog
debug-install:
	rsync -av --delete ../../dist/assets/ $(INSTALL_DIR)/assets/
	rsync -av --delete templates/ $(INSTALL_DIR)/templates/
	cp assets-manifest.json $(INSTALL_DIR)