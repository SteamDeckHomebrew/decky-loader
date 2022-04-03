from aiohttp import ClientSession

async def http_request(method="", url="", **kwargs):
    async with ClientSession() as web:
        res = await web.request(method, url, **kwargs)
        return {
            "status": res.status,
            "headers": dict(res.headers),
            "body": await res.text()
        }

async def ping(**kwargs):
    return "pong"

util_methods = {
    "ping": ping,
    "http_request": http_request
}