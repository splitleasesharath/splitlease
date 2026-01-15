"""
Port Checker Utility

Checks if specified ports are responding on localhost.
"""
import socket

def is_port_responding(port):
    """Check if a port is responding on localhost.

    Args:
        port: Port number to check

    Returns:
        bool: True if port is responding, False otherwise
    """
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(2)
        try:
            s.connect(("localhost", port))
            return True
        except (ConnectionRefusedError, socket.timeout, OSError):
            return False

print(f"Port 8010: {is_port_responding(8010)}")
print(f"Port 8000: {is_port_responding(8000)}")
