import { Button, Input, TextArea } from "@douyinfe/semi-ui";
import { useTranslation } from "react-i18next";
import { isRtl } from "../../i18n/utils/rtl";
import i18n from "../../i18n/i18n";
import { useLayout } from "../../hooks/index.js";
import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";

export default function SidePanelForAI({ width, resize, setResize }) {
  const scrollContainerRef = useRef(null);
  const { layout } = useLayout();
  const { t } = useTranslation();
  const [isTyping, setIsTyping] = useState(false);

  // 状态管理
  const [messages, setMessages] = useState([]);
  const [parsedContent, setParsedContent] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const sqlRegex = /```sql([\s\S]*?)```/g;

  const defaultPrompt = "要求：输出内容如果含有sql语句，SQL语句用 \"```sql\"包裹起来, 其他正常输出。";

  // 发送消息并请求 API 响应
  const sendMessage = async (message) => {
    try {
      setParsedContent((prevMessages) => [...prevMessages, { type: "user", content: message }]);
      setInputValue("");

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
            };
          } else {
            return {
              type: "text",
              content: part,
            };
          }
        });

        setParsedContent((prevMessages) => [...prevMessages, ...parsed]);
      } else {
        setParsedContent((prevMessages) => [...prevMessages, { type: "text", content: messages }]);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setIsTyping(false); // 如果发生错误，也结束动画
    }
  };


  // 处理输入框变化
  const handleInputChange = (value) => {
    setInputValue(value);
  };

  // 处理发送按钮点击或回车键事件
  const handleSend = () => {
    if (inputValue.trim() !== "") {
      sendMessage(inputValue);
    }
  };

  useEffect(() => {
    // 每当 messages 更新时，滚动到最底部
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [parsedContent, isTyping]);

  return (
    <div className="flex h-full">
      <div className="flex flex-col h-full relative border-r border-color shadow-lg" style={{ width: `${width}px` }}>
        <div ref={scrollContainerRef} className="h-full flex-1 overflow-y-auto custom-scrollbar p-4">
          {/* 渲染聊天记录 */}
          <div>
            {console.log(parsedContent)}
            {parsedContent.map((item, index) => (
              item.type === "user" ? (
                <div key={index} className={`chat-message user`}>
                  <span>{item.content}</span>
                </div>
              ) : (item.type === "text" ? (
                <div key={index} className={`chat-message api`}>
                  <span>{item.content}</span>
                </div>
              ) : (
                <div key={index} className={`chat-message api`}>
                  <div className="button-group">
                    {/* 复制按钮 */}
                    <Button title={item.content}>
                      <button className="copy-button">复制</button>
                    </Button>
                    {/* 创建实体 */}
                    <Button className="create-new-button">
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
            value={inputValue}
            onChange={handleInputChange}
            onKeyPress={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <div>
            <Button onClick={handleSend}>发送</Button>
          </div>
        </div>
      </div>
      <div
        className={`flex justify-center items-center p-1 h-auto hover-2 cursor-col-resize ${resize && "bg-semi-grey-2"}`}
        onPointerDown={(e) => e.isPrimary && setResize(true)}>
        <div className="w-1 border-x border-color h-1/6" />
      </div>
    </div>
  );
}
