import MenuUpload from "@/components/MenuUpload";

export default function Home() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          What should we order?
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          Upload a menu photo and get personalized dish recommendations for any occasion.
        </p>
      </div>
      <MenuUpload />
    </div>
  );
}
