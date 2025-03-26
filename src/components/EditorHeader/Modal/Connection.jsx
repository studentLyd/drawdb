import React from "react";
import { Button, Input } from "@douyinfe/semi-ui";
import { IconLink } from "@douyinfe/semi-icons";
import { useTranslation } from "react-i18next";

export default function Connection({tableName, setTableName, tableStructure, setTableStructure }) {
  const { t } = useTranslation();

  const connectToDatabase = async () => {
    try {
      const response = await fetch(`/api/table-structure/${tableName}`);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      setTableStructure(data);
    } catch (error) {
      console.error("Error fetching table structure:", error);
    }
  };

  return (
    <div>
      <div className="flex gap-3">
        <Input
          type="text"
          placeholder={t("input_table_name")}
          value={tableName}
          onChange={(value) => setTableName(value)}
        />
        <Button block theme="solid" icon={<IconLink />} onClick={connectToDatabase}>
          {t("connection")}
        </Button>
      </div>
      {/* 表格显示 */}
      <table style={{ borderCollapse: "collapse", width: "100%", marginTop: "10px" }}>
        <thead>
        <tr>
          <th style={{
            border: "1px solid #ccc",
            padding: "8px",
            textAlign: "left",
            backgroundColor: "#f4f4f4",
          }}>{t("field")}</th>
          <th style={{
            border: "1px solid #ccc",
            padding: "8px",
            textAlign: "left",
            backgroundColor: "#f4f4f4",
          }}>{t("_type")}</th>
          <th style={{
            border: "1px solid #ccc",
            padding: "8px",
            textAlign: "left",
            backgroundColor: "#f4f4f4",
          }}>{t("_null")}</th>
          <th style={{
            border: "1px solid #ccc",
            padding: "8px",
            textAlign: "left",
            backgroundColor: "#f4f4f4",
          }}>{t("key")}</th>
          <th style={{
            border: "1px solid #ccc",
            padding: "8px",
            textAlign: "left",
            backgroundColor: "#f4f4f4",
          }}>{t("default")}</th>
          <th style={{
            border: "1px solid #ccc",
            padding: "8px",
            textAlign: "left",
            backgroundColor: "#f4f4f4",
          }}>{t("extra")}</th>
        </tr>
        </thead>
        <tbody>
        {tableStructure.map((row, index) => (
          <tr key={index}>
            <td style={{ border: "1px solid #ccc", padding: "8px" }}>{row.Field}</td>
            <td style={{ border: "1px solid #ccc", padding: "8px" }}>{row.Type}</td>
            <td style={{ border: "1px solid #ccc", padding: "8px" }}>{row.Null}</td>
            <td style={{ border: "1px solid #ccc", padding: "8px" }}>{row.Key}</td>
            <td style={{ border: "1px solid #ccc", padding: "8px" }}>{row.Default}</td>
            <td style={{ border: "1px solid #ccc", padding: "8px" }}>{row.Extra}</td>
          </tr>
        ))}
        </tbody>
      </table>
    </div>
  );
}
