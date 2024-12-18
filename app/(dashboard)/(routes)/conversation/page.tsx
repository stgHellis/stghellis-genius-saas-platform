"use client";

import axios from "axios";
import * as z from "zod";
import { Heading } from "@/components/heading";
import { MessageSquare } from "lucide-react";
import { useForm } from "react-hook-form";
import { type ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { formSchema } from "./constants";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Empty } from "@/components/empty";
import { Loader } from "@/components/loader";
import { UserAvatar } from "@/components/user-avatar";
import { BotAvatar } from "@/components/bot-avatar";
import { useProModal } from "@/hooks/use-pro-modal";
import toast from "react-hot-toast";
import { Copy, DownloadCloud, Trash2 } from "lucide-react";
import { saveAs } from 'file-saver';
import { Upload } from "lucide-react";
import { useDropzone } from 'react-dropzone';
import ReactMarkdown from 'react-markdown';

const ConversationPage = () => {
  const proModal = useProModal();
  const router = useRouter();
  const [messages, setMessages] = useState<ChatCompletionMessageParam[]>([]);  
  const [tokenCount, setTokenCount] = useState<number>(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [fileContent, setFileContent] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [analysisStatus, setAnalysisStatus] = useState<'idle' | 'analyzing' | 'completed' | 'error'>('idle');

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  

  const clearConversation = () => {
    setMessages([]);
    setTokenCount(0);
    toast.success('Conversation cleared!');
  };

  const downloadConversation = () => {
    const conversationText = messages
      .map(msg => `${msg.role.toUpperCase()}: ${
        typeof msg.content === 'string' 
          ? msg.content 
          : Array.isArray(msg.content) 
            ? msg.content.map(item => typeof item === 'string' ? item : '').join(' ')
            : ''
      }`)
      .join('\n\n');
    
    const blob = new Blob([conversationText], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, 'conversation.txt');
    toast.success('Conversation downloaded!');
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prompt: "",
    },
  });

  const isLoading = form.formState.isSubmitting;

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) {
      toast.error("Aucun fichier sélectionné");
      return;
    }
    
    try {
      setFileName(file.name);
      setAnalysisStatus('analyzing');
      setIsAnalyzing(true);
      setFileContent("");
      
      const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];

      if (!allowedTypes.includes(file.type)) {
        throw new Error(`Type de fichier non supporté (${file.type}). Veuillez télécharger un fichier PDF ou DOCX.`);
      }

      if (file.size > 10 * 1024 * 1024) {
        throw new Error("Le fichier est trop volumineux. Taille maximale: 10MB");
      }
      
      const formData = new FormData();
      formData.append("file", file);

      console.log("Envoi du fichier pour analyse:", {
        name: file.name,
        type: file.type,
        size: file.size
      });

      // Analyse du document avec gestion d'erreur améliorée
      const documentResponse = await axios.post('/api/analyze-document', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        validateStatus: null, // Pour capturer toutes les réponses
      });

      console.log("Réponse de l'API analyze-document:", {
        status: documentResponse.status,
        statusText: documentResponse.statusText,
        data: documentResponse.data
      });

      if (documentResponse.status !== 200) {
        throw new Error(documentResponse.data || "Erreur lors de l'analyse du document");
      }

      if (!documentResponse.data?.content) {
        throw new Error("Le contenu du document n'a pas pu être extrait");
      }

      const analysisResult = documentResponse.data.content;
      setFileContent(analysisResult);
      setAnalysisStatus('completed');
      toast.success(`Le fichier "${file.name}" a été analysé avec succès !`);

      // Préparation du message pour l'API de conversation
      const userMessage: ChatCompletionMessageParam = {
        role: "user",
        content: `Analyse ce document et fournis un résumé détaillé :\n\n${analysisResult.substring(0, 1500)}${analysisResult.length > 1500 ? '...' : ''}`
      };

      const newMessages = [...messages, userMessage];
      
      console.log("Envoi à l'API de conversation");
      
      const aiResponse = await axios.post("/api/conversation", {
        messages: newMessages
      }, {
        validateStatus: null
      });

      console.log("Réponse de l'API conversation:", {
        status: aiResponse.status,
        statusText: aiResponse.statusText
      });

      if (aiResponse.status !== 200) {
        throw new Error(aiResponse.data?.error || "Erreur lors de la génération de la réponse");
      }

      setMessages(current => [...current, userMessage, aiResponse.data]);

    } catch (error: any) {
      setAnalysisStatus('error');
      console.error("Erreur détaillée:", error);
      
      if (error?.response?.status === 403) {
        proModal.onOpen();
      } else {
        const errorMessage = error.response?.data || error.message || 'Une erreur est survenue lors de l\'analyse';
        toast.error(errorMessage);
      }
    } finally {
      setIsAnalyzing(false);
      form.reset();
    }
  }, [messages, proModal, form]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxFiles: 1,
    multiple: false
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const userMessage: ChatCompletionMessageParam = {
        role: "user",
        content: values.prompt,
      };

      const newMessages = [...messages, userMessage];

      const response = await axios.post("/api/conversation", {
        messages: [...newMessages, {
          role: "system",
          content: "Format your responses using Markdown. Use # for titles, ## for subtitles, - for bullet points, and organize your text in clear paragraphs. Make sure to add line breaks between sections."
        }],
      }, {
        validateStatus: (status) => status < 500,
      });

      if (!response.data) {
        throw new Error('La réponse n\'a pas pu être générée');
      }

      setMessages((current) => [...current, userMessage, response.data]);
      setTokenCount(current => current + (response.data.tokenCount || 0));
      form.reset();
    } catch (error: any) {
      if (error?.response?.status === 403) {
        proModal.onOpen();
      } else {
        const errorMessage = error.response?.data?.error || error.message || 'Une erreur est survenue';
        toast.error(errorMessage);
        console.error('Erreur détaillée:', error);
      }
    } finally {
      router.refresh();
    }
  };

  return (
    <div>
      <Heading
        title="Conversation"
        description="Our most advanced conversation model."
        icon={MessageSquare}
        iconColor="text-violet-500"
        bgColor="bg-violet-500/10"
      />
      <div className="px-4 lg:px-8">

      {analysisStatus === 'error' && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200">
          <div className="flex items-center text-red-700">
            <span className="mr-2">⚠️</span>
            Une erreur s'est produite lors de l'analyse du fichier. Veuillez réessayer.
          </div>
        </div>
      )}

      {analysisStatus === 'completed' && fileContent && (
        <div className="mb-6 p-4 rounded-lg border border-violet-200 bg-violet-50">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold text-violet-700">
              <Upload className="h-4 w-4 inline-block mr-2" />
              Fichier analysé : {fileName}
            </h3>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(fileContent)}
                className="text-violet-600 hover:text-violet-800"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
                  saveAs(blob, `${fileName}_analysis.txt`);
                }}
                className="text-violet-600 hover:text-violet-800"
              >
                <DownloadCloud className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="bg-white p-3 rounded-md">
            <p className="text-sm text-gray-600 max-h-40 overflow-y-auto whitespace-pre-wrap">
              {fileContent}
            </p>
          </div>
        </div>
      )}

        {analysisStatus === 'analyzing' && (
          <div className="mb-6 p-4 rounded-lg bg-violet-50 border border-violet-200">
            <div className="flex items-center justify-center">
              <Loader />
              <span className="ml-2 text-violet-700">Analyzing {fileName}...</span>
            </div>
          </div>
        )}

      <div className="mb-4">
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors",
              isDragActive ? "border-violet-500 bg-violet-50" : "border-gray-300",
              isAnalyzing && "opacity-50 cursor-not-allowed"
            )}
          >
            <input {...getInputProps()} disabled={isAnalyzing} />
            <Upload className="h-10 w-10 mx-auto mb-2 text-violet-500" />
            <p className="text-sm text-gray-600">
              {isDragActive
                ? "Drop the file here"
                : isAnalyzing
                ? "Analyzing file..."
                : "Drag & drop a PDF or DOCX file here, or click to select"}
            </p>
          </div>
        </div>

        <div>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="rounded-lg border w-full p-4 px-3 md:px-6 focus-within:shadow-sm grid grid-cols-12 gap-2"
            >
              <FormField
                name="prompt"
                render={({ field }) => (
                  <FormItem className="col-span-12 lg:col-span-10">
                    <FormControl className="m-0 p-0">
                      <Input
                        className="border-0 outline-none focus-visible:ring-0 focus-visible:ring-transparent"
                        disabled={isLoading}
                        placeholder="How do I calculate the radius of a circle?"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <Button
                className="col-span-12 lg:col-span-2 w-full"
                type="submit"
                disabled={isLoading}
                size="icon"
              >
                Generate
              </Button>
            </form>
          </Form>
        </div>

        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-muted-foreground">
            Tokens used: {tokenCount}
          </p>
          <div className="space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={clearConversation}
              disabled={messages.length === 0}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadConversation}
              disabled={messages.length === 0}
            >
              <DownloadCloud className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </div>

        <div className="space-y-4 mt-4">
          {isLoading && (
            <div className="p-8 rounded-lg w-full flex items-center justify-center bg-muted">
              <Loader />
            </div>
          )}
          {messages.length === 0 && !isLoading && (
            <Empty label="No conversation started." />
          )}
          <div className="flex flex-col-reverse gap-y-4">
            {messages.map((message) => {
              const messageContent = typeof message.content === 'string' 
                ? message.content 
                : Array.isArray(message.content) 
                  ? message.content.map(item => typeof item === 'string' ? item : '').join(' ')
                  : '';

              return (
                <div
                  key={messageContent}
                  className={cn(
                    "p-8 w-full flex items-start gap-x-8 rounded-lg relative",
                    message.role === "user"
                      ? "bg-white border border-black/10"
                      : "bg-muted"
                  )}
                >
                  {message.role === "user" ? <UserAvatar /> : <BotAvatar />}
                  {/* <p className="text-sm">{messageContent}</p> */}
                  
                  <div className="text-sm prose prose-sm max-w-none">
                    {message.role === "user" ? (
                      <p>{messageContent}</p>
                    ) : (
                      <ReactMarkdown>
                        {messageContent}
                      </ReactMarkdown>
                    )}
                  </div>
                  
                  <button
                  onClick={() => copyToClipboard(messageContent)}
                  className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConversationPage;
