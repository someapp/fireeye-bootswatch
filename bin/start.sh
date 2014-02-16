#!/bin/sh

# Run the server in debug mode restarting anytime a relevant change has been made.

. /opt/web/apps/uac/bin/env.sh

# Set the development mode configuration.
export NODE_ENV=prod
export NODE_PATH=lib

# The node executable.
NODE=node

# The server.
SERVER=uac-server.js

echo "Starting server $SERVER..."
$NODE $SERVER
