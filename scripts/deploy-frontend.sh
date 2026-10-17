#!/usr/bin/env bash
set -Eeuo pipefail
: "${FRONTEND_BUCKET:?Set FRONTEND_BUCKET in your shell}"
aws s3 sync frontend/ "s3://${FRONTEND_BUCKET}" --delete --only-show-errors
printf 'Uploaded front end to %s\n' "$FRONTEND_BUCKET"
