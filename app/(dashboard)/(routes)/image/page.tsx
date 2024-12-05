"use client";

import axios from "axios";
import * as z from "zod";
import { Heading } from "@/components/heading";
import { Download, ImageIcon, Wand2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Empty } from "@/components/empty";
import { Loader } from "@/components/loader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardFooter, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import Image from "next/image";
import { useProModal } from "@/hooks/use-pro-modal";
import toast from "react-hot-toast";
import { amountOptions, formSchema, resolutionOptions, modelOptions } from "./constants";

const ImagePage = () => {
  const router = useRouter();

  const proModal = useProModal();

  const [images, setImages] = useState<string[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prompt: "",
      prompt2: "",
      amount: "1",
      resolution: "1024x1024",
      model: "dall-e-2",
    },
  });

  const isLoading = form.formState.isSubmitting;

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setImages([]);

      // const response = await axios.post("/api/image", values);
      // Premier appel API pour le premier prompt
      const response1 = await axios.post("/api/image", {
        prompt: values.prompt,
        amount: values.amount,
        resolution: values.resolution,
        model: values.model
      });

      // Deuxième appel API pour le second prompt
      const response2 = await axios.post("/api/image", {
        prompt: values.prompt2,
        amount: values.amount,
        resolution: values.resolution,
        model: values.model
      });
      const urls1 = response1.data.map((image: { url: string }) => image.url);
      const urls2 = response2.data.map((image: { url: string }) => image.url);
      
      setImages([...urls1, ...urls2]);

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

  return (
    <div>
      <Heading
        title="Générateur d'Images IA"
        description="Transformez vos idées en images grâce à l'IA la plus avancée."
        icon={ImageIcon}
        iconColor="text-pink-700"
        bgColor="bg-pink-700/10"
      />
      <div className="px-4 lg:px-8">
        <Card className="w-full shadow-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Paramètres de Génération</CardTitle>
            <CardDescription>
              Configurez les paramètres pour générer vos images. Vous pouvez utiliser un ou deux prompts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <FormField
                      name="prompt"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Premier Prompt</FormLabel>
                          <FormControl>
                            <Input
                              className="bg-white"
                              disabled={isLoading}
                              placeholder="Un cheval majestueux dans les Alpes suisses"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Décrivez la première image que vous souhaitez générer
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                    <FormField
                      name="prompt2"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Second Prompt (Optionnel)</FormLabel>
                          <FormControl>
                            <Input
                              className="bg-white"
                              disabled={isLoading}
                              placeholder="Un cheval galopant dans le désert"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Décrivez la seconde image à générer
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="model"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Modèle d'IA</FormLabel>
                          <Select
                            disabled={isLoading}
                            onValueChange={field.onChange}
                            value={field.value}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue defaultValue={field.value} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {modelOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Choisissez le modèle d'IA pour la génération
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="resolution"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Résolution</FormLabel>
                          <Select
                            disabled={isLoading}
                            onValueChange={field.onChange}
                            value={field.value}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue defaultValue={field.value} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {resolutionOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Sélectionnez la résolution des images
                          </FormDescription>
                        </FormItem>
                      )}
                    />

                    <Button
                      className="w-full mt-auto"
                      type="submit"
                      disabled={isLoading}
                      size="lg"
                    >
                      {isLoading ? (
                        <Loader />
                      ) : (
                        <>
                          <Wand2 className="w-4 h-4 mr-2" />
                          Générer
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
        <div className="space-y-4 mt-8">
          {images.length === 0 && !isLoading && (
            <Empty label="Aucune image générée." />
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {images.map((src) => (
              <Card key={src} className="rounded-lg overflow-hidden">
                <CardContent className="p-0">
                  <div className="relative aspect-square">
                    <Image
                      fill
                      alt="Image générée"
                      src={src}
                      className="rounded-t-lg"
                    />
                  </div>
                </CardContent>
                <CardFooter className="p-2">
                  <Button
                    onClick={() => window.open(src)}
                    variant="secondary"
                    className="w-full"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Télécharger
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};


export default ImagePage;
