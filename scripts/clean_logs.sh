#!/bin/bash

# ==============================================================================
# LOG CLEANUP CONFIGURATION
# Set these flags to 1 to enable, 0 to disable
# ==============================================================================

ENABLE_ALL=1          # If 1, clears ALL logs below (overrides individual settings)

CLEAN_IMG_BACKEND=1   # Set to 1 to clear img-analyse-backend logs
CLEAN_PYTHON_SIDECAR=1 # Set to 1 to clear python-sidecar logs
CLEAN_API_BACKEND=1   # Set to 1 to clear api-node-backend logs
DELETE_DEBUG_IMAGES=1 # Set to 1 to delete debug_viz_*.jpg images

# ==============================================================================
# SCRIPT LOGIC (Do not edit below this line)
# ==============================================================================

# Determine paths
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMG_LOG_DIR="$PROJECT_ROOT/img-analyse-backend/logs"
PYTHON_LOG_DIR="$PROJECT_ROOT/python-sidecar/logs"
API_LOG_DIR="$PROJECT_ROOT/api-node-backend/logs"

echo "========================================"
echo "      🧹 LOG CLEANUP STARTED 🧹      "
echo "========================================"

# Apply ENABLE_ALL override
if [ "$ENABLE_ALL" -eq 1 ]; then
    CLEAN_IMG_BACKEND=1
    CLEAN_PYTHON_SIDECAR=1
    CLEAN_API_BACKEND=1
    DELETE_DEBUG_IMAGES=1
fi

# Function to clear logs
clear_logs_in_dir() {
    local dir=$1
    local name=$2

    if [ -d "$dir" ]; then
        echo "Processing $name logs in: $dir"
        find "$dir" -name "*.log" -type f | while read -r file; do
            truncate -s 0 "$file"
            echo "  -> Emptied: $(basename "$file")"
        done
    else
        echo "⚠️  Directory not found: $dir"
    fi
}

# 1. Clean Img Analyse Backend
if [ "$CLEAN_IMG_BACKEND" -eq 1 ]; then
    clear_logs_in_dir "$IMG_LOG_DIR" "Image Analyse Backend"
    
    if [ "$DELETE_DEBUG_IMAGES" -eq 1 ] && [ -d "$IMG_LOG_DIR" ]; then
        count=$(find "$IMG_LOG_DIR" -maxdepth 1 -name "debug_viz_*.jpg" | wc -l)
        if [ "$count" -gt 0 ]; then
             find "$IMG_LOG_DIR" -maxdepth 1 -name "debug_viz_*.jpg" -delete
             echo "  -> Deleted $count debug visualization images 🖼️"
        fi
    fi
fi

# 2. Clean Python Sidecar
if [ "$CLEAN_PYTHON_SIDECAR" -eq 1 ]; then
    clear_logs_in_dir "$PYTHON_LOG_DIR" "Python Sidecar"
fi

# 3. Clean API Node Backend
if [ "$CLEAN_API_BACKEND" -eq 1 ]; then
    clear_logs_in_dir "$API_LOG_DIR" "API Node Backend"
fi

echo "========================================"
echo "          ✅ CLEANUP COMPLETE           "
echo "========================================"
