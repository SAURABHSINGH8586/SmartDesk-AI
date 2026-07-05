import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Sparkles, 
  Database, 
  Mic, 
  MicOff,
  Settings, 
  Send, 
  Plus, 
  Trash2, 
  Clipboard, 
  Activity, 
  FileText, 
  Volume2, 
  VolumeX, 
  Network, 
  ArrowRight, 
  ExternalLink, 
  FilePlus2, 
  RefreshCw, 
  Sliders, 
  X,
  FileCheck,
  Search,
  CheckSquare
} from 'lucide-react';
import { OllamaService } from './utils/ollama';
import { chunkDocument, LocalVectorSearch } from './utils/rag';
import confetti from 'canvas-confetti';

// Initial state helpers
const INITIAL_MESSAGES = [
  { 
    id: 'msg-init-1', 
    role: 'assistant', 
    content: "Hi! I'm your local **SmartDesk Assistant**. I run entirely on your machine. You can chat with me, upload files to search locally, or speak to me. To get started, try checking the connection status below." 
  }
];

const INITIAL_NOTES = [
  { id: 'note-1', text: 'Set up local Ollama environment with phi3:latest model.', createdAt: '10:30 AM' },
  { id: 'note-2', text: 'RAG system testing: verify vector search weights for index matches.', createdAt: '11:15 AM' }
];

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Theme & Appearance
  const [theme, setTheme] = useState(() => localStorage.getItem('smartdesk-theme') || 'purple');
  const [glowEffects, setGlowEffects] = useState(true);

  // Connection & Models
  const [ollamaUrl, setOllamaUrl] = useState(() => localStorage.getItem('smartdesk-ollama-url') || 'http://localhost:11434');
  const [connectionStatus, setConnectionStatus] = useState('offline'); // 'active' | 'sandbox' | 'offline'
  const [availableModels, setAvailableModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('sandbox');
  const [isTestingConn, setIsTestingConn] = useState(false);

  // Model parameters
  const [systemPrompt, setSystemPrompt] = useState('You are SmartDesk, a highly productive local AI assistant. Keep responses clear, concise, and structured.');
  const [temperature, setTemperature] = useState(0.7);

  // Chat Hub States
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [userInput, setUserInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const [generationStats, setGenerationStats] = useState(null);
  const [streamCancelFn, setStreamCancelFn] = useState(null);

  // RAG States
  const [documents, setDocuments] = useState([]);
  const [ragEnabled, setRagEnabled] = useState(false);
  const [ragSearchQuery, setRagSearchQuery] = useState('');
  const [ragSearchResults, setRagSearchResults] = useState([]);
  const [latestRetrievedChunks, setLatestRetrievedChunks] = useState([]);

  // Notes States
  const [notes, setNotes] = useState(INITIAL_NOTES);
  const [newNoteText, setNewNoteText] = useState('');

  // Voice Assistant States
  const [speechSynthesisEnabled, setSpeechSynthesisEnabled] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [speechTranscript, setSpeechTranscript] = useState('');
  const [voicePlaybackActive, setVoicePlaybackActive] = useState(false);

  // Simulated Hardware Resource Metrics
  const [cpuUsage, setCpuUsage] = useState(12);
  const [ramUsage, setRamUsage] = useState(48);
  const [gpuUsage, setGpuUsage] = useState(4);

  // Toast Notification State
  const [toasts, setToasts] = useState([]);

  // RAG Engine Ref
  const vectorSearchRef = useRef(new LocalVectorSearch());

  // Accumulator ref for streaming chat response
  const chatResponseAccumulatorRef = useRef('');

  // Web Speech API Refs
  const recognitionRef = useRef(null);

  // Initialize and check connection
  useEffect(() => {
    checkConnection(ollamaUrl);
  }, []);

  // Update HTML data attribute for themes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('smartdesk-theme', theme);
  }, [theme]);

  // System stats logic - fluctuate metrics and spike them when local AI is generating
  useEffect(() => {
    const interval = setInterval(() => {
      if (isGenerating) {
        // Spike stats to simulate local SLM computation
        setCpuUsage(prev => Math.min(95, Math.max(60, prev + (Math.random() * 12 - 6))));
        setRamUsage(prev => Math.min(85, Math.max(65, prev + (Math.random() * 2 - 1))));
        setGpuUsage(prev => Math.min(98, Math.max(50, prev + (Math.random() * 15 - 7))));
      } else {
        // Low idle metrics
        setCpuUsage(prev => Math.min(22, Math.max(6, prev + (Math.random() * 4 - 2))));
        setRamUsage(prev => Math.min(52, Math.max(44, prev + (Math.random() * 0.4 - 0.2))));
        setGpuUsage(prev => Math.min(10, Math.max(2, prev + (Math.random() * 2 - 1))));
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isGenerating]);

  // Toast helper
  const showToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Check Ollama connection
  const checkConnection = async (url) => {
    setIsTestingConn(true);
    const connected = await OllamaService.testConnection(url);
    if (connected) {
      setConnectionStatus('active');
      const models = await OllamaService.getModels(url);
      setAvailableModels(models);
      
      if (models.length > 0) {
        // Set first model as selected by default if not already configured
        setSelectedModel(models[0].name);
        showToast(`Connected to Ollama! Found ${models.length} model(s).`, 'success');
      } else {
        setSelectedModel('sandbox');
        showToast("Connected to Ollama, but no local models found. Running in Sandbox fallback.", "warning");
      }
    } else {
      setConnectionStatus('sandbox');
      setSelectedModel('sandbox');
      showToast("Ollama server not detected. Sandbox fallback enabled.", "info");
    }
    setIsTestingConn(false);
  };

  // Reconnect button
  const handleReconnect = () => {
    checkConnection(ollamaUrl);
  };

  // Add a Note
  const handleAddNote = (e) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    
    const newNote = {
      id: `note-${Date.now()}`,
      text: newNoteText.trim(),
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setNotes(prev => [newNote, ...prev]);
    setNewNoteText('');
    showToast("Note added to desk.", "success");
  };

  // Delete a Note
  const handleDeleteNote = (id) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    showToast("Note deleted.", "info");
  };

  // Enhance note using local AI
  const handleEnhanceNote = (noteText) => {
    setActiveTab('chat');
    setUserInput(`Improve this draft note or expand these bullet points into a detailed, professional item:\n\n"${noteText}"`);
    showToast("Prompt copied to chat input. Click send to run SLM.", "info");
  };

  // Handle Document Upload (RAG)
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target.result;
        
        // Chunk document
        const chunks = chunkDocument(file.name, content);
        const newDoc = {
          name: file.name,
          size: `${Math.round(file.size / 1024 * 10) / 10} KB`,
          chunksCount: chunks.length,
          content: content,
          chunks: chunks
        };

        // Add to state
        setDocuments(prev => {
          const updated = [...prev.filter(d => d.name !== file.name), newDoc];
          // Re-index all chunks in RAG engine
          const allChunks = updated.flatMap(d => d.chunks);
          vectorSearchRef.current.indexChunks(allChunks);
          return updated;
        });

        // Trigger confetti
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#8a2be2', '#06b6d4', '#10b981']
        });

        showToast(`Indexed "${file.name}" into RAG. Created ${chunks.length} context chunks.`, "success");
      };
      reader.readAsText(file);
    });

    // Reset input
    e.target.value = null;
  };

  // Remove RAG document
  const handleRemoveDoc = (docName) => {
    setDocuments(prev => {
      const updated = prev.filter(d => d.name !== docName);
      // Re-index
      const allChunks = updated.flatMap(d => d.chunks);
      vectorSearchRef.current.indexChunks(allChunks);
      return updated;
    });
    showToast(`Removed "${docName}" from vector index.`, "info");
  };

  // Quick RAG keyword search demo
  const handleRagSearch = (query) => {
    setRagSearchQuery(query);
    if (!query.trim()) {
      setRagSearchResults([]);
      return;
    }
    const results = vectorSearchRef.current.search(query, 5);
    setRagSearchResults(results);
  };

  // Submit chat prompt
  const handleSendPrompt = async (e, customText = '') => {
    if (e) e.preventDefault();
    
    const textToSubmit = customText || userInput;
    if (!textToSubmit.trim() || isGenerating) return;

    // Clear input
    if (!customText) setUserInput('');

    // RAG Retrieval if enabled
    let retrievalPromptPrefix = '';
    let retrievedChunks = [];
    if (ragEnabled && documents.length > 0) {
      retrievedChunks = vectorSearchRef.current.search(textToSubmit, 3);
      if (retrievedChunks.length > 0) {
        setLatestRetrievedChunks(retrievedChunks);
        retrievalPromptPrefix = `Use the following retrieved local documents context to answer the user request. Mention sources if relevant.\n\n=== CONTEXT ===\n${retrievedChunks.map(c => `[Source: ${c.documentName}] ${c.text}`).join('\n\n')}\n===============\n\n`;
      }
    } else {
      setLatestRetrievedChunks([]);
    }

    const userMsg = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: textToSubmit
    };

    setMessages(prev => [...prev, userMsg]);
    setIsGenerating(true);
    chatResponseAccumulatorRef.current = '';
    setCurrentResponse('');
    setGenerationStats(null);

    // Call Ollama / Sandbox Service
    const isSandboxMode = connectionStatus === 'sandbox' || selectedModel === 'sandbox';
    
    const messagesHistory = [...messages, userMsg];
    // Include retrieval context in the message history content of the last user message
    if (retrievalPromptPrefix) {
      const lastIndex = messagesHistory.length - 1;
      messagesHistory[lastIndex] = {
        ...messagesHistory[lastIndex],
        content: retrievalPromptPrefix + messagesHistory[lastIndex].content
      };
    }

    const cancel = OllamaService.chat({
      url: ollamaUrl,
      model: selectedModel,
      messages: messagesHistory,
      systemPrompt: systemPrompt,
      temperature: temperature,
      isSandbox: isSandboxMode,
      onChunk: (chunk) => {
        chatResponseAccumulatorRef.current += chunk;
        setCurrentResponse(chatResponseAccumulatorRef.current);
      },
      onError: (err) => {
        showToast("Error generating response: " + err.message, "error");
        setIsGenerating(false);
      },
      onDone: (stats) => {
        const finalResponse = chatResponseAccumulatorRef.current;
        // Complete generating
        setMessages(prev => [
          ...prev,
          { 
            id: `msg-${Date.now()}-bot`, 
            role: 'assistant', 
            content: finalResponse || "No content generated.",
            sources: retrievedChunks
          }
        ]);
        
        // Format stats (convert ns to ms/seconds for readable metrics)
        const totalSec = stats.totalDuration ? (stats.totalDuration / 1e9).toFixed(2) : 0;
        const tokensPerSec = stats.evalCount && stats.evalDuration ? (stats.evalCount / (stats.evalDuration / 1e9)).toFixed(1) : 0;
        
        setGenerationStats({
          timeSeconds: totalSec,
          tokens: stats.evalCount || 0,
          speed: tokensPerSec
        });

        setIsGenerating(false);
        setCurrentResponse('');

        // Trigger TTS voice output if enabled
        if (speechSynthesisEnabled && finalResponse) {
          speakResponse(finalResponse);
        }
      }
    });

    setStreamCancelFn(() => cancel);
  };

  // Watch for current response changes and update inside message container
  // to show real-time typing / streaming effect
  const activeStreamResponse = currentResponse;

  // Cancel generation
  const handleCancelGeneration = () => {
    if (streamCancelFn) {
      streamCancelFn();
      setIsGenerating(false);
      
      const currentText = chatResponseAccumulatorRef.current;
      setMessages(prev => [
        ...prev,
        { 
          id: `msg-${Date.now()}-bot-halted`, 
          role: 'assistant', 
          content: (currentText || "Generation cancelled by user.") + " *(Halted)*",
          sources: latestRetrievedChunks
        }
      ]);
      
      setCurrentResponse('');
      showToast("Generation stopped.", "info");
    }
  };

  // Quick Action triggers
  const triggerQuickAction = (actionType) => {
    let prompt = '';
    switch(actionType) {
      case 'summarize':
        prompt = "Summarize the following text by extracting key takeaways and action points:\n\n[Paste text here]";
        break;
      case 'grammar':
        prompt = "Review the following text for grammar, flow, and tone. Provide a corrected version and list the major edits:\n\n[Paste text here]";
        break;
      case 'code':
        prompt = "Scaffold a clean, reusable utility module in JavaScript or Python to solve this task: [Describe task]";
        break;
      case 'email':
        prompt = "Draft a professional, clear email addressing the following scenario. Keep it polite and actionable:\n\nScenario: [Describe scenario]";
        break;
      default:
        return;
    }
    setActiveTab('chat');
    setUserInput(prompt);
    showToast("Template loaded into prompt container.", "success");
  };

  // Text to Speech
  const speakResponse = (text) => {
    if (!window.speechSynthesis) {
      showToast("Speech synthesis is not supported on this browser.", "error");
      return;
    }
    
    // Cancel ongoing synthesis
    window.speechSynthesis.cancel();

    // Clean text from markdown markers for better speech synthesis
    const cleanText = text
      .replace(/\*\*|__/g, '')
      .replace(/\*|_/g, '')
      .replace(/`{3}[\s\S]*?`{3}/g, '[Code Block omitted]')
      .replace(/`.*?`/g, '')
      .replace(/#+\s+/g, '');

    const utterance = new CustomSpeechSynthesisUtterance(cleanText);
    utterance.onstart = () => setVoicePlaybackActive(true);
    utterance.onend = () => setVoicePlaybackActive(false);
    utterance.onerror = () => setVoicePlaybackActive(false);
    
    // Choose appropriate local voice
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Natural')) || voices.find(v => v.lang.startsWith('en'));
    if (englishVoice) {
      utterance.voice = englishVoice;
    }

    window.speechSynthesis.speak(utterance);
  };

  // Custom class fallback since inside React/window environment
  const CustomSpeechSynthesisUtterance = window.SpeechSynthesisUtterance || class {};

  const handleStopSpeaking = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setVoicePlaybackActive(false);
    }
  };

  // Start Speech Recognition
  const handleStartSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast("Speech Recognition is not supported on this browser.", "error");
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'en-US';

    rec.onstart = () => {
      setIsListening(true);
      setSpeechTranscript('Listening to your desk commands...');
    };

    rec.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setSpeechTranscript(transcript);
      showToast(`Captured speech: "${transcript}"`, "success");
      
      // Auto submit to chatbot
      setTimeout(() => {
        handleSendPrompt(null, transcript);
        setActiveTab('chat');
        setIsListening(false);
      }, 1000);
    };

    rec.onerror = (e) => {
      showToast(`Speech capture error: ${e.error}`, "error");
      setIsListening(false);
    };

    rec.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = rec;
    rec.start();
  };

  // Render HTML from simple Markdown formatting
  const renderMarkdown = (text) => {
    if (!text) return '';
    
    // Escape simple HTML characters
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Code blocks: ```js code ```
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
      return `<pre><div class="code-header">${lang || 'code'}</div><code>${code.trim()}</code></pre>`;
    });

    // Inline code: `code`
    html = html.replace(/`([^`\n]+)`/g, '<code>$1</code>');

    // Bold: **text**
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Italic: *text*
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Bullet points: * or -
    html = html.replace(/^\s*[\-\*]\s+(.+)$/gm, '<li>$1</li>');
    // Group adjacent lists
    html = html.replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>');
    html = html.replace(/<\/ul>\s*<ul>/g, ''); // Join lists

    // Headers: ###, ##, #
    html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');

    // Paragraph breaks
    html = html.replace(/\n\n/g, '<p></p>');
    
    return <div dangerouslySetInnerHTML={{ __html: html }} />;
  };

  // Local clock greetings
  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Good Morning, Developer';
    if (hr < 18) return 'Good Afternoon, Developer';
    return 'Good Evening, Developer';
  };

  // Copy text helper
  const copyToClipboard = (text, message = "Copied to clipboard.") => {
    navigator.clipboard.writeText(text);
    showToast(message, "success");
  };

  return (
    <div className="app-container">
      {/* Toast Notification Box */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>
            <div className="status-dot active" style={{
              backgroundColor: t.type === 'success' ? 'var(--accent-emerald)' : 
                               t.type === 'warning' ? 'var(--accent-orange)' : 
                               t.type === 'error' ? 'var(--accent-rose)' : 'var(--accent-color)'
            }}></div>
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {/* Side Bar Panel */}
      <aside className="sidebar glass-panel">
        <div className="sidebar-logo">
          <div className="logo-icon-wrapper">
            <Bot size={22} color="white" />
          </div>
          <span className="logo-text">SmartDesk AI</span>
          <span className="logo-version">v1.2</span>
        </div>

        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <Activity size={18} />
            Dashboard
          </button>
          
          <button 
            className={`nav-item ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            <Bot size={18} />
            AI Chat Hub
          </button>

          <button 
            className={`nav-item ${activeTab === 'rag' ? 'active' : ''}`}
            onClick={() => setActiveTab('rag')}
          >
            <Database size={18} />
            Local RAG Index
          </button>

          <button 
            className={`nav-item ${activeTab === 'voice' ? 'active' : ''}`}
            onClick={() => setActiveTab('voice')}
          >
            <Mic size={18} />
            Voice Control
          </button>

          <button 
            className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings size={18} />
            System Config
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="status-pill-card">
            <div className={`status-dot ${connectionStatus}`}></div>
            <div className="status-details">
              <span className="status-title">
                {connectionStatus === 'active' ? 'Ollama Server Active' : 
                 connectionStatus === 'sandbox' ? 'Sandbox Emulator' : 'Offline Mode'}
              </span>
              <span className="status-desc">
                {connectionStatus === 'active' ? selectedModel : 'Simulating SLM Local'}
              </span>
            </div>
            <button 
              className="card-action-btn" 
              onClick={handleReconnect}
              title="Test Connection"
              disabled={isTestingConn}
              style={{ marginLeft: 'auto' }}
            >
              <RefreshCw size={14} className={isTestingConn ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        
        {/* Dynamic Header */}
        <header className="header-row">
          <div className="header-info">
            <h1>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h1>
            <p>SmartDesk AI Local Operations Center</p>
          </div>

          {/* System Hardware Visualizer */}
          <div className="sys-visualizer">
            <div className="vis-item">
              <div className="vis-label">
                <span>LOCAL CPU</span>
                <span>{Math.round(cpuUsage)}%</span>
              </div>
              <div className="vis-track">
                <div className="vis-fill cpu" style={{ width: `${cpuUsage}%` }}></div>
              </div>
            </div>

            <div className="vis-item">
              <div className="vis-label">
                <span>LOCAL RAM</span>
                <span>{Math.round(ramUsage)}%</span>
              </div>
              <div className="vis-track">
                <div className="vis-fill ram" style={{ width: `${ramUsage}%` }}></div>
              </div>
            </div>

            <div className="vis-item">
              <div className="vis-label">
                <span>LOCAL NPU/GPU</span>
                <span>{Math.round(gpuUsage)}%</span>
              </div>
              <div className="vis-track">
                <div className="vis-fill gpu" style={{ width: `${gpuUsage}%` }}></div>
              </div>
            </div>
          </div>
        </header>

        {/* Tab Router Panels */}

        {/* 1. Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="dashboard-grid">
            
            {/* Banner Section */}
            <div className="dashboard-hero glass-panel">
              <div className="hero-text">
                <div className="hero-badge">
                  <Sparkles size={14} />
                  <span>Desktop SLM Power Node Active</span>
                </div>
                <h2>{getGreeting()}</h2>
                <p>
                  Welcome to your secure Local AI Assistant. Running small language models locally preserves data privacy, works offline, and requires zero subscription endpoints. Try uploading documents in the Local RAG, or speak commands.
                </p>
              </div>
              
              <div className="orb-container">
                <div className="ai-glowing-orb"></div>
              </div>
            </div>

            {/* Left Card: Quick Desk Accelerators */}
            <section className="dashboard-card glass-panel">
              <header className="card-header">
                <h3 className="card-title">
                  <Sparkles className="card-icon" size={18} />
                  Desk Smart Actions
                </h3>
              </header>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '-10px' }}>
                One-click prompt structures processed locally by your SLM.
              </p>

              <div className="actions-grid">
                <button className="action-btn" onClick={() => triggerQuickAction('summarize')}>
                  <div className="action-btn-icon">
                    <FileText size={16} />
                  </div>
                  <h4>Summarize Text</h4>
                  <p>Extract core concepts and checklist items</p>
                </button>

                <button className="action-btn" onClick={() => triggerQuickAction('grammar')}>
                  <div className="action-btn-icon">
                    <CheckSquare size={16} />
                  </div>
                  <h4>Refine Prose</h4>
                  <p>Check spelling, flow, and fix sentence structures</p>
                </button>

                <button className="action-btn" onClick={() => triggerQuickAction('code')}>
                  <div className="action-btn-icon">
                    <Bot size={16} />
                  </div>
                  <h4>Generate Code</h4>
                  <p>Scaffold algorithms and utilities directly</p>
                </button>

                <button className="action-btn" onClick={() => triggerQuickAction('email')}>
                  <div className="action-btn-icon">
                    <Send size={16} />
                  </div>
                  <h4>Draft Response</h4>
                  <p>Compose polite business replies</p>
                </button>
              </div>
            </section>

            {/* Right Card: Quick Desk Notes */}
            <section className="dashboard-card glass-panel">
              <header className="card-header">
                <h3 className="card-title">
                  <FileText className="card-icon" size={18} />
                  Desk Clipboard Notes
                </h3>
              </header>

              <form onSubmit={handleAddNote} className="note-input-wrapper">
                <input 
                  type="text" 
                  className="note-input"
                  placeholder="Record an idea or list an action item..." 
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                />
                <button type="submit" className="note-add-btn">
                  <Plus size={20} />
                </button>
              </form>

              <div className="notes-list">
                {notes.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '13px', padding: '20px' }}>
                    No items in desk clipboard.
                  </p>
                ) : (
                  notes.map(note => (
                    <div key={note.id} className="note-item">
                      <div className="note-content-wrapper">
                        <span className="note-text">{note.text}</span>
                        <span className="note-timestamp">{note.createdAt}</span>
                      </div>
                      <div className="note-item-actions">
                        <button 
                          className="note-opt-btn enhance" 
                          onClick={() => handleEnhanceNote(note.text)}
                          title="Improve Note with SLM"
                        >
                          <Sparkles size={14} />
                        </button>
                        <button 
                          className="note-opt-btn delete" 
                          onClick={() => handleDeleteNote(note.id)}
                          title="Delete Note"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

          </div>
        )}

        {/* 2. Chat Hub Tab */}
        {activeTab === 'chat' && (
          <div className="chat-grid">
            
            {/* Chat Box panel */}
            <div className="chat-box glass-panel">
              <div className="chat-messages">
                {messages.length === 0 ? (
                  <div className="chat-welcome">
                    <Bot size={40} color="var(--accent-color)" />
                    <h3>Start local chat session</h3>
                    <p>Enter queries below. If RAG index is enabled, context will automatically inject.</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className={`chat-bubble ${msg.role}`}>
                      <div className="bubble-avatar">
                        {msg.role === 'user' ? 'U' : 'AI'}
                      </div>
                      <div className="bubble-content">
                        {renderMarkdown(msg.content)}
                        
                        {/* RAG sources indicator */}
                        {msg.sources && msg.sources.length > 0 && (
                          <div className="sources-toggle-box">
                            <details>
                              <summary className="sources-btn">
                                <Database size={10} />
                                View Local Retrieved Sources ({msg.sources.length})
                              </summary>
                              <div className="sources-list-block">
                                {msg.sources.map((s, idx) => (
                                  <div key={idx} className="source-item-ref">
                                    <div className="source-title-ref"># {s.documentName} (Score: {s.score})</div>
                                    <div className="source-text-ref">"...{s.text.slice(0, 160)}..."</div>
                                  </div>
                                ))}
                              </div>
                            </details>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}

                {/* Live stream bubble during generation */}
                {isGenerating && activeStreamResponse && (
                  <div className="chat-bubble assistant">
                    <div className="bubble-avatar">AI</div>
                    <div className="bubble-content">
                      {renderMarkdown(activeStreamResponse)}
                      <div className="metadata-badge" style={{ marginTop: '8px' }}>
                        <Activity size={10} className="animate-pulse" />
                        Generating streaming tokens...
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Stats Bar */}
              {generationStats && !isGenerating && (
                <div style={{
                  padding: '4px 24px', 
                  borderTop: '1px solid var(--border-glass)', 
                  fontSize: '11px', 
                  color: 'var(--text-muted)',
                  display: 'flex',
                  gap: '16px'
                }}>
                  <span>Time: <strong>{generationStats.timeSeconds}s</strong></span>
                  <span>Tokens: <strong>{generationStats.tokens}</strong></span>
                  <span>Eval Speed: <strong>{generationStats.speed} tok/s</strong></span>
                </div>
              )}

              {/* Chat Form */}
              <div className="chat-input-area">
                <form className="chat-input-form" onSubmit={handleSendPrompt}>
                  <textarea 
                    className="chat-textarea"
                    placeholder={isGenerating ? "Model computing..." : "Message your local SLM..."}
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendPrompt();
                      }
                    }}
                    disabled={isGenerating}
                  />
                  <div className="input-actions-absolute">
                    {isGenerating ? (
                      <button 
                        type="button" 
                        className="input-action-btn"
                        onClick={handleCancelGeneration}
                        title="Cancel generation"
                        style={{ color: 'var(--accent-rose)' }}
                      >
                        <X size={18} />
                      </button>
                    ) : (
                      <>
                        <button 
                          type="button" 
                          className={`input-action-btn ${speechSynthesisEnabled ? 'active' : ''}`}
                          onClick={() => setSpeechSynthesisEnabled(!speechSynthesisEnabled)}
                          title={speechSynthesisEnabled ? "Disable Read Aloud" : "Enable Read Aloud"}
                        >
                          {speechSynthesisEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                        </button>
                        {voicePlaybackActive && (
                          <button 
                            type="button" 
                            className="input-action-btn"
                            onClick={handleStopSpeaking}
                            title="Stop speaking"
                            style={{ color: 'var(--accent-orange)' }}
                          >
                            <VolumeX size={16} />
                          </button>
                        )}
                      </>
                    )}
                    <button 
                      type="submit" 
                      className="chat-send-btn" 
                      disabled={!userInput.trim() || isGenerating}
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Chat Control Sidebar */}
            <div className="chat-config-panel">
              
              {/* RAG Toggle status */}
              <div className="rag-status-banner">
                <div className="rag-status-banner-info">
                  <Database size={16} color="var(--accent-color)" />
                  <div>
                    <h4>Local RAG Ingestion</h4>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      {documents.length} document(s) active
                    </span>
                  </div>
                </div>
                <label className="rag-toggle-switch">
                  <input 
                    type="checkbox" 
                    className="switch-input"
                    checked={ragEnabled}
                    onChange={(e) => setRagEnabled(e.target.checked)}
                    disabled={documents.length === 0}
                  />
                  <span className="switch-slider"></span>
                </label>
              </div>

              {/* SLM Model Parameter Settings */}
              <div className="dashboard-card glass-panel" style={{ padding: '20px' }}>
                <h4 style={{ fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  <Sliders size={16} color="var(--accent-color)" />
                  Generation Parameters
                </h4>

                <div className="config-group" style={{ marginBottom: '14px' }}>
                  <label>Selected LLM Node</label>
                  <select 
                    className="config-select" 
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                  >
                    <option value="sandbox">Sandbox Emulation Model</option>
                    {availableModels.map(m => (
                      <option key={m.name} value={m.name}>{m.name}</option>
                    ))}
                  </select>
                </div>

                <div className="config-group" style={{ marginBottom: '14px' }}>
                  <label>System Directive</label>
                  <textarea 
                    className="config-textarea" 
                    placeholder="System prompt instructions..."
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                  />
                </div>

                <div className="config-group">
                  <label>Temperature (Creativity)</label>
                  <div className="slider-wrapper">
                    <input 
                      type="range" 
                      min="0.1" 
                      max="1.5" 
                      step="0.05"
                      className="range-slider"
                      value={temperature}
                      onChange={(e) => setTemperature(e.target.value)}
                    />
                    <span className="slider-val">{temperature}</span>
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* 3. Local RAG / Knowledge Base Tab */}
        {activeTab === 'rag' && (
          <div className="rag-layout">
            
            {/* Left Column: Document Upload & Index Status */}
            <div className="dashboard-card glass-panel">
              <header className="card-header">
                <h3 className="card-title">
                  <Database className="card-icon" size={18} />
                  Ingest Local Knowledge
                </h3>
              </header>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '-10px' }}>
                Drop files below. Contents are split and stored solely in memory for private RAG context retrieval.
              </p>

              <label className="rag-dropzone">
                <input 
                  type="file" 
                  multiple 
                  accept=".txt,.md,.json,.js,.py,.css" 
                  style={{ display: 'none' }} 
                  onChange={handleFileUpload}
                />
                <FilePlus2 className="dropzone-icon" size={36} />
                <h3>Click or drag workspace files here</h3>
                <p>Accepts .txt, .md, .json, .py, etc. (Max 5MB per file)</p>
              </label>

              <div>
                <h4 style={{ fontSize: '14px', marginBottom: '8px' }}>Indexed Repositories ({documents.length})</h4>
                <div className="doc-list">
                  {documents.length === 0 ? (
                    <p style={{ fontSize: '13px', color: 'var(--text-dim)', textAlign: 'center', padding: '20px' }}>
                      No documents loaded. Load file to test local indexing.
                    </p>
                  ) : (
                    documents.map(doc => (
                      <div key={doc.name} className="doc-item">
                        <FileCheck size={20} color="var(--accent-emerald)" />
                        <div className="doc-info">
                          <h5 className="doc-title">{doc.name}</h5>
                          <div className="doc-meta">
                            <span>{doc.size}</span>
                            <span>{doc.chunksCount} chunks indexed</span>
                          </div>
                        </div>
                        <button 
                          className="doc-remove-btn" 
                          onClick={() => handleRemoveDoc(doc.name)}
                          title="Remove document index"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Search Simulator */}
            <div className="dashboard-card glass-panel">
              <header className="card-header">
                <h3 className="card-title">
                  <Search className="card-icon" size={18} />
                  Local Index Vector Inspector
                </h3>
              </header>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '-10px' }}>
                Test the query similarity matcher and inspect matched chunks before feeding them to the LLM context window.
              </p>

              <div className="note-input-wrapper">
                <input 
                  type="text" 
                  className="note-input"
                  placeholder="Enter keyword search or semantic question..."
                  value={ragSearchQuery}
                  onChange={(e) => handleRagSearch(e.target.value)}
                  disabled={documents.length === 0}
                />
                <button className="note-add-btn" disabled={documents.length === 0}>
                  <Search size={18} />
                </button>
              </div>

              <div className="rag-search-results" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
                <h4 style={{ fontSize: '13px' }}>Matching Context Chunks ({ragSearchResults.length})</h4>
                
                {ragSearchResults.length === 0 ? (
                  <p style={{ fontSize: '13px', color: 'var(--text-dim)', textAlign: 'center', padding: '40px' }}>
                    {documents.length === 0 
                      ? "Index documents first to run vector inspection." 
                      : ragSearchQuery.trim() === '' 
                        ? "Enter search terms above to test score rankings." 
                        : "No matching chunks found."}
                  </p>
                ) : (
                  ragSearchResults.map((res, index) => (
                    <div key={res.id} style={{
                      background: 'rgba(0,0,0,0.2)',
                      border: '1px solid var(--border-glass)',
                      borderRadius: '8px',
                      padding: '12px',
                      fontSize: '12px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'between', marginBottom: '6px', color: 'var(--accent-cyan)' }}>
                        <strong>{index + 1}. Source: {res.documentName}</strong>
                        <span style={{ marginLeft: 'auto', fontFamily: 'monospace' }}>Match: {res.score}</span>
                      </div>
                      <p style={{ fontStyle: 'italic', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                        "...{res.text}..."
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}

        {/* 4. Voice Tab */}
        {activeTab === 'voice' && (
          <div className="dashboard-card glass-panel" style={{ maxWidth: '700px', margin: '0 auto', width: '100%' }}>
            
            <div className="voice-layout">
              <div>
                <h2>Desk Voice Ingestion Node</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '6px' }}>
                  Speak commands directly to your local SLM. Responses are parsed and read back instantly.
                </p>
              </div>

              {/* Glowing Waveform Visualizer */}
              <div className={`voice-waveform-container ${isListening ? 'listening' : ''}`}>
                <div className="waveform-bar" style={{ height: isListening ? '60px' : '10px' }}></div>
                <div className="waveform-bar" style={{ height: isListening ? '40px' : '10px' }}></div>
                <div className="waveform-bar" style={{ height: isListening ? '85px' : '10px' }}></div>
                <div className="waveform-bar" style={{ height: isListening ? '25px' : '10px' }}></div>
                <div className="waveform-bar" style={{ height: isListening ? '90px' : '10px' }}></div>
                <div className="waveform-bar" style={{ height: isListening ? '70px' : '10px' }}></div>
                <div className="waveform-bar" style={{ height: isListening ? '50px' : '10px' }}></div>
                <div className="waveform-bar" style={{ height: isListening ? '95px' : '10px' }}></div>
                <div className="waveform-bar" style={{ height: isListening ? '30px' : '10px' }}></div>
                <div className="waveform-bar" style={{ height: isListening ? '65px' : '10px' }}></div>
              </div>

              {/* Transcript Display Box */}
              <div className="voice-bubble-transcript">
                {speechTranscript ? (
                  <p style={{ color: 'var(--text-main)', fontWeight: 500 }}>{speechTranscript}</p>
                ) : (
                  <p style={{ color: 'var(--text-dim)' }}>Click microphone ring to start dictating local prompts...</p>
                )}
              </div>

              {/* Large Glow Mic Ring Button */}
              <button 
                className={`voice-btn-ring ${isListening ? 'active' : ''}`}
                onClick={handleStartSpeechRecognition}
              >
                {isListening ? <MicOff size={32} /> : <Mic size={32} />}
              </button>

              <div className="voice-instruction">
                <span style={{ display: 'block', marginBottom: '4px' }}><strong>Tip</strong>: Speech API transcribes offline; output routes directly to Chat Hub.</span>
                <span>Ensure browser microphone permissions are enabled.</span>
              </div>
            </div>

          </div>
        )}

        {/* 5. System Settings Tab */}
        {activeTab === 'settings' && (
          <div className="settings-grid">
            
            {/* Left Settings Card: Local Server Configuration */}
            <div className="dashboard-card glass-panel settings-card">
              <header className="card-header">
                <h3 className="card-title">
                  <Network className="card-icon" size={18} />
                  Local Endpoint Routing
                </h3>
              </header>

              <div className="config-group">
                <label>Ollama Server Endpoint URL</label>
                <input 
                  type="text" 
                  className="note-input" 
                  value={ollamaUrl} 
                  onChange={(e) => {
                    setOllamaUrl(e.target.value);
                    localStorage.setItem('smartdesk-ollama-url', e.target.value);
                  }}
                  placeholder="http://localhost:11434"
                />
                <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                  Default is port 11434. Requires Ollama daemon with model running.
                </span>
              </div>

              <div className="config-group" style={{ marginTop: '10px' }}>
                <button 
                  className="note-add-btn" 
                  style={{ width: 'auto', padding: '0 20px', display: 'flex', gap: '8px' }}
                  onClick={() => checkConnection(ollamaUrl)}
                  disabled={isTestingConn}
                >
                  <RefreshCw size={14} className={isTestingConn ? 'animate-spin' : ''} />
                  Verify Ollama Connection
                </button>
              </div>

              <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-glass)', paddingTop: '20px' }}>
                <h4 style={{ fontSize: '13px', marginBottom: '8px', color: 'var(--text-muted)' }}>Quick Setup Guide</h4>
                <ol style={{ fontSize: '12px', color: 'var(--text-dim)', paddingLeft: '16px', lineHeight: '1.6' }}>
                  <li>Download and install Ollama from <a href="https://ollama.com" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-color)', textDecoration: 'none' }}>ollama.com <ExternalLink size={10} /></a></li>
                  <li>Open terminal and pull a lightweight model: <code>ollama run phi3:mini</code></li>
                  <li>Enable CORS on Ollama if calling from browser if required (default usually works on localhost).</li>
                  <li>Click 'Verify Connection' above to sync workspace!</li>
                </ol>
              </div>
            </div>

            {/* Right Settings Card: Interface Customizer */}
            <div className="dashboard-card glass-panel settings-card">
              <header className="card-header">
                <h3 className="card-title">
                  <Sliders className="card-icon" size={18} />
                  SmartDesk Interface Options
                </h3>
              </header>

              <div className="config-group">
                <label>Active Desk Core Accent</label>
                <div className="theme-picker-grid">
                  <div 
                    className={`theme-opt ${theme === 'purple' ? 'active' : ''}`}
                    onClick={() => setTheme('purple')}
                  >
                    <div className="theme-dot purple"></div>
                    <span className="theme-label">Indigo</span>
                  </div>

                  <div 
                    className={`theme-opt ${theme === 'cyan' ? 'active' : ''}`}
                    onClick={() => setTheme('cyan')}
                  >
                    <div className="theme-dot cyan"></div>
                    <span className="theme-label">Cyan</span>
                  </div>

                  <div 
                    className={`theme-opt ${theme === 'emerald' ? 'active' : ''}`}
                    onClick={() => setTheme('emerald')}
                  >
                    <div className="theme-dot emerald"></div>
                    <span className="theme-label">Emerald</span>
                  </div>

                  <div 
                    className={`theme-opt ${theme === 'rose' ? 'active' : ''}`}
                    onClick={() => setTheme('rose')}
                  >
                    <div className="theme-dot rose"></div>
                    <span className="theme-label">Rose</span>
                  </div>

                  <div 
                    className={`theme-opt ${theme === 'orange' ? 'active' : ''}`}
                    onClick={() => setTheme('orange')}
                  >
                    <div className="theme-dot orange"></div>
                    <span className="theme-label">Amber</span>
                  </div>
                </div>
              </div>

              <div className="config-group" style={{ marginTop: '10px' }}>
                <label>Glow Shadows & Aura Effects</label>
                <label className="rag-toggle-switch" style={{ marginTop: '4px' }}>
                  <input 
                    type="checkbox" 
                    className="switch-input"
                    checked={glowEffects}
                    onChange={(e) => {
                      setGlowEffects(e.target.checked);
                      document.body.style.setProperty('--shadow-glow', e.target.checked ? '0 0 25px var(--accent-glow)' : 'none');
                    }}
                  />
                  <span className="switch-slider"></span>
                </label>
              </div>

              <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-glass)', paddingTop: '20px' }}>
                <h4 style={{ fontSize: '13px', marginBottom: '8px', color: 'var(--text-muted)' }}>Workspace In-Memory Cleanups</h4>
                <button 
                  className="note-add-btn" 
                  style={{
                    width: 'auto',
                    padding: '0 20px', 
                    background: 'transparent', 
                    border: '1px solid var(--accent-rose)',
                    color: 'var(--accent-rose)',
                    boxShadow: 'none',
                    marginTop: '8px'
                  }}
                  onClick={() => {
                    setMessages(INITIAL_MESSAGES);
                    setNotes([]);
                    setDocuments([]);
                    setLatestRetrievedChunks([]);
                    vectorSearchRef.current.clear();
                    showToast("Workspace wiped completely.", "success");
                  }}
                >
                  Wipe All Sessions & Indexes
                </button>
              </div>
            </div>

          </div>
        )}

      </main>
    </div>
  );
}
