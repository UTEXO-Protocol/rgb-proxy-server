# Makefile Variables.
include config.mk

# Docker's BuildKit feature.
export DOCKER_BUILDKIT=1

.PHONY: help lint test build_rgb_proxy push_rgb_proxy docker

help: ## Show this help.
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' Makefile | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

lint: ## Run linter.
	npm run lint

test: ## Run tests.
	npm run test

build_rgb_proxy: ## Build rgb-proxy-server docker image.
	docker build -f $(RGB_PROXY_DOCKERFILE) -t $(IMAGE_RGB_PROXY_BACKUP) . && \
	docker build -f $(RGB_PROXY_DOCKERFILE) -t $(IMAGE_RGB_PROXY_LATEST) .

push_rgb_proxy: ## Push rgb-proxy-server docker image.
	docker push $(IMAGE_RGB_PROXY_BACKUP) && \
	docker push $(IMAGE_RGB_PROXY_LATEST)

docker: ## Build and push all docker images.
	make build_rgb_proxy push_rgb_proxy
