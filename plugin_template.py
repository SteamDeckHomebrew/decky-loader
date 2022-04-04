class Plugin:
    name = "Template Plugin"

    author = "SteamDeckHomebrew"

    main_view_html = "<html><body><h3>Template Plugin</h3></body></html>"

    tile_view_html = ""

    hot_reload = False

    async def __main(self):
        pass

    async def method_1(self, **kwargs):
        pass

    async def method_2(self, **kwargs):
        pass