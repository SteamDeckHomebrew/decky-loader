class PluginEventTarget extends EventTarget { }
method_call_ev_target = new PluginEventTarget();

function resolveMethodCall(call_id, result) {
    let ev = new Event(call_id);
    ev.data = result;
    method_call_ev_target.dispatchEvent(ev);
}

async function call_server_method(method_name, arg_object={}) {
    let id = Math.random() * (100000 - 1) + 1;
    console.debug(JSON.stringify({
        "id": id,
        "method": method_name,
        "args": arg_object
    }));
    return new Promise((resolve, reject) => {
        method_call_ev_target.addEventListener(`${id}`, function (event) {
            if (event.data.success) resolve(event.data.result);
            else reject(event.data.result);
        });
    });
}