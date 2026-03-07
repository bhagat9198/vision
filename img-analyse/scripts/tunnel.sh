#!/bin/bash

# =============================================================================
# SSH Tunnel Script
# =============================================================================
# Creates SSH tunnels to forward ports from remote server to localhost
# Ports forwarded:
#   - 6333: Qdrant HTTP API
#   - 6334: Qdrant gRPC
#   - 8080: (Application port)
#   - 8000: CompreFace
# =============================================================================

echo "🔐 Establishing SSH tunnels to 72.60.203.28..."
echo "Forwarding ports: 6333, 6334, 8080, 8000"
echo ""
echo "Press Ctrl+C to close tunnels"
echo ""

# Use sshpass if available (for password authentication)
# Otherwise, will prompt for password or use SSH keys
if command -v sshpass &> /dev/null; then
    # Using sshpass (install with: brew install hudochenkov/sshpass/sshpass)
    export SSHPASS='toorRoot@2025'
    sshpass -e ssh -N \
        -L 6333:127.0.0.1:6333 \
        -L 6334:127.0.0.1:6334 \
        -L 8080:127.0.0.1:8080 \
        -L 8000:127.0.0.1:8000 \
        root@72.60.203.28
    unset SSHPASS
else
    # Standard SSH (will prompt for password or use SSH keys)
    ssh -N \
        -L 6333:127.0.0.1:6333 \
        -L 6334:127.0.0.1:6334 \
        -L 8080:127.0.0.1:8080 \
        -L 8000:127.0.0.1:8000 \
        root@72.60.203.28
fi
