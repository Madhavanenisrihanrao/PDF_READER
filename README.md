# LLM PDF Chatbot (Local Ollama)

An intelligent chatbot that reads PDF documents and answers questions using LangChain and local Ollama models. **Completely free - no API keys needed!**

## Prerequisites

1. **Install Ollama**: Download from [ollama.ai](https://ollama.ai) and install it on your Mac

2. **Download a model**: Open terminal and run:
```bash
ollama pull llama3.2
```

3. **Start Ollama** (if not already running):
```bash
ollama serve
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Build the project (optional):
```bash
npm run build
```

## Usage

Run the chatbot:
```bash
npm start
```

Or use the development mode:
```bash
npm run dev
```

The chatbot will:
1. Ask you for the path to a PDF file
2. Load and process the PDF
3. Allow you to ask questions about the content

Type `exit` to quit the chatbot.

## Example

```
Enter the path to your PDF file: ./documents/sample.pdf
Loading PDF from: ./documents/sample.pdf
Loaded 10 pages from PDF
Split into 45 chunks
PDF loaded and indexed successfully!

You can now ask questions about the PDF!
Type "exit" to quit

You: What is the main topic of this document?
Chatbot: Thinking...
Chatbot: The main topic of this document is...
```

## Features

- **100% Free**: Uses local Ollama models - no API costs!
- **Private**: All processing happens on your computer
- PDF document loading and parsing
- Text chunking for efficient processing
- Vector storage for semantic search
- Question answering using retrieval-augmented generation (RAG)
- Interactive CLI interface

## Available Models

You can use different Ollama models by changing the model name in the code:
- `llama3.2` (default, good balance)
- `mistral` (faster)
- `llama3.1` (more powerful)
- `gemma2` (Google's model)

Download any model with: `ollama pull <model-name>`

## How It Works

1. **PDF Loading**: The chatbot loads your PDF file and extracts text from all pages
2. **Text Splitting**: The content is split into manageable chunks with overlap
3. **Embeddings**: Each chunk is converted into vector embeddings using Ollama
4. **Vector Store**: Embeddings are stored in memory for fast retrieval
5. **Q&A**: When you ask a question, relevant chunks are retrieved and sent to the local LLM for answering
