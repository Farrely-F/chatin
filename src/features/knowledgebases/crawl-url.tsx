import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import SliderControl from "@/components/ui/slider-control";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const crawlSchema = z.object({
  url: z.string().url(),
  name: z.string().min(1).optional(),
  maxDepth: z.number().min(0).max(10),
});

type FormValues = z.infer<typeof crawlSchema>;

export default function CrawlURL({ agentId }: { agentId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const crawlForm = useForm<FormValues>({
    resolver: zodResolver(crawlSchema),
    defaultValues: {
      name: "",
      url: "",
      maxDepth: 0,
    },
  });

  const handleFormSubmit = (data: FormValues) => {
    startTransition(async () => {
      const res = await fetch(`/api/v1/agents/${agentId}/knowledgebases/url`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        toast.error(result.error || "Something went wrong");
        return;
      }

      toast.success(result.message);
      router.refresh();
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <Card className="shadow-lg bg-white dark:bg-zinc-900">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">
            Parse Page Data from URL
          </CardTitle>
          <CardDescription>
            Crawl a URL and extract data to the knowledgebase
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div>
            <Form {...crawlForm}>
              <form
                onSubmit={crawlForm.handleSubmit(handleFormSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={crawlForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website/Source Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={crawlForm.control}
                  name="url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL</FormLabel>
                      <FormControl>
                        <Input placeholder="URL" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={crawlForm.control}
                  name="maxDepth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Depth</FormLabel>
                      <FormControl>
                        <SliderControl
                          defaultValue={[0]}
                          value={[field.value]}
                          onChange={(val) => field.onChange(val[0])}
                          minValue={0}
                          maxValue={10}
                          step={1}
                        />
                      </FormControl>
                      <FormDescription>Maximum depth to crawl</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={isPending} className="mt-5">
                  {isPending ? "Crawling..." : "Crawl"}
                </Button>
              </form>
            </Form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
