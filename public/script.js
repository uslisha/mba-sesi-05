document.addEventListener('DOMContentLoaded', () => {
  const themeToggle = document.getElementById('theme-toggle');
  const body = document.body;

  // Function to apply theme
  const applyTheme = (theme) => {
    if (theme === 'dark') {
      body.setAttribute('data-theme', 'dark');
      themeToggle.checked = true;
    } else {
      body.removeAttribute('data-theme');
      themeToggle.checked = false;
    }
  };

  // Check for saved theme in localStorage
  const savedTheme = localStorage.getItem('theme') || 'light';
  applyTheme(savedTheme);

  // Event listener for the theme toggle
  themeToggle.addEventListener('change', () => {
    if (themeToggle.checked) {
      localStorage.setItem('theme', 'dark');
      applyTheme('dark');
    } else {
      localStorage.setItem('theme', 'light');
      applyTheme('light');
    }
  });


  const chatForm = document.getElementById('chat-form');
  const userInput = document.getElementById('user-input');
  const chatBox = document.getElementById('chat-box');

  let conversationHistory = [];

  /**
   * A simple markdown-to-HTML converter for the bot's response.
   * Handles:
   * - ### headers
   * - **bold** text
   * - --- horizontal rules
   * - Numbered lists
   * - Paragraphs
   * @param {string} text - The raw text from the bot.
   * @returns {string} - HTML formatted string.
   */
  const formatBotResponse = (text) => {
    let html = text
      // Bold text: **text** -> <strong>text</strong>
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    const lines = html.split('\n');
    let resultHtml = '';
    let inList = false;

    lines.forEach(line => {
      line = line.trim();
      if (line.startsWith('### ')) {
        if (inList) {
          resultHtml += '</ol>';
          inList = false;
        }
        resultHtml += `<h3>${line.substring(4)}</h3>`;
      } else if (line.startsWith('---')) {
        if (inList) {
          resultHtml += '</ol>';
          inList = false;
        }
        resultHtml += '<hr>';
      } else if (/^\d+\.\s/.test(line)) {
        if (!inList) {
          resultHtml += '<ol>';
          inList = true;
        }
        resultHtml += `<li>${line.replace(/^\d+\.\s/, '')}</li>`;
      } else {
        if (inList) {
          resultHtml += '</ol>';
          inList = false;
        }
        if (line) { // Avoid creating empty paragraphs
            resultHtml += `<p>${line}</p>`;
        }
      }
    });

    if (inList) {
      resultHtml += '</ol>';
    }

    return resultHtml;
  };

  /**
   * Appends a message to the chat box.
   * @param {string} sender - 'user' or 'bot'.
   * @param {string} message - The message content.
   * @param {string|null} id - An optional ID for the message element.
   * @returns {HTMLElement} The created message element.
   */
  const appendMessage = (sender, message, id = null) => {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', sender); // Use 'user' or 'bot' as the class
    if (id) {
      messageElement.id = id;
    }

    if (sender === 'bot' || sender === 'error') {
      // For bot and error messages, we expect HTML content or plain text
      messageElement.innerHTML = message;
    } else {
      // For user messages, always use innerText to prevent XSS
      messageElement.innerText = message;
    }

    chatBox.appendChild(messageElement);
    chatBox.scrollTop = chatBox.scrollHeight;
    return messageElement;
  };

  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const userMessage = userInput.value.trim();
    if (!userMessage) return;

    appendMessage('user', userMessage);
    conversationHistory.push({ role: 'user', text: userMessage });
    userInput.value = '';

    const thinkingMessageElement = appendMessage('bot', 'Thinking...', 'thinking-message');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation: conversationHistory }),
      });

      if (!response.ok) throw new Error('Failed to get response from server.');
      
      const data = await response.json();

      if (data && data.result) {
        const formattedResponse = formatBotResponse(data.result);
        thinkingMessageElement.innerHTML = formattedResponse;
        thinkingMessageElement.id = '';
        conversationHistory.push({ role: 'model', text: data.result });
      } else {
        throw new Error('Sorry, no response received.');
      }
    } catch (error) {
      // Update the thinking message to show the error.
      thinkingMessageElement.innerHTML = error.message;
      thinkingMessageElement.classList.remove('bot');
      thinkingMessageElement.classList.add('error');
      thinkingMessageElement.id = '';
    }
  });
});