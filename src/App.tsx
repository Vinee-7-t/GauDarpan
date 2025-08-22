import React, { useState, useRef } from 'react';
import { 
  Menu, 
  X, 
  ChevronDown, 
  ChevronRight,
  Eye, 
  Zap, 
  Heart, 
  Activity, 
  Stethoscope,
  Upload,
  Camera,
  Loader,
  ArrowLeft,
  CheckCircle,
  HelpCircle,
  Info,
  Send,
  MessageCircle,
  Bot
} from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';

type ModelType = 'eye' | 'skin' | 'udder' | 'hoof' | 'mouth';
declare global {
  interface Window {
    tmImage: any;
  }
}

type ViewType = 'home' | 'models' | 'faq' | 'about' | 'chatbot' | ModelType;

interface PredictionResult {
  class: string;
  probability: number;
}

interface Model {
  id: ModelType;
  name: string;
  icon: any;
  color: string;
  modelUrl: string;
}

interface FAQItem {
  question: string;
  answer: string;
}

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface DiseaseRecommendation {
  condition: string;
  recommendation: string;
}

const diseaseRecommendations: { [key: string]: DiseaseRecommendation } = {
  'Healthy': {
    condition: 'Healthy',
    recommendation: 'Continue regular monitoring and maintain current care practices.'
  },
  'Pink Eye': {
    condition: 'Pink Eye',
    recommendation: 'Isolate animal, protect from sunlight, and consult vet for antibiotics. Control flies and keep area clean.'
  },
  'Mastitis': {
    condition: 'Mastitis', 
    recommendation: 'Frequent milking, maintain hygiene, use teat dips. Seek immediate vet care and monitor milk quality.'
  },
  'Abscess': {
    condition: 'Abscess',
    recommendation: 'Do not drain yourself. Apply warm compresses and contact vet immediately for treatment.'
  },
  'Foot Rot': {
    condition: 'Foot Rot',
    recommendation: 'Keep area clean and dry, use medicated footbath. Consult vet for antibiotics and consider trimming.'
  },
  'Digital Dermatitis': {
    condition: 'Digital Dermatitis',
    recommendation: 'Clean affected area, apply antibacterial treatment, and use regular footbaths. Improve housing hygiene.'
  },
  'Skin Disease': {
    condition: 'Skin Disease',
    recommendation: 'Isolate animal, maintain hygiene, use prescribed medications. Monitor and improve sanitation.'
  },
  'Mouth Ulcer': {
    condition: 'Mouth Ulcer',
    recommendation: 'Provide soft feed, maintain oral hygiene, and use prescribed medications. Monitor eating habits.'
  }
};

const models = [
  { 
    id: 'eye' as ModelType, 
    name: 'Eye Health', 
    icon: Eye, 
    color: 'from-green-400 to-green-600',
    modelUrl: 'https://teachablemachine.withgoogle.com/models/Qn4755HIU/'
  },
  { 
    id: 'skin' as ModelType, 
    name: 'Skin Condition', 
    icon: Zap, 
    color: 'from-green-500 to-green-700',
    modelUrl: 'https://teachablemachine.withgoogle.com/models/z4OZWyQTH/'
  },
  { 
    id: 'udder' as ModelType, 
    name: 'Udder Health', 
    icon: Heart, 
    color: 'from-emerald-400 to-emerald-600',
    modelUrl: 'https://teachablemachine.withgoogle.com/models/t8IGWZdWX/'
  },
  { 
    id: 'hoof' as ModelType, 
    name: 'Hoof Analysis', 
    icon: Activity, 
    color: 'from-lime-400 to-lime-600',
    modelUrl: 'https://teachablemachine.withgoogle.com/models/homJBTtpI/'
  },
  { 
    id: 'mouth' as ModelType, 
    name: 'Mouth Health', 
    icon: Stethoscope, 
    color: 'from-teal-400 to-teal-600',
    modelUrl: 'https://teachablemachine.withgoogle.com/models/vU89gfbAD/'
  }
];

const faqData: FAQItem[] = [
  {
    question: "What is GauDarpan?",
    answer: "GauDarpan is an AI-powered platform that helps monitor the health of cows by detecting diseases in key areas such as eyes, skin, udder, hooves, and mouth."
  },
  {
    question: "How does GauDarpan detect diseases?",
    answer: "It uses Teachable Machine-trained AI models that analyze images of a cow's body parts and provide accurate results along with actionable insights."
  },
  {
    question: "Who can use GauDarpan?",
    answer: "Farmers, cattle owners, dairy operators, and veterinary professionals can use GauDarpan to monitor cow health easily."
  },
  {
    question: "What kind of diseases can GauDarpan detect?",
    answer: "GauDarpan can detect conditions like eye infections, mastitis, lameness, foot rot, skin diseases (e.g., ringworm), and other common health issues in cows."
  },
  {
    question: "Do I need any special equipment?",
    answer: "No. You only need a smartphone or camera to take clear images of your cow's body parts and upload them to the platform."
  },
  {
    question: "Is GauDarpan reliable?",
    answer: "Yes. Our AI models are trained on extensive datasets to provide accurate predictions. However, it is recommended to consult a veterinarian for final diagnosis and treatment."
  },
  {
    question: "Can I track the health of my cows over time?",
    answer: "Currently, GauDarpan provides instant analysis per upload. Future updates aim to include health tracking and monitoring dashboards."
  },
  {
    question: "Is GauDarpan free to use?",
    answer: "The current web platform is accessible to all users. Any premium features or advanced analytics will be announced on the website when available."
  },
  {
    question: "How quickly will I get the results?",
    answer: "Results are generated instantly after uploading the image, giving you quick insights into your cow's health."
  },
  {
    question: "Where can I get support if I face issues?",
    answer: "You can contact our support team through the contact form on the website, and we'll assist you promptly."
  }
];

// Initialize Gemini AI (you'll need to add your API key)
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || 'your-api-key-here');

function App() {
  const [currentView, setCurrentView] = useState<ViewType>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [modelsDropdownOpen, setModelsDropdownOpen] = useState(false);
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [predicting, setPredicting] = useState(false);
  const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isAIResponding, setIsAIResponding] = useState(false);
  const [detectedDisease, setDetectedDisease] = useState<string>('');
  const [currentModelType, setCurrentModelType] = useState<ModelType | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modelsRef = useRef(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of chat
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Sleep function for exponential backoff
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // API call with exponential backoff
  const callGeminiWithBackoff = async (prompt: string, maxRetries = 3): Promise<string> => {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
      } catch (error) {
        console.error(`Attempt ${attempt + 1} failed:`, error);
        if (attempt === maxRetries - 1) {
          throw error;
        }
        // Exponential backoff: wait 2^attempt seconds
        await sleep(Math.pow(2, attempt) * 1000);
      }
    }
    throw new Error('Max retries exceeded');
  };

  // Send message to AI
  const sendMessageToAI = async (message: string, isInitial = false) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: message,
      isUser: true,
      timestamp: new Date()
    };

    if (!isInitial) {
      setChatMessages(prev => [...prev, userMessage]);
    }
    setIsAIResponding(true);
    setChatInput('');

    try {
      let prompt = message;
      if (isInitial && detectedDisease && currentModelType) {
        prompt = `You are a cattle health AI assistant. List 3 immediate actions for ${detectedDisease} in cow's ${currentModelType}. No markdown formatting, asterisks or bullet points. Number the points 1, 2, 3. Keep each point to one line.`;
      } else {
        prompt = `You are a cattle health AI assistant. Give a clear, short answer in 2-3 lines without any special formatting: ${message}`;
      }

      const aiResponse = await callGeminiWithBackoff(prompt);
      
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: aiResponse,
        isUser: false,
        timestamp: new Date()
      };

      setChatMessages(prev => isInitial ? [userMessage, aiMessage] : [...prev, aiMessage]);
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: "I'm sorry, I'm having trouble connecting right now. Please try again later or consult with a veterinarian for immediate assistance.",
        isUser: false,
        timestamp: new Date()
      };
      setChatMessages(prev => isInitial ? [userMessage, errorMessage] : [...prev, errorMessage]);
    } finally {
      setIsAIResponding(false);
      setTimeout(scrollToBottom, 100);
    }
  };

  // Handle chat form submission
  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim() && !isAIResponding) {
      sendMessageToAI(chatInput.trim());
    }
  };

  // Navigate to chatbot with disease context
  const navigateToChatbot = (disease: string, modelType: ModelType) => {
    console.log('Navigating to chatbot with:', disease, modelType);
    setDetectedDisease(disease);
    setCurrentModelType(modelType);
    setChatMessages([]);
    setCurrentView('chatbot');
    // Send initial message after a short delay to ensure state is updated
    setTimeout(() => {
      sendMessageToAI(`What are the immediate actions needed for treating ${disease} in a cow's ${modelType}?`, true);
    }, 500);
  };

  const CowLogo = () => (
  <svg
    viewBox="0 0 100 100"
    className="w-32 h-32 text-green-600" // ⬅️ controls size
  >
    {/* Cow head shape */}
    <ellipse cx="50" cy="55" rx="35" ry="30" fill="currentColor" opacity="0.9"/>
    
    {/* Ears */}
    <ellipse cx="25" cy="35" rx="8" ry="15" fill="currentColor" opacity="0.8"/>
    <ellipse cx="75" cy="35" rx="8" ry="15" fill="currentColor" opacity="0.8"/>
    
    {/* Eyes */}
    <circle cx="40" cy="45" r="4" fill="white"/>
    <circle cx="60" cy="45" r="4" fill="white"/>
    <circle cx="40" cy="45" r="2" fill="black"/>
    <circle cx="60" cy="45" r="2" fill="black"/>
    
    {/* Nose */}
    <ellipse cx="50" cy="65" rx="8" ry="6" fill="white" opacity="0.9"/>
    <ellipse cx="47" cy="63" rx="2" ry="1.5" fill="black"/>
    <ellipse cx="53" cy="63" rx="2" ry="1.5" fill="black"/>
    
    {/* Spots */}
    <circle cx="35" cy="50" r="3" fill="white" opacity="0.7"/>
    <circle cx="65" cy="55" r="4" fill="white" opacity="0.7"/>
    <circle cx="45" cy="70" r="2" fill="white" opacity="0.7"/>
  </svg>
);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log('File selected:', file.name, 'Size:', file.size, 'Type:', file.type);
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      setSelectedImage(file);
      const reader = new FileReader();
      
      reader.onload = (e) => {
        console.log('Image loaded successfully');
        const dataUrl = e.target?.result as string;
        setImagePreview(dataUrl);
      };
      
      reader.onerror = (error) => {
        console.error('Error reading file:', error);
        alert('Error loading image. Please try again.');
      };
      
      reader.readAsDataURL(file);
      setPredictionResult(null);
    }
  };

  const handlePredict = async () => {
    if (!selectedImage || !currentModelType) {
      alert('Please select an image and ensure you are in a specific model view.');
      return;
    }
    
    setPredicting(true);
    let loadedModel: any = null;

    try {
      const selectedModel = models.find(m => m.id === currentModelType);
      if (!selectedModel) throw new Error('Model not found');

      // Load the model
      const modelURL = `${selectedModel.modelUrl}model.json`;
      const metadataURL = `${selectedModel.modelUrl}metadata.json`;
      
      console.log('Starting model loading from:', modelURL);
      
      try {
        // Initialize model with specific version
        loadedModel = await window.tmImage.load(modelURL, metadataURL);
        console.log('Model loaded successfully');
      } catch (modelError) {
        console.error('Error loading model:', modelError);
        throw new Error(`Failed to load model: ${modelError.message}`);
      }

      // Create a new image element for prediction
      const imageElement = new Image();
      imageElement.crossOrigin = 'anonymous';
      
      // Convert File to data URL if it's a file input
      const reader = new FileReader();
      
      const imageData = await new Promise<string>((resolve, reject) => {
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(selectedImage);
      });

      console.log('Image converted to data URL');
      
      // Load image
      await new Promise<void>((resolve, reject) => {
        imageElement.onload = () => resolve();
        imageElement.onerror = (e) => reject(e);
        imageElement.src = imageData;
      });

      console.log('Image loaded successfully');

      // Create a canvas with the actual image dimensions first
      const canvas = document.createElement('canvas');
      canvas.width = imageElement.naturalWidth;
      canvas.height = imageElement.naturalHeight;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) throw new Error('Could not get canvas context');
      
      // Draw original image to canvas
      ctx.drawImage(imageElement, 0, 0);
      
      // Create a second canvas for the resized image
      const resizedCanvas = document.createElement('canvas');
      resizedCanvas.width = 224;
      resizedCanvas.height = 224;
      const resizedCtx = resizedCanvas.getContext('2d');
      
      if (!resizedCtx) throw new Error('Could not get resized canvas context');
      
      // Draw resized image maintaining aspect ratio
      resizedCtx.drawImage(canvas, 0, 0, 224, 224);

      console.log('Image preprocessed successfully');
      console.log('Running prediction...');
      
      // Run prediction on the resized canvas
      const predictions = await loadedModel.predict(resizedCanvas);
      console.log('Raw predictions:', predictions);

      if (!Array.isArray(predictions) || predictions.length === 0) {
        throw new Error('Invalid prediction results');
      }

      // Get the highest probability prediction
      const highestPrediction = predictions.reduce((prev, current) => 
        (current.probability > prev.probability) ? current : prev
      );

      console.log('Highest prediction:', highestPrediction);
      setPredictionResult({
        class: highestPrediction.className,
        probability: highestPrediction.probability
      });
    } catch (error: any) {
      console.error('Detailed error:', error);
      let errorMessage = 'Error analyzing image. ';
      
      if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
        errorMessage += 'There was a network error. Please check your internet connection.';
      } else if (error.message?.includes('load model')) {
        errorMessage += 'Failed to load the AI model. Please try again or contact support.';
      } else if (error.message?.includes('Invalid prediction')) {
        errorMessage += 'The model could not analyze this image. Please try a different image.';
      } else {
        errorMessage += error.message || 'Please try again.';
      }
      
      alert(errorMessage);
      setPredictionResult(null);
    } finally {
      setPredicting(false);
      // Clean up
      if (loadedModel) {
        try {
          await loadedModel.dispose();
        } catch (e) {
          console.error('Error disposing model:', e);
        }
      }
    }
  };

  const scrollToModels = () => {
    setCurrentView('models');
    modelsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const resetModelState = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setPredictionResult(null);
    setPredicting(false);
  };

  const handleViewChange = (view: ViewType) => {
    resetModelState();
    setCurrentView(view);
    setMobileMenuOpen(false);
    setModelsDropdownOpen(false);
    
    // Set currentModelType when viewing a specific model
    if (models.some(model => model.id === view)) {
      setCurrentModelType(view as ModelType);
    } else {
      setCurrentModelType(null);
    }
  };

  const toggleFAQ = (index: number) => {
    setExpandedFAQ(expandedFAQ === index ? null : index);
  };

  const renderNavbar = () => (
    <nav className="sticky top-0 z-50 bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div 
            className="flex items-center cursor-pointer group"
            onClick={() => handleViewChange('home')}
          >
            <img 
              src="/Screenshot 2025-08-21 061557.png" 
              alt="GauDarpan Logo" 
              className="h-8 w-8 mr-3 group-hover:scale-110 transition-transform duration-300"
            />
            <span className="text-xl font-bold text-gray-800 group-hover:text-green-700 transition-colors">
              GauDarpan
            </span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <button
              onClick={() => handleViewChange('home')}
              className={`relative text-gray-700 hover:text-green-600 transition-colors font-medium group ${
                currentView === 'home' ? 'text-green-600' : ''
              }`}
            >
              Home
              <span className={`absolute bottom-0 left-0 w-full h-0.5 bg-green-600 transform origin-left transition-transform duration-300 ${
                currentView === 'home' ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
              }`} />
            </button>
            
            <div className="relative">
              <button
                onClick={() => setModelsDropdownOpen(!modelsDropdownOpen)}
                className={`relative flex items-center text-gray-700 hover:text-green-600 transition-colors font-medium group ${
                  ['models', 'eye', 'skin', 'udder', 'hoof', 'mouth'].includes(currentView) ? 'text-green-600' : ''
                }`}
              >
                Models
                <ChevronDown className="ml-1 h-4 w-4" />
                <span className={`absolute bottom-0 left-0 w-full h-0.5 bg-green-600 transform origin-left transition-transform duration-300 ${
                  ['models', 'eye', 'skin', 'udder', 'hoof', 'mouth'].includes(currentView) ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                }`} />
              </button>
              
              {modelsDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2">
                  <button
                    onClick={() => handleViewChange('models')}
                    className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-green-50 hover:text-green-600 transition-colors"
                  >
                    All Models
                  </button>
                  {models.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => handleViewChange(model.id)}
                      className="flex items-center w-full text-left px-4 py-2 text-gray-700 hover:bg-green-50 hover:text-green-600 transition-colors"
                    >
                      <model.icon className="h-4 w-4 mr-2" />
                      {model.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => handleViewChange('about')}
              className={`relative text-gray-700 hover:text-green-600 transition-colors font-medium group ${
                currentView === 'about' ? 'text-green-600' : ''
              }`}
            >
              About
              <span className={`absolute bottom-0 left-0 w-full h-0.5 bg-green-600 transform origin-left transition-transform duration-300 ${
                currentView === 'about' ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
              }`} />
            </button>
            
            <button
              onClick={() => handleViewChange('faq')}
              className={`relative text-gray-700 hover:text-green-600 transition-colors font-medium group ${
                currentView === 'faq' ? 'text-green-600' : ''
              }`}
            >
              FAQ
              <span className={`absolute bottom-0 left-0 w-full h-0.5 bg-green-600 transform origin-left transition-transform duration-300 ${
                currentView === 'faq' ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
              }`} />
            </button>
            
            <button className="relative text-gray-700 hover:text-green-600 transition-colors font-medium group">
              Contact
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-green-600 transform origin-left transition-transform duration-300 scale-x-0 group-hover:scale-x-100" />
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-gray-700 hover:text-green-600 transition-colors"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4">
            <div className="flex flex-col space-y-4">
              <button
                onClick={() => handleViewChange('home')}
                className="text-left text-gray-700 hover:text-green-600 transition-colors font-medium"
              >
                Home
              </button>
              <button
                onClick={() => handleViewChange('models')}
                className="text-left text-gray-700 hover:text-green-600 transition-colors font-medium"
              >
                All Models
              </button>
              {models.map((model) => (
                <button
                  key={model.id}
                  onClick={() => handleViewChange(model.id)}
                  className="flex items-center text-left text-gray-700 hover:text-green-600 transition-colors pl-4"
                >
                  <model.icon className="h-4 w-4 mr-2" />
                  {model.name}
                </button>
              ))}
              <button
                onClick={() => handleViewChange('about')}
                className="text-left text-gray-700 hover:text-green-600 transition-colors font-medium"
              >
                About
              </button>
              <button
                onClick={() => handleViewChange('faq')}
                className="text-left text-gray-700 hover:text-green-600 transition-colors font-medium"
              >
                FAQ
              </button>
              <button className="text-left text-gray-700 hover:text-green-600 transition-colors font-medium">
                Contact
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );

  const renderHeroSection = () => (
    <div className="relative min-h-screen flex items-center justify-center">
      {/* Background with overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url('/daniel-quiceno-m-4MQtWCxUrYc-unsplash.jpg')`,
          filter: 'blur(1px)'
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white opacity-60" />
      
      {/* Content */}
      <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8 max-w-4xl">
        <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight">
          GauDarpan
        </h1>
        <p className="text-xl md:text-2xl text-gray-100 mb-8 font-light">
          The Mirror to Your Cow's Health
        </p>
        <button
          onClick={scrollToModels}
          className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-full text-lg font-semibold transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
        >
          Get Started
        </button>
      </div>
    </div>
  );

  const renderModelsOverview = () => (
    <div ref={modelsRef} className="min-h-screen bg-gradient-to-br from-green-50 to-white py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
            AI-Powered Cow Health Analysis
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Select a category below to upload images and get insights into your cow's well-being.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {models.map((model, index) => (
            <div
              key={model.id}
              className="group cursor-pointer transform hover:scale-105 transition-all duration-300"
              onClick={() => handleViewChange(model.id)}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-8 h-full border border-green-100 group-hover:border-green-300">
                <div className={`w-16 h-16 rounded-full bg-gradient-to-r ${model.color} flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform duration-300`}>
                  <model.icon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 text-center mb-4 group-hover:text-green-600 transition-colors">
                  {model.name}
                </h3>
                <p className="text-gray-600 text-center">
                  Advanced AI analysis for {model.name.toLowerCase()} conditions and health monitoring.
                </p>
                <div className="mt-6 text-center">
                  <span className="inline-flex items-center text-green-600 font-semibold group-hover:text-green-700 transition-colors">
                    Analyze Now
                    <ChevronDown className="ml-1 h-4 w-4 rotate-[-90deg] group-hover:translate-x-1 transition-transform" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderModelPage = (modelType: ModelType) => {
    const model = models.find(m => m.id === modelType);
    if (!model) return null;

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-white py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Back button */}
          <button
            onClick={() => handleViewChange('models')}
            className="flex items-center text-green-600 hover:text-green-700 mb-8 transition-colors group"
          >
            <ArrowLeft className="h-5 w-5 mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to Models
          </button>

          {/* Header */}
          <div className="text-center mb-12">
            <div className={`w-20 h-20 rounded-full bg-gradient-to-r ${model.color} flex items-center justify-center mx-auto mb-6`}>
              <model.icon className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
              {model.name} Analysis
            </h1>
            <p className="text-xl text-gray-600">
              Upload an image for AI-powered health assessment
            </p>
          </div>

          {/* Main content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Upload Section */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-lg p-8 border border-green-100">
                <h3 className="text-xl font-bold text-gray-800 mb-6">Upload Image</h3>
                
                {!imagePreview ? (
                  <div className="border-2 border-dashed border-green-300 rounded-xl p-12 text-center bg-green-50 hover:bg-green-100 transition-colors">
                    <Upload className="h-16 w-16 text-green-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">
                      Drop your image here or click to browse
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <div className="space-y-3">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                      >
                        Choose File
                      </button>
                      <div className="flex items-center justify-center">
                        <span className="text-gray-400">or</span>
                      </div>
                      <button className="flex items-center justify-center mx-auto text-green-600 hover:text-green-700 transition-colors">
                        <Camera className="h-5 w-5 mr-2" />
                        Use Camera
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Selected"
                        className="w-full h-64 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => {
                          setImagePreview(null);
                          setSelectedImage(null);
                          setPredictionResult(null);
                        }}
                        className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <button
                      onClick={handlePredict}
                      disabled={predicting}
                      className={`w-full py-4 px-6 rounded-lg font-semibold text-white transition-all ${
                        predicting 
                          ? 'bg-gray-400 cursor-not-allowed' 
                          : 'bg-green-600 hover:bg-green-700 hover:scale-105'
                      }`}
                    >
                      {predicting ? (
                        <div className="flex items-center justify-center">
                          <Loader className="h-5 w-5 mr-2 animate-spin" />
                          Analyzing...
                        </div>
                      ) : (
                        'Predict'
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Results Section */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-lg p-8 border border-green-100 h-fit">
                <h3 className="text-xl font-bold text-gray-800 mb-6">Analysis Results</h3>
                
                {!predictionResult && !predicting && (
                  <div className="text-center py-12 text-gray-500">
                    Upload an image and click predict to see results
                  </div>
                )}

                {predicting && (
                  <div className="text-center py-12">
                    <Loader className="h-12 w-12 animate-spin text-green-600 mx-auto mb-4" />
                    <p className="text-gray-600">Analyzing your image...</p>
                  </div>
                )}

                {predictionResult && (
                  <div className="space-y-6 animate-fadeIn">
                    <div className="text-center">
                      <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                      <h4 className="text-2xl font-bold text-gray-800 mb-2">
                        Analysis Complete
                      </h4>
                    </div>
                    
                    <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                      <div className="text-center mb-4">
                        <span className="text-sm font-medium text-green-700">PREDICTION</span>
                        <h5 className="text-3xl font-bold text-green-800 mt-1">
                          {predictionResult.class}
                        </h5>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700">Confidence:</span>
                          <span className="font-bold text-green-700">
                            {(predictionResult.probability * 100).toFixed(1)}%
                          </span>
                        </div>
                        
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className="bg-gradient-to-r from-green-400 to-green-600 h-3 rounded-full transition-all duration-1000"
                            style={{ width: `${predictionResult.probability * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                      <h6 className="font-bold text-blue-800 mb-2">Recommendation</h6>
                      <p className="text-blue-700 text-sm">
                        {predictionResult && diseaseRecommendations[predictionResult.class] ? 
                          diseaseRecommendations[predictionResult.class].recommendation :
                          'Please consult with a veterinarian for proper diagnosis and treatment recommendations.'
                        }
                      </p>
                    </div>

                    <div className="mt-6">
                      <button
                        onClick={() => navigateToChatbot(predictionResult.class, modelType)}
                        className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-lg font-semibold transition-all duration-300 hover:scale-105 flex items-center justify-center shadow-lg hover:shadow-xl"
                      >
                        <MessageCircle className="h-5 w-5 mr-2" />
                        Seek AI Assistance
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderFAQPage = () => (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <HelpCircle className="h-12 w-12 text-green-600 mr-4" />
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800">
              Frequently Asked Questions
            </h1>
          </div>
          <p className="text-xl text-gray-600">
            Find answers to common questions about GauDarpan
          </p>
        </div>

        <div className="space-y-4">
          {faqData.map((faq, index) => (
            <div
              key={index}
              className="bg-white rounded-lg shadow-md border border-green-100 overflow-hidden"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-green-50 transition-colors"
              >
                <h3 className="text-lg font-semibold text-gray-800 pr-4">
                  {faq.question}
                </h3>
                <ChevronRight
                  className={`h-5 w-5 text-green-600 transform transition-transform duration-300 ${
                    expandedFAQ === index ? 'rotate-90' : ''
                  }`}
                />
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  expandedFAQ === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="px-6 pb-4 pt-2 border-t border-green-100">
                  <p className="text-gray-700 leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderAboutPage = () => (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <Info className="h-12 w-12 text-green-600 mr-4" />
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800">
              About GauDarpan
            </h1>
          </div>
          <div className="w-24 h-1 bg-green-600 mx-auto mb-8"></div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12 border border-green-100">
          <div className="prose prose-lg max-w-none">
            <p className="text-xl text-gray-700 leading-relaxed mb-6 font-medium">
              <strong className="text-green-700">GauDarpan – The Mirror to Your Cow's Health</strong> is an AI-powered platform that helps farmers and cattle owners monitor and maintain the health of their cows efficiently and accurately.
            </p>
            
            <p className="text-gray-700 leading-relaxed mb-6">
              By leveraging advanced computer vision and machine learning models, GauDarpan can detect early signs of diseases in crucial areas of a cow's body, including the eyes, skin, udder, hooves, and mouth.
            </p>
            
            <p className="text-gray-700 leading-relaxed mb-6">
              Our platform empowers users to take timely actions, ensuring better livestock care, reducing economic losses, and promoting animal welfare. Farmers can easily upload images of their cows and receive instant, accurate insights about their health status.
            </p>
            
            <p className="text-gray-700 leading-relaxed">
              With a combination of Teachable Machine-trained AI models and a professional, intuitive interface, GauDarpan makes cattle healthcare accessible, reliable, and effortless for everyone—from small-scale farmers to large dairy operations.
            </p>
          </div>
          
          <div className="mt-8 pt-8 border-t border-green-100">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div className="p-4">
                <Eye className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <h3 className="font-semibold text-gray-800">AI-Powered</h3>
                <p className="text-sm text-gray-600">Advanced machine learning models</p>
              </div>
              <div className="p-4">
                <Heart className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <h3 className="font-semibold text-gray-800">Comprehensive</h3>
                <p className="text-sm text-gray-600">Multiple health assessments</p>
              </div>
              <div className="p-4">
                <Zap className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <h3 className="font-semibold text-gray-800">Instant Results</h3>
                <p className="text-sm text-gray-600">Quick and accurate analysis</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderChatbotPage = () => (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Back button */}
        <button
          onClick={() => handleViewChange('models')}
          className="flex items-center text-green-600 hover:text-green-700 mb-8 transition-colors group"
        >
          <ArrowLeft className="h-5 w-5 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to Models
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Bot className="h-12 w-12 text-green-600 mr-4" />
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800">
              AI Health Assistant
            </h1>
          </div>
          <p className="text-xl text-gray-600">
            Get expert advice and treatment suggestions for your cow's health
          </p>
        </div>

        {/* Chat Container */}
        <div className="bg-white rounded-2xl shadow-lg border border-green-100 overflow-hidden">
          {/* Chat Messages */}
          <div className="h-96 overflow-y-auto p-6 space-y-4 bg-gray-50">
            {chatMessages.length === 0 && !isAIResponding && (
              <div className="text-center text-gray-500 py-8">
                <Bot className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p>Starting AI consultation...</p>
              </div>
            )}
            
            {chatMessages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                    message.isUser
                      ? 'bg-green-600 text-white'
                      : 'bg-white text-gray-800 border border-gray-200'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                  <p className={`text-xs mt-1 ${
                    message.isUser ? 'text-green-100' : 'text-gray-500'
                  }`}>
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}

            {isAIResponding && (
              <div className="flex justify-start">
                <div className="bg-white text-gray-800 border border-gray-200 px-4 py-3 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Loader className="h-4 w-4 animate-spin text-green-600" />
                    <p className="text-sm">AI is thinking...</p>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input */}
          <div className="border-t border-gray-200 p-4 bg-white">
            <form onSubmit={handleChatSubmit} className="flex space-x-3">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about cow health, treatments, or preventive care..."
                className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                disabled={isAIResponding}
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || isAIResponding}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            <strong>Disclaimer:</strong> This AI assistant provides general guidance only. 
            Always consult with a qualified veterinarian for proper diagnosis and treatment of your animals.
          </p>
        </div>
      </div>
    </div>
  );

  const renderFooter = () => (
    <footer className="bg-green-800 text-white py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-green-100">
          Developed with <Heart className="h-4 w-4 text-red-400 inline mx-1" /> for farmers | GauDarpan
        </p>
      </div>
    </footer>
  );

  return (
    <div className="min-h-screen bg-white">
      {renderNavbar()}
      
      <div className="animate-fadeIn">
        {currentView === 'home' && (
          <>
            {renderHeroSection()}
            {renderModelsOverview()}
          </>
        )}
        
        {currentView === 'models' && renderModelsOverview()}
        
        {currentView === 'faq' && renderFAQPage()}
        
        {currentView === 'about' && renderAboutPage()}
        
        {currentView === 'chatbot' && renderChatbotPage()}
        
        {models.map(model => (
          currentView === model.id && renderModelPage(model.id)
        ))}
      </div>

      {renderFooter()}

      <style jsx>{`
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-in-out;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

export default App;