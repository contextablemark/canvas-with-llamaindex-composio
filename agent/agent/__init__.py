import uvicorn
import os
from .server import app

def main():
    # Allow port to be configured via environment variable, default to 9000
    port = int(os.getenv("AGENT_PORT", "9000"))
    uvicorn.run(app, host="127.0.0.1", port=port)

if __name__ == "__main__":
    main()

__all__ = ["app"]
