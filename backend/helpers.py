import ssl
import certifi

ssl_ctx = ssl.create_default_context(cafile=certifi.where())

def get_ssl_context():
    return ssl_ctx