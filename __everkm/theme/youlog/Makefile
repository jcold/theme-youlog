

fe-install:
	cd . && pnpm i

fe-build:
	cd . && NODE_ENV=production pnpm run build
	ls -Rlh ../../dist

fe-dev:
	cd . && pnpm run dev

analyze:
	# Ref: <https://www.npmjs.com/package/esbuild-visualizer>
	esbuild-visualizer --metadata bundle-analysis.json --filename bundle-stats.html
	open bundle-stats.html
