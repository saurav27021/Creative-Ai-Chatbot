document.addEventListener("DOMContentLoaded", () => {
    const chatBody = document.querySelector(".chat-body");
    const messageInput = document.querySelector(".message-input");
    const sendMessageButton = document.querySelector("#send-message");
    const fileInput = document.querySelector("#file-input");
    const fileUploadWrapper = document.querySelector(".file-upload-wrapper");
    const fileCancelButton = document.querySelector("#file-cancel");
    const closeChatbot = document.querySelector("#close-chatbot");

    const API_KEY = "AIzaSyBsZrZLwvQSjZgmukPdURAcNRKjmx9GScA";  
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

    const userData = {
        message: null,
        file: { data: null, mime_type: null }
    };

    const chatHistory = [];
    const initialInputHeight = messageInput.scrollHeight;

    let lastUploadFile = null;
    const conversationHistory = [];

    
    const loadImageFromLocalStorage = () => {
        const storedImage = localStorage.getItem('uploadedImage');
        if (storedImage) {
            userData.file = JSON.parse(storedImage);
            fileUploadWrapper.querySelector("img").src = `data:${userData.file.mime_type};base64,${userData.file.data}`;
            fileUploadWrapper.classList.add("file-uploaded");
        }
    };

    
    const saveImageToLocalStorage = () => {
        localStorage.setItem('uploadedImage', JSON.stringify(userData.file));
    };

    
    const clearImageFromLocalStorage = () => {
        localStorage.removeItem('uploadedImage');
    };

    const createMessageElement = (content, ...classes) => {
        const div = document.createElement("div");
        div.classList.add("message", ...classes);
        div.innerHTML = content;
        return div;
    };

    const generateBotResponse = async (incomingMessageDiv) => {
        const messageElement = incomingMessageDiv.querySelector(".message-text");

        chatHistory.push({
            role: "user",
            parts: [
                { text: userData.message },
                ...(userData.file?.data ? [{ inline_data: userData.file }] : [])
            ]
        });

        const requestOptions = {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: chatHistory })
        };

        try {
            const response = await fetch(API_URL, requestOptions);

            if (!response.ok) {  
                throw new Error(`HTTP Error: ${response.status}`);
            }
            
            const data = await response.json();

            const botMessage = data.candidates?.[0]?.content?.parts?.[0]?.text
                ?.replace(/[`*]/g, "") 
                .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>") 
                .replace(/\*(.*?)\*/g, "<i>$1</i>")
                .replace(/\n/g, "<br>")
                .trim() || "Sorry, I couldn't understand that.";

            chatHistory.push({
                role: "model",
                parts: [{ text: botMessage }]
            });

            conversationHistory.push({ 
                role: "bot", 
                text: botMessage, 
                file: userData.file?.data ? { ...userData.file } : null 
            });

            messageElement.innerHTML = botMessage; 
        } catch (error) {
            console.error(error);
            messageElement.innerText = `Error: ${error.message}`;
            incomingMessageDiv.classList.add("error");
        } finally {
            userData.file = { data: null, mime_type: null };
            clearImageFromLocalStorage(); 
            incomingMessageDiv.classList.remove("thinking");
            chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
        }
    };

    const handleOutgoingMessage = (e) => {
        e.preventDefault();
        const userMessage = messageInput?.value.trim();
        if (!userMessage) return;

        fileUploadWrapper.classList.remove("file-uploaded"); 
        userData.message = userMessage; 
        messageInput.dispatchEvent(new Event("input"));

        if (!userData.file?.data) {
            const lastImageMessage = [...(conversationHistory || [])]
                .reverse()
                .find(message => message.file && message.file.data);

            if (lastImageMessage) {
                userData.file = lastImageMessage.file;
            } else if (lastUploadFile) {
                userData.file = lastUploadFile;
                lastUploadFile = null;
            }
        }

        const messageContent = `
            <div class="message-text">${userData.message}</div>
            ${userData.file.data ? `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="attachment"/>` : ""}
        `;

        const outgoingMessageDiv = createMessageElement(messageContent, "user-message");
        chatBody.appendChild(outgoingMessageDiv);
        chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
        messageInput.value = "";
        messageInput.focus();

        
        if (userData.file.data) {
            saveImageToLocalStorage();
        }

        
        setTimeout(() => {
            const thinkingMessageContent = `
                <svg class="bot-avatar" xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 1024 1024">
                    <path d="M738.3 287.6H285.7c-59 0-106.8 47.8-106.8 106.8v303.1c0 59 47.8 106.8 106.8 106.8h81.5v111.1c0 .7.8 1.1 1.4.7l166.9-110.6 41.8-.8h117.4l43.6-.4c59 0 106.8-47.8 106.8-106.8V394.5c0-59-47.8-106.9-106.8-106.9zM351.7 448.2c0-29.5 23.9-53.5 53.5-53.5s53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5-53.5-23.9-53.5-53.5zm157.9 267.1c-67.8 0-123.8-47.5-132.3-109h264.6c-8.6 61.5-64.5 109-132.3 109zm110-213.7c-29.5 0-53.5-23.9-53.5-53.5s23.9-53.5 53.5-53.5 53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5z"></path>
                </svg>
                <div class="message-text">
                    <div class="thinking-indicator">
                        <div class="dot"></div>
                        <div class="dot"></div>
                        <div class="dot"></div>
                    </div>
                </div>`;

            const incomingMessageDiv = createMessageElement(thinkingMessageContent, "bot-message", "thinking");
            chatBody.appendChild(incomingMessageDiv);
            chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });

            generateBotResponse(incomingMessageDiv);
        }, 600);
    };

    
    messageInput.addEventListener("keydown", (e) => {
        const userMessage = e.target.value.trim();
        if (e.key === "Enter" && userMessage && !e.shiftKey && window.innerWidth > 786) { 
            handleOutgoingMessage(e);
        }
    });

    messageInput.addEventListener("input", () => {
        messageInput.style.height = `${initialInputHeight}px`;
        messageInput.style.height = `${messageInput.scrollHeight}px`;
        document.querySelector(".chat-form").style.borderRadius = messageInput.scrollHeight > initialInputHeight ? "15px" : "32px";
    });

    
    fileInput.addEventListener("change", () => {
        const file = fileInput.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const base64String = e.target.result.split(",")[1];

            fileUploadWrapper.querySelector("img").src = e.target.result;
            fileUploadWrapper.classList.add("file-uploaded");

            
            userData.file = {
                data: base64String,
                mime_type: file.type
            };
            localStorage.setItem("uploadedFile", JSON.stringify(userData.file));

            fileInput.value = "";
        };
        reader.readAsDataURL(file);
    });

    
    loadImageFromLocalStorage();

    
    fileCancelButton.addEventListener("click", () => {
        userData.file = { data: null, mime_type: null };
        
        
        localStorage.removeItem("uploadedFile");

        
        fileUploadWrapper.classList.remove("file-uploaded");
        fileUploadWrapper.querySelector("img").src = "";
    });

    
    document.body.classList.add("show-chatbot");

    const picker = new EmojiMart.Picker({
        theme: "light",
        skinTonePosition: "none",
        previewPosition: "none",
        onEmojiSelect: (emoji) => {
            const { selectionStart, selectionEnd } = messageInput;
            messageInput.setRangeText(emoji.native, selectionStart, selectionEnd, "end");
            messageInput.focus();
        }
    });

    
    const chatForm = document.querySelector(".chat-form");
    if (chatForm) chatForm.appendChild(picker);

    
    document.querySelector("#emoji-picker").addEventListener("click", (e) => {
        document.body.classList.toggle("show-emoji-picker");
        e.stopPropagation();
    });

    
    document.addEventListener("click", (e) => {
        if (!e.target.closest(".emoji-mart")) {
            document.body.classList.remove("show-emoji-picker");
        }
    });

    
    sendMessageButton.addEventListener("click", (e) => handleOutgoingMessage(e));

    
    document.querySelector("#file-upload").addEventListener("click", () => fileInput.click());

    
    closeChatbot.addEventListener("click", () => {
        document.body.classList.remove("show-chatbot");
    });
});