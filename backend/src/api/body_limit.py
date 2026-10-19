"""Bound extraction request bodies before Starlette's multipart parser runs."""

from starlette.responses import JSONResponse


class ExtractionBodyLimitMiddleware:
    def __init__(self, app, max_bytes=10 * 1024 * 1024 + 64 * 1024):
        self.app = app
        self.max_bytes = max_bytes

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or scope.get("path", "").rstrip("/") != "/extract":
            return await self.app(scope, receive, send)
        chunks = []
        total = 0
        while True:
            message = await receive()
            if message["type"] == "http.disconnect":
                return
            total += len(message.get("body", b""))
            if total > self.max_bytes:
                response = JSONResponse(
                    {"detail": "Upload body exceeds the 10 MB file limit"},
                    status_code=413,
                )
                return await response(scope, receive, send)
            chunks.append(message)
            if not message.get("more_body", False):
                break
        index = 0

        async def bounded_receive():
            nonlocal index
            if index < len(chunks):
                message = chunks[index]
                index += 1
                return message
            return await receive()

        await self.app(scope, bounded_receive, send)
