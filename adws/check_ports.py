
import socket
def is_port_responding(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(2)
        try:
            s.connect(("localhost", port))
            return True
        except:
            return False

print(f"Port 8010: {is_port_responding(8010)}")
print(f"Port 8000: {is_port_responding(8000)}")
