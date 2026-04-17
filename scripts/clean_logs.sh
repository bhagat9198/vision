#!/bin/bash

# ==============================================================================
# LOG CLEANUP CONFIGURATION
# Set these flags to 1 to enable, 0 to disable.
#
# Paths updated December 2025 for the folder rename:
#   api-node-backend       → photography/node-backend-photography
#   img-analyse-backend    → faceIQ/node-backend-faceIQ
#   python-sidecar         → common/vision-core
#   (new)                  → visionIQ/node-backend-visionIQ
# ==============================================================================

ENABLE_ALL=1              # If 1, clears ALL logs below (overrides individual settings)

CLEAN_PHOTOGRAPHY=1       # photography/node-backend-photography logs
CLEAN_FACEIQ=1            # faceIQ/node-backend-faceIQ logs
CLEAN_VISION_CORE=1       # common/vision-core logs
CLEAN_VISIONIQ=1          # visionIQ/node-backend-visionIQ logs
DELETE_DEBUG_IMAGES=1     # Delete debug_viz_*.jpg and failed_*.jpg from log dirs

# ==============================================================================
# SCRIPT LOGIC (Do not edit below this line)
# ==============================================================================

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

PHOTOGRAPHY_LOG_DIR="$PROJECT_ROOT/photography/node-backend-photography/logs"
FACEIQ_LOG_DIR="$PROJECT_ROOT/faceIQ/node-backend-faceIQ/logs"
VISION_CORE_LOG_DIR="$PROJECT_ROOT/common/vision-core/logs"
VISIONIQ_LOG_DIR="$PROJECT_ROOT/visionIQ/node-backend-visionIQ/logs"

echo "========================================"
echo "      🧹 LOG CLEANUP STARTED 🧹      "
echo "========================================"

# Apply ENABLE_ALL override
if [ "$ENABLE_ALL" -eq 1 ]; then
    CLEAN_PHOTOGRAPHY=1
    CLEAN_FACEIQ=1
    CLEAN_VISION_CORE=1
    CLEAN_VISIONIQ=1
    DELETE_DEBUG_IMAGES=1
fi

# Function to truncate all *.log files in a directory
clear_logs_in_dir() {
    local dir=$1
    local name=$2

    if [ -d "$dir" ]; then
        echo "Processing $name logs in: $dir"
        local found=0
        while IFS= read -r file; do
            truncate -s 0 "$file"
            echo "  -> Emptied: $(basename "$file")"
            found=1
        done < <(find "$dir" -name "*.log" -type f)

        if [ "$found" -eq 0 ]; then
            echo "  -> No .log files to clear."
        fi
    else
        echo "⚠️  Directory not found: $dir"
    fi
}

# Function to delete debug/failed image dumps from a log directory
delete_debug_images_in_dir() {
    local dir=$1
    local name=$2

    [ -d "$dir" ] || return 0

    local debug_count
    debug_count=$(find "$dir" -maxdepth 1 -name "debug_viz_*.jpg" | wc -l | tr -d ' ')
    if [ "$debug_count" -gt 0 ]; then
        find "$dir" -maxdepth 1 -name "debug_viz_*.jpg" -delete
        echo "  -> Deleted $debug_count debug_viz_*.jpg from $name 🖼️"
    fi

    local failed_count
    failed_count=$(find "$dir" -maxdepth 1 -name "failed_*.jpg" | wc -l | tr -d ' ')
    if [ "$failed_count" -gt 0 ]; then
        find "$dir" -maxdepth 1 -name "failed_*.jpg" -delete
        echo "  -> Deleted $failed_count failed_*.jpg from $name 🖼️"
    fi
}

# 1. photography/node-backend-photography
if [ "$CLEAN_PHOTOGRAPHY" -eq 1 ]; then
    clear_logs_in_dir "$PHOTOGRAPHY_LOG_DIR" "node-backend-photography"
    if [ "$DELETE_DEBUG_IMAGES" -eq 1 ]; then
        delete_debug_images_in_dir "$PHOTOGRAPHY_LOG_DIR" "node-backend-photography"
    fi
fi

# 2. faceIQ/node-backend-faceIQ
if [ "$CLEAN_FACEIQ" -eq 1 ]; then
    clear_logs_in_dir "$FACEIQ_LOG_DIR" "node-backend-faceIQ"
    if [ "$DELETE_DEBUG_IMAGES" -eq 1 ]; then
        delete_debug_images_in_dir "$FACEIQ_LOG_DIR" "node-backend-faceIQ"
    fi
fi

# 3. common/vision-core
if [ "$CLEAN_VISION_CORE" -eq 1 ]; then
    clear_logs_in_dir "$VISION_CORE_LOG_DIR" "vision-core (Python sidecar)"
    if [ "$DELETE_DEBUG_IMAGES" -eq 1 ]; then
        delete_debug_images_in_dir "$VISION_CORE_LOG_DIR" "vision-core"
    fi
fi

# 4. visionIQ/node-backend-visionIQ
if [ "$CLEAN_VISIONIQ" -eq 1 ]; then
    clear_logs_in_dir "$VISIONIQ_LOG_DIR" "node-backend-visionIQ"
fi

echo "========================================"
echo "          ✅ CLEANUP COMPLETE           "
echo "========================================"
