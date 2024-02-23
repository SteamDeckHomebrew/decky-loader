import {
  DialogButton,
  Focusable,
  showModal,
} from "decky-frontend-lib";
import { FC, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import LogViewModal from "./LogViewModal";

const LogList: FC<{ plugin: string }> = ({ plugin }) => {
  const [logList, setLogList] = useState([]);
  const { t } = useTranslation();

  useEffect(() => {
    window.DeckyPluginLoader.callServerMethod("get_plugin_logs", {
      plugin_name: plugin,
    }).then((log_list) => {
      setLogList(log_list.result || []);
    });
  }, []);

  return (
    <Focusable>
      {logList.map((log_file) => (
        <DialogButton
          style={{ marginBottom: "0.5rem" }}
          onOKActionDescription={t("LogViewer.viewLog")}
          onOKButton={() =>
            showModal(
              <LogViewModal name={log_file} plugin={plugin}></LogViewModal>,
            )
          }
          onClick={() =>
            showModal(
              <LogViewModal name={log_file} plugin={plugin}></LogViewModal>,
            )
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div>{log_file}</div>
          </div>
        </DialogButton>
      ))}
    </Focusable>
  );
};

export default LogList;
