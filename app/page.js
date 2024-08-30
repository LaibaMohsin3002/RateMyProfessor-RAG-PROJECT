"use client";
import { Box, Button, Stack, TextField, Typography } from "@mui/material";
import { styled, ThemeProvider, createTheme } from "@mui/material/styles";
import { useState } from "react";

console.log(process.env.GEMINI_API_KEY);

// Custom styled components
const StyledBox = styled(Box)(({ theme }) => ({
  width: "100vw",
  height: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  flexDirection: "column",
  backgroundColor: theme.palette.background.default,
  padding: theme.spacing(4),
  boxSizing: "border-box",
}));

const ChatContainer = styled(Stack)(({ theme }) => ({
  width: "500px",
  height: "700px",
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(2),
  boxShadow: theme.shadows[5],
  backgroundColor: theme.palette.background.paper,
  position: "relative",
  overflow: "hidden",
}));

const MessageBubble = styled(Box)(({ theme, role }) => ({
  backgroundColor: role === "assistant" ? theme.palette.primary.main : theme.palette.secondary.main,
  color: theme.palette.common.white,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(2),
  maxWidth: "80%",
  boxShadow: "0 0 10px rgba(0,0,0,0.2)",
}));

// Custom scroll bar styling
const ChatMessages = styled(Stack)(({ theme }) => ({
  direction: "column",
  spacing: 2,
  flexGrow: 1,
  overflowY: "auto",
  maxHeight: "100%",
  paddingRight: theme.spacing(2), // Space for scrollbar
  "&::-webkit-scrollbar": {
    width: "8px",
  },
  "&::-webkit-scrollbar-thumb": {
    backgroundColor: theme.palette.primary.main,
    borderRadius: "8px",
  },
  "&::-webkit-scrollbar-track": {
    backgroundColor: theme.palette.background.default,
  },
}));

// Define your custom theme
const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#bb86fc",
    },
    secondary: {
      main: "#03dac6",
    },
    background: {
      default: "#121212",
      paper: "#1f1f1f",
    },
    text: {
      primary: "#ffffff",
      secondary: "#a8a8a8",
    },
  },
  typography: {
    fontFamily: "Roboto, san-serif, Verdana",
    h4: {
      fontWeight: 500,
      letterSpacing: "0.1em",
    },
    body1: {
      fontSize: "1.2rem",
      lineHeight: 1.6,
    },
  },
  shape: {
    borderRadius: 12,
  },
});

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi! I'm the rate my professor support assistant. How can I help you today?",
    },
  ]);

  const [message, setMessage] = useState("");

  const sendMessage = async () => {
    setMessages((messages) => [
      ...messages,
      { role: "user", content: message },
      { role: "assistant", content: "" },
    ]);
    setMessage("");

    fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify([...messages, { role: "user", content: message }]),
    }).then(async (res) => {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      let result = "";
      return reader.read().then(function processText({ done, value }) {
        if (done) {
          return result;
        }
        const text = decoder.decode(value || new Uint8Array(), {
          stream: true,
        });
        setMessages((messages) => {
          let lastMessage = messages[messages.length - 1];
          let otherMessages = messages.slice(0, messages.length - 1);
          return [
            ...otherMessages,
            { ...lastMessage, content: lastMessage.content + text },
          ];
        });
        return reader.read().then(processText);
      });
    });
  };

  return (
    <ThemeProvider theme={theme}>
      <StyledBox>
        <Typography variant="h3" color="#00FFFF" gutterBottom align="center" marginBottom={5}>
          <b>RATE MY PROFESSOR</b>
        </Typography>
        <ChatContainer direction="column" spacing={3}>
          <ChatMessages>
            {messages.map((message, index) => (
              <Box
                key={index}
                display="flex"
                justifyContent={message.role === "assistant" ? "flex-start" : "flex-end"}
                mb={2} // Add spacing after each message bubble
              >
                <MessageBubble role={message.role}>
                  {message.content.split("\n").map((line, i) => (
                    <Typography key={i} paragraph>
                      {line}
                    </Typography>
                  ))}
                </MessageBubble>
              </Box>
            ))}
          </ChatMessages>
          <Stack direction="row" spacing={2}>
            <TextField
              label="Message"
              fullWidth
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              variant="outlined"
            />
            <Button variant="contained" onClick={sendMessage} >
              Send
            </Button>
          </Stack>
        </ChatContainer>
      </StyledBox>
    </ThemeProvider>
  );
}

