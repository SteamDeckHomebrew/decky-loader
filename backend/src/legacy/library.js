class PluginEventTarget extends EventTarget { }
method_call_ev_target = new PluginEventTarget();

window.addEventListener("message", function(evt) {
    let ev = new Event(evt.data.call_id);
    ev.data = evt.data.result;
    method_call_ev_target.dispatchEvent(ev);
}, false);

async function call_server_method(method_name, arg_object={}) {
    const token = await fetch("http://127.0.0.1:1337/auth/token").then(r => r.text());
    const response = await fetch(`http://127.0.0.1:1337/methods/${method_name}`, {
      method: 'POST',
      credentials: "include",
      headers: {
        'Content-Type': 'application/json',
        Authentication: token
      },
      body: JSON.stringify(arg_object),
    });

    const dta = await response.json();
    if (!dta.success) throw dta.result;
    return dta.result;
}

// Source: https://stackoverflow.com/a/2117523 Thanks!
function uuidv4() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

async function fetch_nocors(url, request={}) {
    let args = { method: "POST", headers: {}, body: "" };
    request = {...args, ...request};
    request.url = url;
    request.data = request.body;
    delete request.body; //maintain api-compatibility with fetch
    return await call_server_method("http_request", request);
}

async function call_plugin_method(method_name, arg_object={}) {
    if (plugin_name == undefined) 
        throw new Error("Plugin methods can only be called from inside plugins (duh)");
    const token = await fetch("http://127.0.0.1:1337/auth/token").then(r => r.text());
    const response = await fetch(`http://127.0.0.1:1337/plugins/${plugin_name}/methods/${method_name}`, {
        method: 'POST',
        credentials: "include",
        headers: {
            'Content-Type': 'application/json',
            Authentication: token
        },
        body: JSON.stringify({
            args: arg_object,
        }),
    });

    const dta = await response.json();
    if (!dta.success) throw dta.result;
    return dta.result;
}

async function execute_in_tab(tab, run_async, code) {
    return await call_server_method("execute_in_tab", {
        'tab': tab,
        'run_async': run_async,
        'code': code
    });
}

async function inject_css_into_tab(tab, style) {
    return await call_server_method("inject_css_into_tab", {
        'tab': tab,
        'style': style
    });
}

async function remove_css_from_tab(tab, css_id) {
    return await call_server_method("remove_css_from_tab", {
        'tab': tab,
        'css_id': css_id
    });
}