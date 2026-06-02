import { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Loader2, Sparkles } from 'lucide-react';

function App() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I am the Deka & Associates AI assistant. How can I help you with your business, legal, or taxation queries today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage.content })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', content: "Sorry, I encountered an error. Please try again or book a consultation on our website." }]);
      }
    } catch (error) {
      setMessages((prev) => [...prev, { role: 'assistant', content: "Network error. Please ensure the backend is running." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>

      {/* Floating Chatbox Container */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end">
        
        {/* Chat Window */}
        {isOpen && (
          <div className="mb-4 w-[380px] h-[550px] bg-white border border-gray-200 shadow-sm flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white">
              <div>
                <h2 className="font-medium text-sm text-gray-900 tracking-tight">AI Assistant</h2>
                <p className="text-xs text-gray-500">Deka & Associates</p>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-100 transition-colors cursor-pointer text-gray-400 hover:text-gray-900"
              >
                <X size={16} />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 scrollbar-hide">
              {messages.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[85%] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user' 
                        ? 'bg-gray-900 text-white' 
                        : 'bg-white text-gray-800 border border-gray-100 shadow-sm'
                    }`}
                  >
                    {msg.content.replace('[CTA:BOOK]', '')}
                    {msg.role === 'assistant' && msg.content.includes('[CTA:BOOK]') && (
                      <div className="mt-3 border-t border-gray-100 pt-3">
                        <a 
                          href="https://www.dekaandassociates.in/" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-block w-full text-center bg-gray-900 text-white py-2 px-4 text-sm font-medium hover:bg-gray-800 transition-colors"
                        >
                          Book Consultation
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-100 shadow-sm p-3 text-gray-400">
                    <Loader2 size={16} className="animate-spin" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-white border-t border-gray-100">
              <form onSubmit={handleSend} className="relative flex items-center">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a question..."
                  className="w-full pl-4 pr-12 py-3 text-sm bg-gray-50 border border-gray-100 focus:outline-none focus:border-gray-300 focus:ring-0 transition-colors"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 p-2 text-gray-400 hover:text-gray-900 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  <Send size={16} />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Floating Action Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center space-x-2 px-5 py-3 rounded-full text-white shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:shadow-[0_0_30px_rgba(168,85,247,0.6)] bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 transition-all duration-300 cursor-pointer ${
            isOpen ? 'scale-90 opacity-0 pointer-events-none' : 'scale-100 opacity-100 hover:scale-105'
          }`}
          style={{ position: isOpen ? 'absolute' : 'relative', bottom: isOpen ? '0' : 'auto' }}
        >
          <Sparkles size={20} className="text-white fill-white" />
          <span className="font-semibold text-sm tracking-wide">AI Assistant</span>
        </button>
      </div>
    </>
  );
}

export default App;
