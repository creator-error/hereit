import { ArrowRight, Check } from "lucide-react";
import { ImageWithFallback } from "./ImageWithFallback";

type HeroProps = {
  isSignedIn: boolean;
};

export function Hero({ isSignedIn }: HeroProps) {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        <ImageWithFallback
          src="https://images.unsplash.com/photo-1761818645907-8bed418b415b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjByZW50YWwlMjBvZmZpY2UlMjBzcGFjZXxlbnwxfHx8fDE3NzYzMzE0MTN8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
          alt="Modern rental office space"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0f1729]/95 via-[#0f1729]/90 to-[#0f1729]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-24 md:py-32">
        <div className="max-w-4xl">
          <h1 className="text-5xl md:text-7xl lg:text-8xl mb-8 tracking-tight">
            <span className="block text-white">置いてみる。</span>
            <span className="block text-white">確かめる。</span>
            <span className="block text-[#f59e0b]">借りられる。</span>
          </h1>

          <div className="space-y-4 mb-12">
            <p className="text-xl md:text-2xl text-gray-300 leading-relaxed">
              借りる前に、置いて確かめる。
            </p>
            <p className="text-xl md:text-2xl text-gray-300 leading-relaxed">
              空間として成立するかを、その場で判断できます。
            </p>
            <p className="text-xl md:text-2xl text-[#f59e0b] leading-relaxed">
              気に入ったものは、そのままレンタルへ。
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mb-16">
            <a
              href="#contact"
              className="group px-8 py-4 bg-[#f59e0b] text-[#0f1729] rounded-lg hover:bg-[#fbbf24] transition-all duration-300 flex items-center justify-center gap-2"
            >
              <span>導入を相談する</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </a>
            <a
              href="/demo"
              className="px-8 py-4 border-2 border-[#f59e0b] text-[#f59e0b] rounded-lg hover:bg-[#f59e0b]/10 transition-all duration-300 text-center"
            >
              空間イメージを見る
            </a>
            <a
              href="/login"
              className="px-8 py-4 border border-white/20 text-white rounded-lg hover:bg-white/8 transition-all duration-300 text-center"
            >
              {isSignedIn ? "ログイン状態を見る" : "Googleでログイン"}
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-[#f59e0b] flex-shrink-0 mt-1" />
              <span className="text-gray-300">1点から相談可能</span>
            </div>
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-[#f59e0b] flex-shrink-0 mt-1" />
              <span className="text-gray-300">事前配置で空間検証</span>
            </div>
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-[#f59e0b] flex-shrink-0 mt-1" />
              <span className="text-gray-300">そのままレンタル可能</span>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
        <div className="w-6 h-10 border-2 border-[#f59e0b]/50 rounded-full flex justify-center pt-2">
          <div className="w-1 h-2 bg-[#f59e0b] rounded-full animate-bounce" />
        </div>
      </div>
    </section>
  );
}
