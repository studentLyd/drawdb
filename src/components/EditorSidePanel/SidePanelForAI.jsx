import { Button, TextArea, Toast } from "@douyinfe/semi-ui";
import { useTranslation } from "react-i18next";
import { useDiagram, useLayout, useTransform } from "../../hooks/index.js";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { importSQL } from "../../utils/importSQL/index.js";
import { Parser } from "node-sql-parser";

export default function SidePanelForAI({ width, resize }) {
  const scrollContainerRef = useRef(null);
  const { layout, setLayout } = useLayout();
  const { t } = useTranslation();
  // 状态管理
  const { tables, setTables, database, parsedContent, setParsedContent, isTyping, setIsTyping } = useDiagram();
  const { setTransform } = useTransform();
  const [question, setQuestion] = useState("");
  const sqlRegex = /```sql([\s\S]*?)```/g;

  //const defaultPrompt = "要求：输出内容如果含有sql语句，SQL语句用 \"```sql\"包裹起来, 其他正常输出。";

  useEffect(() => {
    // 每当 messages 更新时，滚动到最底部
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [parsedContent, isTyping]);

  // 发送消息并请求 API 响应
  const sendMessage = async (message) => {
    try {
      setParsedContent((prevMessages) => [...prevMessages, { type: "user", content: message }]);
      setQuestion("");

      const modelName = "qwen2.5:7b";

      const requestBody = {
        model: modelName,
        prompt: message,
        stream: false,
      };

      setIsTyping(true); // 开始动画

      const response = await fetch("http://172.28.100.47:11434/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const data = await response.json();
      const apiResponse = data.response;

      setIsTyping(false); // 结束动画

      if (apiResponse.includes("```sql") > -1) {
        let match;
        const parts = [];
        let lastIndex = 0;

        while ((match = sqlRegex.exec(apiResponse)) !== null) {
          if (lastIndex < match.index) {
            parts.push(apiResponse.slice(lastIndex, match.index));
          }
          parts.push(match[0]);
          lastIndex = sqlRegex.lastIndex;
        }

        if (lastIndex < apiResponse.length) {
          parts.push(apiResponse.slice(lastIndex));
        }

        const parsed = parts.map((part, index) => {
          if (part.startsWith("```sql")) {
            return {
              type: "sql",
              content: part,
              index: index,
            };
          } else {
            return {
              type: "text",
              content: part,
              index: index,
            };
          }
        });

        setParsedContent((prevMessages) => [...prevMessages, ...parsed]);
      } else {
        setParsedContent((prevMessages) => [...prevMessages, { type: "text", content: apiResponse }]);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setIsTyping(false); // 如果发生错误，也结束动画
    }
  };

  // 处理输入框变化
  const handleInputChange = (value) => {
    setQuestion(value);
  };

  // 处理发送按钮点击或回车键事件
  const handleSend = () => {
    if (question.trim() !== "") {
      sendMessage(question);
    }
  };

  const copySQLToClipboard = (text) => {
    // 复制到剪贴板
    let sql = text.match(sqlRegex)?.[0]?.replace("```sql", "").replace("```", "");
    if (!sql) {
      sql = text;
    }
    try {
      navigator.clipboard.writeText(sql);
      console.log("Text copied to clipboard");
    } catch (err) {
      console.log("Failed to copy text: ", err);
      const copyOfTextarea = document.createElement("textarea");
      copyOfTextarea.value = sql;
      document.body.appendChild(copyOfTextarea);
      copyOfTextarea.select();
      try {
        document.execCommand("copy");
        console.log("Text copied to clipboard");
      } catch (err) {
        console.log("Failed to copy text: ", err);
      }
      document.body.removeChild(copyOfTextarea);
    }

    Toast.success("复制成功");
  };

  const handleRightClick = (event, item) => {
    event.preventDefault(); // 阻止默认的右击菜单
    // 在这里添加你想要执行的逻辑
    copySQLToClipboard(item.content);
  };

  return (
    <div className="flex h-full">
      <div className={`flex justify-center items-center p-1 h-auto hover-2 cursor-col-resize ${
        resize && "bg-semi-grey-2"}`}
           onClick={() => setLayout((prev) => ({ ...prev, sideOfAIBar: !prev.sideOfAIBar }))}>
        <div className="w-1 border-x border-color h-1/6" />
      </div>
      {
        layout.sideOfAIBar && (
          <div className="flex flex-col h-full relative border-r border-color shadow-lg" style={{ width: `${width}px` }}>
            <div ref={scrollContainerRef} className="h-full flex-1 overflow-y-auto custom-scrollbar p-4">
              {/* 渲染聊天记录 */}
              <div>
                {parsedContent?.map((item, index) => (
                  item.type === "user" ? (
                    <div key={index} className={`chat-message user`}>
                      <span onContextMenu={(e) => handleRightClick(e, item)}>{item.content}</span>
                    </div>
                  ) : (item.type === "text" ? (
                    <div key={index} className={`chat-message api`}>
                      <ReactMarkdown>{item.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <div key={index} className={`chat-message api`}>
                      <div className="button-group">
                        {/* 复制按钮 */}
                        <Button title={item.content}>
                          <button className="copy-button" onClick={() => copySQLToClipboard(item.content)}>复制
                          </button>
                        </Button>
                        {/* 创建实体 */}
                        <Button className="create-new-button" onClick={() => {
                          try {
                            const parser = new Parser();
                            const sql = item.content.match(sqlRegex)[0]?.replace("```sql", "").replace("```", "");
                            let ast = parser.astify(sql, {
                              database: database,
                            });
                            const diagramData = importSQL(
                              ast,
                              database,
                              database,
                            );

                            let resetTables = diagramData.tables;
                            // 使用 slice 创建一个浅拷贝，避免直接修改原数组
                            let tempTables = tables.slice();
                            // 遍历原始表格并更新
                            tables.forEach((table) => {
                              const updTable = diagramData.tables.find(newTable => newTable.name === table.name);
                              if (updTable) {
                                // 移除 tempTables 中对应的旧表
                                tempTables = tempTables.filter(t => t.name !== updTable.name);
                              }
                            });
                            resetTables.push(...tempTables);
                            resetTables.map((table, index) => {
                              table.id = index;
                            });
                            setTables(resetTables);
                            setTransform((prev) => ({ ...prev, pan: { x: 0, y: 0 } }));
                          } catch (e) {
                            console.log(e);
                            Toast.error("发生异常，请检查SQL");
                          }
                        }}>
                          创建
                        </Button>
                      </div>
                      <ReactMarkdown>{item.content}</ReactMarkdown>
                    </div>
                  ))
                ))}
                {isTyping && (
                  <span className="typing-dot" style={{ marginLeft: "auto" }}></span>
                )}
              </div>
            </div>
            <div className="flex gap-2 border-color shadow-inner p-4">
              <TextArea
                placeholder="请输入问题"
                height={200}
                autoFocus
                value={question}
                onChange={handleInputChange}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <div>
                <Button onClick={handleSend}>{t("send")}</Button>
              </div>
            </div>
          </div>)
      }
    </div>
  );
}
