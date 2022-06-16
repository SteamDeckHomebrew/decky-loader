class PassivePlugin:
    def __init__(self, logger) -> None:
        self.logger
        pass

    def call_method(self, method_name, args):
        self.logger.debug(f"Tried to call method {method_name}, but plugin is in passive mode")
        pass

    def execute_method(self, method_name, method_args):
        self.logger.debug(f"Tried to execute method {method_name}, but plugin is in passive mode")
        pass

    async def start(self):
        pass# Empty stub
