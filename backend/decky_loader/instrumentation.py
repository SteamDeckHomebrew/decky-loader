from logging import getLogger
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from .main import PluginManager
from .injector import Tab

logger = getLogger("Instrumentation")


class Instrumentation:
    def __init__(self, context: PluginManager):
        self.ctx: PluginManager = context
        self.tab: Tab | None = None

        self.ctx.ws.add_route("instrumentation/resolve_scope", self.get_module_scope)

    def set_tab(self, tab: Tab):
        self.tab = tab

    async def get_module_scope(self, object_key: int):
        assert self.tab is not None
        await self.tab.get_module_scope(object_key)