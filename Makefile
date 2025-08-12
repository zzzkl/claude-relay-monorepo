# Makefile for Claude Relay Monorepo
# 本地发布到 Cloudflare Workers

# 加载 .env 文件（如果存在）
ifneq (,$(wildcard .env))
    include .env
    export
endif

# 环境变量检查
.PHONY: check-env
check-env:
	@if [ -z "$(CLOUDFLARE_API_TOKEN)" ]; then \
		echo "Error: CLOUDFLARE_API_TOKEN is not set"; \
		exit 1; \
	fi
	@if [ -z "$(CLOUDFLARE_ACCOUNT_ID)" ]; then \
		echo "Error: CLOUDFLARE_ACCOUNT_ID is not set"; \
		exit 1; \
	fi
	@if [ -z "$(KV_NAMESPACE_ID)" ]; then \
		echo "Error: KV_NAMESPACE_ID is not set"; \
		exit 1; \
	fi
	@if [ -z "$(ADMIN_USERNAME)" ]; then \
		echo "Error: ADMIN_USERNAME is not set"; \
		exit 1; \
	fi
	@if [ -z "$(ADMIN_PASSWORD)" ]; then \
		echo "Error: ADMIN_PASSWORD is not set"; \
		exit 1; \
	fi

# 安装依赖
.PHONY: install
install:
	npm ci

# 类型检查
.PHONY: type-check
type-check:
	npm run type-check

# 构建前端
.PHONY: build-frontend
build-frontend:
	cd packages/frontend && NUXT_PUBLIC_API_BASE_URL=$(NUXT_PUBLIC_API_BASE_URL) npm run build
	@echo "Frontend built to packages/frontend/dist/"

# 准备部署目录
.PHONY: prepare-deploy
prepare-deploy:
	mkdir -p deploy/assets
	cp -r packages/frontend/dist/* deploy/assets/

# 生成 wrangler.toml
.PHONY: generate-wrangler-config
generate-wrangler-config:
	@echo "生成 wrangler.toml..."
	@echo 'name = "claude-relay-unified"' > deploy/wrangler.toml
	@echo 'main = "../packages/backend/src/index.ts"' >> deploy/wrangler.toml
	@echo 'compatibility_date = "2025-07-25"' >> deploy/wrangler.toml
	@echo '' >> deploy/wrangler.toml
	@echo '# Workers Assets 配置 - 统一服务前后端' >> deploy/wrangler.toml
	@echo '[assets]' >> deploy/wrangler.toml
	@echo 'directory = "./assets"' >> deploy/wrangler.toml
	@echo '# SPA 模式：未找到的路由返回 index.html' >> deploy/wrangler.toml
	@echo 'not_found_handling = "single-page-application"' >> deploy/wrangler.toml
	@echo '# API 路由优先处理' >> deploy/wrangler.toml
	@echo 'run_worker_first = ["/api/*", "/v1/*", "/oauth/*"]' >> deploy/wrangler.toml
	@echo '' >> deploy/wrangler.toml
	@echo '[[kv_namespaces]]' >> deploy/wrangler.toml
	@echo 'binding = "CLAUDE_RELAY_ADMIN_KV"' >> deploy/wrangler.toml
	@echo 'id = "$(KV_NAMESPACE_ID)"' >> deploy/wrangler.toml
	@echo '' >> deploy/wrangler.toml
	@echo '[triggers]' >> deploy/wrangler.toml
	@echo 'crons = ["0 */6 * * *"]' >> deploy/wrangler.toml
	@echo '' >> deploy/wrangler.toml
	@echo '[vars]' >> deploy/wrangler.toml
	@echo 'NODE_ENV = "production"' >> deploy/wrangler.toml
	@echo '' >> deploy/wrangler.toml
	@echo '[observability.logs]' >> deploy/wrangler.toml
	@echo 'enabled = true' >> deploy/wrangler.toml
	@echo "wrangler.toml 已生成"

# 部署到 Cloudflare Workers
.PHONY: deploy-worker
deploy-worker:
	cd deploy && npx wrangler deploy --config wrangler.toml \
		--var ADMIN_USERNAME:"$(ADMIN_USERNAME)" \
		--var ADMIN_PASSWORD:"$(ADMIN_PASSWORD)"

# 清理部署目录
.PHONY: clean
clean:
	rm -rf deploy

# 完整部署流程
.PHONY: deploy
deploy: check-env install type-check build-frontend prepare-deploy generate-wrangler-config deploy-worker
	@echo "✅ 部署完成！"

# 快速部署（跳过类型检查）
.PHONY: deploy-fast
deploy-fast: check-env build-frontend prepare-deploy generate-wrangler-config deploy-worker
	@echo "✅ 快速部署完成！"

# 仅构建
.PHONY: build
build: install type-check build-frontend
	@echo "✅ 构建完成！"

# 帮助信息
.PHONY: help
help:
	@echo "Claude Relay Monorepo - Makefile 命令"
	@echo ""
	@echo "使用方法："
	@echo "  make deploy          # 完整部署流程（包含类型检查）"
	@echo "  make deploy-fast     # 快速部署（跳过类型检查）"
	@echo "  make build          # 仅构建项目"
	@echo "  make clean          # 清理部署目录"
	@echo "  make help           # 显示此帮助信息"
	@echo ""
	@echo "必需的环境变量："
	@echo "  CLOUDFLARE_API_TOKEN   - Cloudflare API Token"
	@echo "  CLOUDFLARE_ACCOUNT_ID  - Cloudflare Account ID"
	@echo "  KV_NAMESPACE_ID        - KV Namespace ID"
	@echo "  ADMIN_USERNAME         - 管理员用户名"
	@echo "  ADMIN_PASSWORD         - 管理员密码"
	@echo ""
	@echo "可选的环境变量："
	@echo "  NUXT_PUBLIC_API_BASE_URL - API 基础 URL（构建前端时使用）"

# 默认目标
.DEFAULT_GOAL := help