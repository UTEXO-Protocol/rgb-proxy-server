# Variables.
ENVIRONMENT             ?=
IMAGE_TAG               ?= latest
VERSION                 ?=
REGISTRY_HOST           ?= ghcr.io/utexo-protocol
CURRENT_DATE_TIME       := $(shell date +'%Y-%m-%d')
LATEST_COMMIT           := $$(git rev-parse --short HEAD)

# Dockerfile.
RGB_PROXY_DOCKERFILE    := ./Dockerfile

# Image names.
RGB_PROXY_IMAGE         := rgb-proxy-server

# Variables for build.
ifdef VERSION
IMAGE_RGB_PROXY_BACKUP  = $(REGISTRY_HOST)/$(RGB_PROXY_IMAGE)$(ENVIRONMENT):$(VERSION)
else
IMAGE_RGB_PROXY_BACKUP  = $(REGISTRY_HOST)/$(RGB_PROXY_IMAGE)$(ENVIRONMENT):$(CURRENT_DATE_TIME)-$(LATEST_COMMIT)
endif
IMAGE_RGB_PROXY_LATEST  = $(REGISTRY_HOST)/$(RGB_PROXY_IMAGE)$(ENVIRONMENT):$(IMAGE_TAG)
