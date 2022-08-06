from aiohttp.web import middleware, Response
import ssl
import certifi
import uuid

ssl_ctx = ssl.create_default_context(cafile=certifi.where())

csrf_token = str(uuid.uuid4())

def get_ssl_context():
    return ssl_ctx

def get_csrf_token():
    return csrf_token

@middleware
async def csrf_middleware(request, handler):
    if str(request.method) == "OPTIONS" or request.headers.get('Authentication') == csrf_token or str(request.rel_url) == "/auth/token" or str(request.rel_url).startswith("/plugins/load_main/") or str(request.rel_url).startswith("/static/") or str(request.rel_url).startswith("/legacy/") or str(request.rel_url).startswith("/steam_resource/"):
        return await handler(request)
    return Response(text='Forbidden', status='403')