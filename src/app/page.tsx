import { AnimatedList } from "@/components/ui/animated-list";
import { Button } from "@/components/ui/button";
import { FlickeringGrid } from "@/components/ui/flickering-grid";
import {
  Anthropic,
  Google,
  OpenAI,
} from "@/components/ui/icons/llm-provider-white";
import { MagicCard } from "@/components/ui/magic-card";
import { Separator } from "@/components/ui/separator";
import {
  AnimatedSpan,
  Terminal,
  TypingAnimation,
} from "@/components/ui/terminal";
import { Atom } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="dark bg-sidebar">
      <div className="relative min-h-dvh bg-sidebar text-white container mx-auto">
        <div className="w-full h-0.5 top-4 bg-white/10 absolute" />
        <div className="w-0.5 left-4 bg-white/10 h-full absolute" />
        <div className="w-0.5 right-4 bg-white/10 h-full absolute" />
        {/* <div className="w-full h-0.5 bottom-4 bg-white/10 absolute" /> */}
        <header className="sticky top-0 z-10 p-4">
          <MagicCard className="rounded-2xl">
            <nav className="min-h-16 flex items-center justify-between border rounded-2xl px-4 backdrop-blur-sm">
              <div className="p-2 flex items-center gap-2">
                <Atom className="text-primary" size={22} aria-hidden="true" />
                <h2>ChatIn</h2>
              </div>

              <Button asChild variant={"gradient"} className="light">
                <Link href={"/login"}>Sign me up!</Link>
              </Button>
            </nav>
          </MagicCard>
        </header>
        <main>
          <section className="p-4">
            <MagicCard className="rounded-2xl overflow-hidden">
              <div className="relative min-h-[600px] flex flex-col justify-center items-center text-center gap-2 p-4">
                <Image
                  src={"/halftone-city.jpeg"}
                  width={800}
                  height={600}
                  className="absolute w-full h-full inset-0 object-cover mix-blend-plus-lighter opacity-10 invert"
                  alt="Background"
                  draggable={false}
                />
                <Terminal className="absolute -bottom-50 hidden sm:block">
                  <TypingAnimation>Creating your account</TypingAnimation>
                  <AnimatedSpan delay={1500} className="text-green-200">
                    <span>✔ Creating your agent.</span>
                  </AnimatedSpan>
                  <AnimatedSpan delay={2500} className="text-green-200">
                    <span>✔ Training your agent.</span>
                  </AnimatedSpan>
                  <AnimatedSpan delay={3500} className="text-green-200">
                    <span>✔ Crafting your agent persona.</span>
                  </AnimatedSpan>
                  <AnimatedSpan delay={4500} className="text-green-200">
                    <span>✔ Deploying your agent to production.</span>
                  </AnimatedSpan>
                </Terminal>
                <div className="relative space-y-4">
                  <h1 className="text-5xl">Manage Agents Without Hassle</h1>
                  <p className="text-muted-foreground">
                    Manage, Trains, and Deploy Agents Easily.
                  </p>
                </div>
              </div>
            </MagicCard>
          </section>
          <section className="p-4">
            <div className="relative h-[200px] w-full overflow-hidden rounded-lg border bg-background">
              <FlickeringGrid
                className="absolute inset-0 z-0 w-full h-full"
                squareSize={4}
                gridGap={6}
                color="#6B7280"
                maxOpacity={0.5}
                flickerChance={0.1}
                height={400}
              />
              <div className="flex w-full justify-center items-center text-center flex-col gap-2 h-full relative">
                <h2 className="text-2xl">Top LLM Providers</h2>
                <p>Choose from a wide range of LLM Providers</p>
              </div>
            </div>
            <div className="w-full grid sm:grid-cols-3 gap-4 sm:divide-x-2 max-sm:divide-y-2 mt-8">
              {llmProviders.map((provider) => (
                <div
                  key={provider.id}
                  className="grid place-content-center space-y-2 p-2"
                >
                  <provider.icon className="mx-auto size-12" />
                  <p className="text-muted-foreground text-center">
                    {provider.name}
                  </p>
                </div>
              ))}
            </div>
            <Separator className="my-5" />
          </section>
          <section className="p-4">
            <div className="min-h-[400px] w-full border rounded-2xl p-4 grid sm:grid-cols-2 gap-2">
              <div className="sm:max-h-[350px] max-h-[200px] overflow-hidden">
                <AnimatedList>
                  {notifications.map((notification) => (
                    <div
                      className="bg-background p-4 border rounded-xl w-full max-w-sm mx-auto"
                      key={notification.name}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="bg-muted p-2 rounded-full"
                          style={{ backgroundColor: notification.color }}
                        >
                          {notification.icon}
                        </div>
                        <div>
                          <p className="font-bold">{notification.name}</p>
                          <p className="text-muted-foreground">
                            {notification.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </AnimatedList>
              </div>
              <div className="flex flex-col justify-center gap-4">
                <h2 className="sm:text-5xl text-2xl [&>span]:text-muted-foreground">
                  Create, <span className="font-light">Train</span>,
                  <br />
                  Deploy, <span className="font-light">Iterate</span>
                </h2>

                <p className="text-muted-foreground">
                  Building AI Agent Couldn&apos;t Be Easier
                </p>
              </div>
            </div>
          </section>

          <section className="p-8">
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-10 border border-white/10 mx-auto text-center">
              <h2 className="text-3xl font-bold text-white mb-6">
                Ready to Build Your First AI Agent?
              </h2>
              <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
                ChatIn is a platform that allows you to create, train, and
                deploy AI agents. With ChatIn, you can easily build custom AI
                agents
              </p>
              <Button
                asChild
                size="lg"
                className="bg-white text-[oklch(0.21_0.006_285.885)] hover:bg-white/90"
              >
                <Link href="/login">Get Started</Link>
              </Button>
            </div>
          </section>
        </main>
        <footer className="p-8 border-t">
          <div className="min-h-24 flex flex-wrap items-center justify-between">
            <h2>ChatIn</h2>
            <p>© 2025 OBRA. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </div>
  );
}

const llmProviders = [
  {
    id: 1,
    name: "OpenAI",
    icon: OpenAI,
  },
  {
    id: 2,
    name: "Google",
    icon: Google,
  },
  {
    id: 3,
    name: "Anthropic",
    icon: Anthropic,
  },
];

const notifications = [
  {
    name: "Sign Up",
    description: "Easily Sign Up",
    icon: "👤",
    color: "#00C9A7",
  },
  {
    name: "Create Agent",
    description: "Select a Provider",
    icon: "🤖",
    color: "#FFB800",
  },
  {
    name: "Train Agent",
    description: "Train your Agent",
    icon: "📖",
    color: "#FFC107",
  },
  {
    name: "Assign Persona",
    description: "Customize your Agent",
    icon: "💄",
    color: "#8B9467",
  },
  {
    name: "Deploy Agent",
    description: "Deploy your Agent",
    icon: "🚀",
    color: "#FF5733",
  },
  {
    name: "Iterate",
    description: "Iterate on your Agent",
    icon: "🔁",
    color: "#C70039",
  },
];
