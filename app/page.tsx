import GradientGenerator from "@/components/gradient-generator"

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-pink-300 via-purple-300 to-indigo-300 text-transparent bg-clip-text mb-2">
            Mesh Gradient Generator
          </h1>
          <p className="text-gray-400">Create beautiful custom mesh gradients for your designs</p>
        </header>

        <GradientGenerator />
      </div>
    </main>
  )
}
