

fe-install:
	cd . && pnpm i

fe-build:
	cd . && NODE_ENV=production pnpm run build
	ls -Rlh ../../dist

fe-clean:
	rm -rf ../../dist

fe-dev:
	cd . && pnpm run dev

analyze:
	# Ref: <https://www.npmjs.com/package/esbuild-visualizer>
	esbuild-visualizer --metadata bundle-analysis.json --filename bundle-stats.html
	open bundle-stats.html

INSTALL_DIR=/Users/dayu/Coder/everkm/tehaochi.cn/packages/thc-www/__everkm/theme/youlog
debug-install:
	rsync -av --delete ../../dist/assets/ $(INSTALL_DIR)/assets/
	rsync -av --delete templates/ $(INSTALL_DIR)/templates/
	cp assets-manifest.json $(INSTALL_DIR)