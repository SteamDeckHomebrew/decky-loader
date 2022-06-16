import json
import uuid
from asyncio import Protocol, TimeoutError, get_event_loop, wait_for
from gc import callbacks
from subprocess import call


class PluginProtocolServer(Protocol):
  def __init__(self, backend) -> None:
    super().__init__()
    self.backend = backend
    self.callbacks = {}

  def connection_made(self, transport):
    self.transport = transport

  def data_received(self, data: bytes) -> None:
    message = json.loads(data.decode("utf-8"))
    message_id = str(uuid.UUID(message["id"]))
    message_type = message["type"]
    payload = message["payload"]

    if message_type == "method_response":
      get_event_loop().create_task(self.handle_method_response(message_id, payload["success"], payload["result"]))

  async def handle_method_response(self, message_id, success, result):
    if message_id in self.callbacks:
      self.callbacks[message_id].set_result(dict(success = success, result = result))
      del self.callbacks[message_id]

  async def send_message(self, type, payload):
    id = str(uuid.uuid4())
    callback = get_event_loop().create_future()
    message = json.dumps(dict(id = id, type = type, payload = payload))

    self.callbacks[id] = callback
    self.transport.write(message.encode('utf-8'))

    try:
      return await wait_for(callback, 10)
    except TimeoutError as e:
      del self.callbacks[id]
      raise e

  def call_method(self, method_name, method_args):
    return self.send_message("method_call", dict(name = method_name, args = method_args))
