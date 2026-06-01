import Image from "next/image";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white text-center dark:bg-black">
      <main className="flex flex-col items-center gap-8 py-20 px-6">
        <Image
          src="/nd_splashpage.png"
          alt="NeedleDrop Logo"
          width={400}
          height={400}
          priority
        />

        <h1 className="text-4xl font-bold text-black dark:text-zinc-50">
          NeedleDrop
        </h1>

        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          / Log your listening
        </p>
      </main>
    </div>
  );
}
