"use client";

import axios from "axios";
import * as z from "zod";
import { Heading } from "@/components/heading";
import { Code, Download, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { ChatCompletionMessageParam, ChatCompletionContentPart } from "openai/resources/chat/completions";
// import { ChatCompletionRequestMessage } from "openai";
import { formSchema } from "./constants";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Empty } from "@/components/empty";
import { Loader } from "@/components/loader";
import { UserAvatar } from "@/components/user-avatar";
import { BotAvatar } from "@/components/bot-avatar";
import ReactMarkdown from "react-markdown";
import { useProModal } from "@/hooks/use-pro-modal";
import { ProModal } from "@/components/pro-modal";
import toast from "react-hot-toast";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Définition d'une fonction composant React appelée CodePage.
const CodePage = () => {
  // Initialise une variable router en utilisant le hook useRouter() de Next.js, qui fournit des utilitaires pour gérer la navigation dans l'application.
  const router = useRouter();

  // Initialise une variable proModal en utilisant une fonction useProModal(). Cette fonction semble être une abstraction ou un hook personnalisé pour gérer des modales professionnelles dans l'application.
  const proModal = useProModal();

  // Initialise un état local messages en utilisant le hook useState. Il s'agit d'un tableau vide ([]) de messages de type ChatCompletionRequestMessage. setMessages est la fonction pour mettre à jour cet état.
  const [messages, setMessages] = useState<ChatCompletionMessageParam[]>([]);

  // Initialise un état local form en utilisant le hook useForm avec des options spécifiques. Il utilise la bibliothèque react-hook-form. 
  // Le paramètre générique <z.infer<typeof formSchema>> infère le type du schéma de formulaire à partir de formSchema, qui doit être défini ailleurs dans le code.
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),    // Utilise le resolver de zod (Zod est une bibliothèque de validation de schémas) pour le formulaire, avec le schéma formSchema. Cela sert à valider les données du formulaire.
    defaultValues: {      // Fournit des valeurs par défaut au formulaire. Dans ce cas, il initialise la propriété prompt avec une chaîne vide.
      prompt: "",
    },
  });

  const isLoading = form.formState.isSubmitting;

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const userMessage: ChatCompletionMessageParam = {
        role: "user",
        content: values.prompt,
      };
      const newMessages = [...messages, userMessage];

      const response = await axios.post("/api/code", {
        messages: newMessages,
      });

      setMessages((current) => [...current, userMessage, response.data]);

      form.reset();
    } catch (error: any) {
      if (error?.response?.status === 403) {
        proModal.onOpen();
      } else {
        toast.error("Something went wrong.");
      }
    } finally {
      router.refresh();
    }
  };

  // Add function to clear messages
  const clearMessages = () => {
    setMessages([]);
  };

  // Improved download function with timestamp
  const downloadCode = (code: string, language: string) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const element = document.createElement("a");
    const file = new Blob([code], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `code_${timestamp}.${language || 'txt'}`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    URL.revokeObjectURL(element.href);
    toast.success("Code downloaded successfully!");
  };

  return (
    <div>
      <Heading
        title="Code Generation"
        description="Generate code using descriptive text."
        icon={Code}
        iconColor="text-green-700"
        bgColor="bg-green-700/10"
      />
      <div className="px-4 lg:px-8">
        {/* Form component */}
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
                        placeholder="Simple toggle button using react hooks."
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
        <div className="space-y-4 mt-4">
          <div className="flex justify-end space-x-2">
            <Button
              onClick={clearMessages}
              variant="destructive"
              size="sm"
              disabled={messages.length === 0}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Chat
            </Button>
          </div>
          {isLoading && <Loader />}
          {messages.length === 0 && !isLoading && (
            <Empty label="No conversation started." />
          )}

          <div className="flex flex-col-reverse gap-y-4">
            {messages.map((message) => {
              const getMessageContent = (content: ChatCompletionMessageParam['content']): string => {
                if (content === null) return '';
                if (typeof content === 'string') return content;
                if (Array.isArray(content)) {
                  return content
                    .map(part => {
                      if (typeof part === 'string') return part;
                      if ('text' in part) return part.text;
                      return '';
                    })
                    .join('');
                }
                return '';
              };

              const messageContent = getMessageContent(message.content);
              return (
                <div
                  key={messageContent}
                  className={cn(
                    "p-8 w-full flex items-start gap-x-8 rounded-lg",
                    message.role === "user"
                      ? "bg-white border border-black/10"
                      : "bg-muted"
                  )}
                >
                  {message.role === "user" ? <UserAvatar /> : <BotAvatar />}
                  <ReactMarkdown
                    components={{
                      pre: ({ children }) => <>{children}</>,
                      code: ({ node, className, children, ...props }) => {
                        const match = /language-(\w+)/.exec(className || '');
                        const language = match ? match[1] : '';
                        
                        return (
                          <div className="relative">
                            {language && (
                              <div className="absolute right-2 top-2 flex items-center space-x-2">
                                <Button
                                  onClick={() => downloadCode(String(children), language)}
                                  variant="ghost"
                                  size="sm"
                                  className="bg-white/20 hover:bg-white/30 px-2 py-1 rounded"
                                  title="Download code"
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                <div className="bg-white/20 hover:bg-white/30 px-2 py-1 rounded text-xs font-mono">
                                  {language}
                                </div>
                              </div>
                            )}
                            <SyntaxHighlighter
                              style={vscDarkPlus}
                              language={language || 'text'}
                              PreTag="div"
                              className="rounded-lg !mt-2 !mb-4"
                              showLineNumbers
                              customStyle={{
                                margin: 0,
                                borderRadius: '0.5rem',
                                padding: '1.5rem',
                                backgroundColor: 'rgb(30, 30, 30)',
                              }}
                              codeTagProps={{
                                style: {
                                  fontSize: '0.9rem',
                                  lineHeight: '1.5',
                                }
                              }}
                            >
                              {String(children).replace(/\n$/, '')}
                            </SyntaxHighlighter>
                          </div>
                        );
                      },
                    }}
                    className="text-sm overflow-hidden leading-7"
                  >
                    {messageContent}
                  </ReactMarkdown>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodePage;
