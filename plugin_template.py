class Plugin:
    name = "Template Plugin"

    author = ""

    main_view_html = "<html><body><h3>Template Plugin</h3></body></html>"

    tile_view_html = ""

    async def __illegal_method(*args):
        pass

    async def method_1(*args):
        pass

    async def method_2(*args):
        pass
